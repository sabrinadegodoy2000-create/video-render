/**
 * Script de renderização server-side.
 * Chamado pelo backend Python com:
 *   node render.mjs --props plan.json --output output.mp4
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse args
const args = process.argv.slice(2);
const propsIdx = args.indexOf("--props");
const outputIdx = args.indexOf("--output");
const concurrencyIdx = args.indexOf("--concurrency");
const compositionIdx = args.indexOf("--composition");
const scaleIdx = args.indexOf("--scale");

if (propsIdx === -1 || outputIdx === -1) {
  console.error("Uso: node render.mjs --props <plan.json> --output <output.mp4> [--composition DynamicVideo] [--concurrency 2] [--scale 1]");
  process.exit(1);
}

const propsFile = args[propsIdx + 1];
const outputFile = args[outputIdx + 1];
const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1]) : 2;
const compositionId = compositionIdx !== -1 ? args[compositionIdx + 1] : "DynamicVideo";
// multiplicador de densidade de pixel do Remotion (2 = renderiza em 4K real, mesmo layout em CSS)
const scale = scaleIdx !== -1 ? parseFloat(args[scaleIdx + 1]) : 1;

// ── Servidor de mídia local ─────────────────────────────────────────
// Serve arquivos locais via HTTP para que o Chrome possa carregá-los
// (Chrome headless não permite file:// por segurança)

const MIME_TYPES = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

function startMediaServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // URL: /media?path=/absolute/path/to/file.jpg
      const url = new URL(req.url, 'http://localhost');
      const filePath = decodeURIComponent(url.searchParams.get('path') || '');

      if (!filePath || !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const stat = fs.statSync(filePath);

      // Suporte a range requests (necessário para vídeo/áudio)
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        });
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': stat.size,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });

    // Porta 0 = OS escolhe porta livre
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`[REMOTION] Media server rodando em http://127.0.0.1:${port}`);
      resolve({ server, port });
    });
  });
}

/**
 * Converte file:///path/to/file → http://127.0.0.1:PORT/media?path=/path/to/file
 * Processa recursivamente todas as strings no objeto JSON do plano.
 */
function convertFileUrls(obj, mediaBaseUrl) {
  if (typeof obj === 'string') {
    // aceita file:///opt/x (Linux, 3 barras) E file://C:/x (Windows local, 2 barras)
    if (obj.startsWith('file://')) {
      let filePath = obj.slice('file://'.length); // remove só "file://"
      // Linux: file:///opt → "/opt" (mantém a barra). Windows: file://C:/x → "C:/x".
      if (!filePath.startsWith('/') && !filePath.match(/^[A-Za-z]:/)) {
        filePath = '/' + filePath;
      }
      // Decodifica %20 etc.
      filePath = decodeURIComponent(filePath);
      return `${mediaBaseUrl}/media?path=${encodeURIComponent(filePath)}`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => convertFileUrls(item, mediaBaseUrl));
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertFileUrls(obj[key], mediaBaseUrl);
    }
    return result;
  }
  return obj;
}

async function main() {
  console.log(`[REMOTION] Lendo props de ${propsFile}...`);
  let inputProps = JSON.parse(fs.readFileSync(propsFile, "utf-8"));

  // Inicia media server e converte file:// URLs
  const { server, port } = await startMediaServer();
  const mediaBaseUrl = `http://127.0.0.1:${port}`;
  inputProps = convertFileUrls(inputProps, mediaBaseUrl);

  console.log("[REMOTION] Empacotando bundle...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, "src/index.ts"),
    webpackOverride: (config) => config,
  });

  console.log(`[REMOTION] Selecionando composição "${compositionId}"...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  console.log(`[REMOTION] Renderizando ${composition.durationInFrames} frames (${composition.fps}fps, scale=${scale})...`);
  const startTime = Date.now();

  const browserExecutable = process.env.REMOTION_CHROME_EXECUTABLE_PATH || undefined;

  if (browserExecutable) {
    console.log(`[REMOTION] Usando browser custom: ${browserExecutable}`);
  }

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputFile,
    inputProps,
    concurrency,
    scale,
    timeoutInMilliseconds: 90000,
    chromiumOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    ...(browserExecutable ? { browserExecutable } : {}),
    onProgress: ({ progress }) => {
      const pct = (progress * 100).toFixed(1);
      process.stdout.write(`\r[REMOTION] Progresso: ${pct}%`);
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[REMOTION] Renderizado em ${elapsed}s → ${outputFile}`);

  // Encerra o media server
  server.close();
}

main().catch((err) => {
  console.error("[REMOTION] Erro:", err);
  process.exit(1);
});
