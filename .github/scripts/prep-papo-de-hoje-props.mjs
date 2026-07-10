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
import { montarPools, distribuirMidias } from "./media-distribute.mjs";

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

  // Vídeos longos → fatiados em trechos de 3s; fotos → pontuação espalhada uniformemente;
  // vídeo preenche o resto, sem repetir (só repete se a mídia acaba antes do áudio).
  const entradas = wideInput.map((filename) => {
    const absPath = resolveMedia(filename, filename);
    return { absPath, isVideo: VIDEO_EXTS.has(path.extname(absPath).toLowerCase()) };
  });
  const pools = montarPools(entradas, SECONDS_PER_ITEM, mediaDuration);
  const dist = distribuirMidias(pools, totalDuration, SECONDS_PER_ITEM, toFileUrl);
  dist.bigSegments.forEach((s) => bigSegments.push(s));
  console.log(`[PREP] ${pools.length} mídia(s) → ${bigSegments.length} segmento(s) cobrindo ${totalDuration}s${dist.repetiu ? " (repetiu: mídia curta p/ o áudio)" : " (sem repetição)"}`);
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
