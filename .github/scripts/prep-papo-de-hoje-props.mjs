/**
 * Prepara o props.json para a composição PapoDeHojeBroadcast.
 *
 * MODO NARRAÇÃO (padrão):
 *   - Duração = áudio narration.m4a (áudios já concatenados no workflow).
 *   - Quadro grande = mídias de fundo em loop pra preencher a narração.
 *
 * MODO VÍDEO GRANDE (MODE=bigvideo):
 *   - Vídeo único no quadro grande (com áudio). Duração = a dele.
 *
 * Uso: node prep-papo-de-hoje-props.mjs <render-job.json> <pasta-midias> <props.json>
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const [, , jobFile, mediaDir, outFile] = process.argv;
if (!jobFile || !mediaDir || !outFile) {
  console.error("Uso: node prep-papo-de-hoje-props.mjs <render-job.json> <pasta-midias> <props.json>");
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFile, "utf-8"));
const SECONDS_PER_ITEM = Number(job.secondsPerItem) > 0 ? Number(job.secondsPerItem) : 3;

const MODE = (String(process.env.MODE || "").toLowerCase()) || "narracao";
const bigVideoMode = MODE === "bigvideo";

function resolveMedia(filename, label) {
  if (!filename) throw new Error(`Campo "${label}" vazio`);
  const p = path.resolve(mediaDir, filename);
  if (!fs.existsSync(p)) {
    const disp = fs.readdirSync(mediaDir).join(", ");
    throw new Error(`Arquivo "${filename}" (${label}) não encontrado.\nDisponíveis: ${disp || "(nenhum)"}`);
  }
  return p;
}

const toFileUrl = (absPath) => "file://" + absPath.split(path.sep).join("/");

function mediaDuration(absPath) {
  try {
    const out = execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", absPath,
    ]).toString().trim();
    const d = parseFloat(out);
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

let totalDuration, audioPath = null, bigVideoPath = null;
const bigSegments = [];

if (bigVideoMode) {
  // vídeo único no quadro grande (com áudio); duração = a dele
  const bigFile = process.env.MAIN_VIDEO || job.mainVideo;
  bigVideoPath = resolveMedia(bigFile, "vídeo grande");
  totalDuration = Math.ceil(mediaDuration(bigVideoPath));
  if (!totalDuration) throw new Error("Não consegui medir a duração do vídeo grande (mainVideo).");
  bigSegments.push({ src: toFileUrl(bigVideoPath), type: "video", durationSec: totalDuration });
  console.log(`[PREP] Modo VÍDEO GRANDE — ${path.basename(bigVideoPath)} — ${totalDuration}s`);
} else {
  // duração = narração
  audioPath = resolveMedia("narration.m4a", "narração");
  totalDuration = Math.ceil(mediaDuration(audioPath));
  if (!totalDuration) throw new Error("Não consegui medir a duração da narração (narration.m4a).");
  console.log(`[PREP] Modo NARRAÇÃO — duração ${totalDuration}s`);

  // quadro grande (fundo) — auto-detecta imagens/vídeos, loop pra preencher a narração toda
  const reserved = new Set(["narration.m4a"]);
  const wideInput = fs.readdirSync(mediaDir).filter((f) => {
    if (reserved.has(f) || f.startsWith("audio-")) return false;
    const ext = path.extname(f).toLowerCase();
    return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext);
  }).sort();
  if (wideInput.length === 0) throw new Error("Nenhuma mídia de fundo encontrada (suba imagens/vídeos).");
  console.log(`[PREP] Fundo auto-detectado: ${wideInput.length} mídia(s)`);

  // Cada mídia vira uma "fila de trechos de SECONDS_PER_ITEM":
  //  - vídeo longo → vários trechos (0s, 3s, 6s...) tocados a partir de cada ponto (startSec)
  //  - foto        → um único trecho
  // Distribui em rodízio, gastando trechos DIFERENTES (sem repetir). Só repete quando
  // todos os trechos acabam e o áudio ainda não terminou (mídia pouca p/ narração longa).
  const pools = wideInput.map((filename) => {
    const absPath = resolveMedia(filename, filename);
    const ext = path.extname(absPath).toLowerCase();
    const isVideo = VIDEO_EXTS.has(ext);
    let slices = [0];
    if (isVideo) {
      const dur = mediaDuration(absPath);
      const n = Math.max(1, Math.floor(dur / SECONDS_PER_ITEM));
      slices = Array.from({ length: n }, (_, i) => +(i * SECONDS_PER_ITEM).toFixed(2));
    }
    return { absPath, type: isVideo ? "video" : "photo", isVideo, slices, cursor: 0 };
  });
  const totalTrechos = pools.reduce((a, p) => a + p.slices.length, 0);

  let current = 0, repeticoes = 0;
  while (current < totalDuration) {
    let usouAlgum = false;
    for (const p of pools) {
      if (current >= totalDuration) break;
      if (p.cursor >= p.slices.length) continue;   // essa mídia já gastou todos os trechos
      const startSec = p.slices[p.cursor]; p.cursor += 1;
      const remaining = totalDuration - current;
      const seg = { src: toFileUrl(p.absPath), type: p.type, durationSec: +Math.min(SECONDS_PER_ITEM, remaining).toFixed(2) };
      if (p.isVideo && startSec > 0) seg.startSec = startSec;
      bigSegments.push(seg);
      current += SECONDS_PER_ITEM;
      usouAlgum = true;
    }
    if (!usouAlgum) {
      // acabaram os trechos únicos e ainda falta áudio → recomeça (repete)
      pools.forEach((p) => { p.cursor = 0; });
      repeticoes += 1;
      if (repeticoes > 5000) break;   // trava de segurança
    }
  }
  console.log(`[PREP] ${pools.length} mídia(s) → ${totalTrechos} trecho(s) de ${SECONDS_PER_ITEM}s → ${bigSegments.length} segmento(s) cobrindo ${totalDuration}s${repeticoes ? ` (repetiu ${repeticoes}x: mídia curta p/ o áudio)` : " (sem repetição)"}`);
}

const showSubscribe = !["0", "false", "no", "off", "nao", "não"].includes(String(process.env.SUBSCRIBE ?? "true").toLowerCase());

const props = {
  bigSegments,
  durationSec: totalDuration,
  headline: process.env.HEADLINE || "",
  subheadline: process.env.SUBHEADLINE || "",
  showSubscribe,
  subscribeCycleSec: 30,
};

if (bigVideoMode) {
  props.bigAudio = true;
} else {
  props.audioSrc = toFileUrl(audioPath);
}

fs.writeFileSync(outFile, JSON.stringify(props, null, 2));
console.log(`[PREP] props.json escrito (mode=${MODE})`);
