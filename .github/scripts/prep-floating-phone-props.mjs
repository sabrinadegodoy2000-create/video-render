/**
 * Prepara o props.json para a composição FloatingPhone a partir de um render-job.json
 * e da pasta de mídias baixadas do Release.
 *
 * Replica a lógica que no app roda no backend Python:
 *  - mede a duração do vídeo 9:16 (portrait) via ffprobe
 *  - repete (loop) as mídias do 16:9 até preencher a duração total
 *  - para vídeos, avança o trecho a cada repetição (startSec) e volta ao início ao chegar no fim
 *
 * Uso:
 *   node prep-floating-phone-props.mjs <render-job.json> <pasta-de-midias> <saida-props.json>
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const [, , jobFile, mediaDir, outFile] = process.argv;

if (!jobFile || !mediaDir || !outFile) {
  console.error("Uso: node prep-floating-phone-props.mjs <render-job.json> <pasta-midias> <props.json>");
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFile, "utf-8"));

const SECONDS_PER_ITEM = Number(job.secondsPerItem) > 0 ? Number(job.secondsPerItem) : 3;

// Resolve um arquivo dentro da pasta de mídias (erro claro se faltar)
function resolveMedia(filename, label) {
  if (!filename) throw new Error(`render-job.json: campo "${label}" está vazio`);
  const p = path.resolve(mediaDir, filename);
  if (!fs.existsSync(p)) {
    const disponiveis = fs.readdirSync(mediaDir).join(", ");
    throw new Error(
      `Arquivo "${filename}" (${label}) não encontrado na pasta de mídias.\n` +
      `Arquivos disponíveis: ${disponiveis || "(nenhum)"}`
    );
  }
  return p;
}

// file:// URL absoluta (render.mjs converte para o media server interno)
function toFileUrl(absPath) {
  // No Linux o caminho já começa com "/"
  return "file://" + absPath.split(path.sep).join("/");
}

// Duração do vídeo em segundos via ffprobe
function videoDuration(absPath) {
  try {
    const out = execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      absPath,
    ]).toString().trim();
    const d = parseFloat(out);
    return Number.isFinite(d) ? d : 0;
  } catch (e) {
    console.warn(`Aviso: não consegui medir a duração de ${path.basename(absPath)}: ${e.message}`);
    return 0;
  }
}

// ── Portrait (9:16) ──────────────────────────────────────────────
const portraitPath = resolveMedia(job.portrait, "portrait");
const logoPath = resolveMedia(job.logo, "logo");

const totalDuration = Math.ceil(videoDuration(portraitPath));
if (!totalDuration) {
  throw new Error("Não consegui medir a duração do vídeo 9:16 (portrait). O arquivo está corrompido?");
}
console.log(`[PREP] Vídeo 9:16: ${path.basename(portraitPath)} — ${totalDuration}s`);

// ── Mídias do 16:9 ───────────────────────────────────────────────
const wideInput = Array.isArray(job.wide) ? job.wide : [];
if (wideInput.length === 0) {
  throw new Error('render-job.json: a lista "wide" (mídias do 16:9) está vazia.');
}

// Resolve cada entrada e mede duração dos vídeos
const base = wideInput.map((entry, i) => {
  const filename = typeof entry === "string" ? entry : entry.file;
  const absPath = resolveMedia(filename, `wide[${i}]`);
  const ext = path.extname(absPath).toLowerCase();
  const isVideo =
    (typeof entry === "object" && entry.type === "video") ||
    [".mp4", ".mov", ".mkv", ".webm", ".avi"].includes(ext);
  return {
    absPath,
    type: isVideo ? "video" : "photo",
    vdur: isVideo ? videoDuration(absPath) : 0,
  };
});

// ── Loop para preencher a duração total ──────────────────────────
const looped = [];
let current = 0;
let idx = 0;
const cursors = {}; // absPath -> segundos já consumidos do vídeo

while (current < totalDuration) {
  const seg = base[idx % base.length];
  const remaining = totalDuration - current;
  const clipDur = Math.min(SECONDS_PER_ITEM, remaining);

  const out = {
    src: toFileUrl(seg.absPath),
    type: seg.type,
    durationSec: clipDur,
  };

  if (seg.type === "video") {
    let start = cursors[seg.absPath] || 0;
    // Se não couber o trecho até o fim do vídeo, recomeça do início
    if (seg.vdur > 0 && start + clipDur > seg.vdur) start = 0;
    out.startSec = Math.round(start * 1000) / 1000;
    cursors[seg.absPath] = start + clipDur;
  }

  looped.push(out);
  current += SECONDS_PER_ITEM;
  idx += 1;
}

console.log(`[PREP] ${base.length} mídia(s) única(s) → ${looped.length} segmento(s) para cobrir ${totalDuration}s`);

const props = {
  portraitVideoSrc: toFileUrl(portraitPath),
  logoSrc: toFileUrl(logoPath),
  wideSegments: looped,
  durationSec: totalDuration,
};

fs.writeFileSync(outFile, JSON.stringify(props, null, 2));
console.log(`[PREP] props.json escrito em ${outFile}`);
