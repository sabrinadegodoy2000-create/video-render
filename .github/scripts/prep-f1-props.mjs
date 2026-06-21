/**
 * Prepara o props.json para a composição F1Broadcast.
 *
 * MODO NORMAL (padrão):
 *   - PiP = vídeo principal (você). Duração total = a dele.
 *   - Grade grande = demais mídias (auto-detectadas), em loop pra preencher.
 *
 * MODO NARRAÇÃO (FULLSCREEN=true):
 *   - Sem PiP nem classificação. Só a grade grande em TELA CHEIA.
 *   - Duração = áudio narration.m4a (áudios já concatenados no workflow).
 *   - Grade grande = mídias de fundo em loop pra preencher a narração.
 *
 * Uso: node prep-f1-props.mjs <render-job.json> <pasta-midias> <props.json>
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const [, , jobFile, mediaDir, outFile] = process.argv;
if (!jobFile || !mediaDir || !outFile) {
  console.error("Uso: node prep-f1-props.mjs <render-job.json> <pasta-midias> <props.json>");
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFile, "utf-8"));
const SECONDS_PER_ITEM = Number(job.secondsPerItem) > 0 ? Number(job.secondsPerItem) : 3;
const fullscreen = ["1", "true", "yes", "on", "sim"].includes(String(process.env.FULLSCREEN || "").toLowerCase());

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

// ── Fonte da duração ─────────────────────────────────────────────
let totalDuration, pipPath = null, audioPath = null, pipFile = "";
if (fullscreen) {
  audioPath = resolveMedia("narration.m4a", "narração");
  totalDuration = Math.ceil(mediaDuration(audioPath));
  if (!totalDuration) throw new Error("Não consegui medir a duração da narração (narration.m4a).");
  console.log(`[PREP] Modo NARRAÇÃO — duração ${totalDuration}s`);
} else {
  pipFile = process.env.MAIN_VIDEO || job.mainVideo || job.portrait;
  pipPath = resolveMedia(pipFile, "mainVideo");
  totalDuration = Math.ceil(mediaDuration(pipPath));
  if (!totalDuration) throw new Error("Não consegui medir a duração do vídeo PiP (mainVideo).");
  console.log(`[PREP] Modo NORMAL — PiP ${path.basename(pipPath)} — ${totalDuration}s`);
}

// ── Grade grande (fundo) — auto-detecta imagens/vídeos ───────────
let wideInput = Array.isArray(job.wide) ? job.wide : null;
if (!wideInput) {
  const reserved = new Set(["floating-phone-output.mp4", "narration.m4a"]);
  if (pipFile) reserved.add(path.basename(pipFile));
  wideInput = fs.readdirSync(mediaDir).filter((f) => {
    if (reserved.has(f)) return false;
    const ext = path.extname(f).toLowerCase();
    return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext);
  }).sort();
  if (wideInput.length === 0) throw new Error("Nenhuma mídia de fundo encontrada (suba imagens/vídeos).");
  console.log(`[PREP] Fundo auto-detectado: ${wideInput.length} mídia(s)`);
}

const base = wideInput.map((entry, i) => {
  const filename = typeof entry === "string" ? entry : entry.file;
  const absPath = resolveMedia(filename, `wide[${i}]`);
  const ext = path.extname(absPath).toLowerCase();
  const isVideo = (typeof entry === "object" && entry.type === "video") || VIDEO_EXTS.has(ext);
  return { absPath, type: isVideo ? "video" : "photo" };
});

// ── Loop pra preencher a duração toda ────────────────────────────
const bigSegments = [];
let current = 0, idx = 0;
while (current < totalDuration) {
  const seg = base[idx % base.length];
  const remaining = totalDuration - current;
  bigSegments.push({ src: toFileUrl(seg.absPath), type: seg.type, durationSec: Math.min(SECONDS_PER_ITEM, remaining) });
  current += SECONDS_PER_ITEM;
  idx += 1;
}
console.log(`[PREP] ${base.length} mídia(s) de fundo → ${bigSegments.length} segmento(s) cobrindo ${totalDuration}s`);

const showEndExpand = ["1", "true", "yes", "on", "sim"].includes(String(process.env.END_EXPAND || "").toLowerCase());

const props = {
  bigSegments,
  durationSec: totalDuration,
  headline: process.env.HEADLINE || "",
  subheadline: process.env.SUBHEADLINE || "",
};

if (fullscreen) {
  props.fullscreenMode = true;
  props.audioSrc = toFileUrl(audioPath);
} else {
  props.pipVideoSrc = toFileUrl(pipPath);
  props.showEndExpand = showEndExpand;
}

fs.writeFileSync(outFile, JSON.stringify(props, null, 2));
console.log(`[PREP] props.json escrito (fullscreen=${fullscreen})`);
