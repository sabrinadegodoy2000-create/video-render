/**
 * Prepara o props.json para a composição FutbolOcultoBroadcast.
 *
 * MODO NARRAÇÃO (padrão):
 *   - Duração = áudio narration.m4a (áudios já concatenados no workflow).
 *   - Vídeo/fotos full-bleed = mídias de fundo em loop pra preencher a narração.
 *
 * MODO VÍDEO GRANDE (MODE=bigvideo):
 *   - Vídeo único em tela cheia (com áudio). Duração = a dele.
 *
 * Uso: node prep-futbol-oculto-props.mjs <render-job.json> <pasta-midias> <props.json>
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { montarPools, distribuirMidias, distribuirBlocos, agendarPunchOverlay } from "./media-distribute.mjs";

const [, , jobFile, mediaDir, outFile] = process.argv;
if (!jobFile || !mediaDir || !outFile) {
  console.error("Uso: node prep-futbol-oculto-props.mjs <render-job.json> <pasta-midias> <props.json>");
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
let PHOTO_OVERLAYS = null; // fotos punch-in (modo vídeo de fundo contínuo)
const bigSegments = [];

if (bigVideoMode) {
  // vídeo único em tela cheia (com áudio); duração = a dele
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

  // vídeo/fotos full-bleed (fundo) — auto-detecta imagens/vídeos, loop pra preencher a narração toda
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

  // ── Distribuição POR BLOCO (opcional) ─────────────────────────────
  // Se veio blocks.json (o painel manda quando o usuário liga "mídia por bloco"),
  // cada bloco cobre só a janela do seu áudio. Sem blocks.json → distribuição global.
  const usedBlocks = distribuirPorBlocoSeHouver(mediaDir, entradas, totalDuration, bigSegments);
  if (!usedBlocks) {
    const pools = montarPools(entradas, SECONDS_PER_ITEM, mediaDuration);
    const dist = distribuirMidias(pools, totalDuration, SECONDS_PER_ITEM, toFileUrl);
    dist.bigSegments.forEach((s) => bigSegments.push(s));
    console.log(`[PREP] ${pools.length} mídia(s) → ${bigSegments.length} segmento(s) cobrindo ${totalDuration}s${dist.repetiu ? " (repetiu: mídia curta p/ o áudio)" : " (sem repetição)"}`);
  }
}

// Lê blocks.json + mede cada audio-NNN e distribui a mídia por bloco.
// `todasEntradas` é o fallback quando um bloco não tem mídia atribuída.
// Devolve true se distribuiu por bloco; false pra cair na distribuição global.
function distribuirPorBlocoSeHouver(mediaDir, todasEntradas, totalDuration, outSegments) {
  const blocksFile = path.join(mediaDir, "blocks.json");
  if (!fs.existsSync(blocksFile)) return false;
  try {
    const bj = JSON.parse(fs.readFileSync(blocksFile, "utf-8"));
    const blocksMedia = Array.isArray(bj.blocks) ? bj.blocks : [];
    const sharedVideos = Array.isArray(bj.sharedVideos) ? bj.sharedVideos : [];
    const audios = fs.readdirSync(mediaDir)
      .filter((f) => /^audio-\d+\.(mp3|m4a|wav|aac)$/i.test(f))
      .sort();
    if ((!blocksMedia.length && !sharedVideos.length) || !audios.length) return false;

    const durs = audios.map((af) => mediaDuration(path.resolve(mediaDir, af)));
    const somaDurs = durs.reduce((a, d) => a + d, 0) || 1;
    // fecha o arredondamento: joga a sobra (totalDuration - soma) no último bloco
    const sobra = totalDuration - somaDurs;
    const durBloco = (i) => durs[i] + (i === audios.length - 1 ? sobra : 0);
    const entradasDoBloco = (i) =>
      (Array.isArray(blocksMedia[i]) ? blocksMedia[i] : []).map((f) => {
        const absPath = resolveMedia(f, `bloco ${i + 1}`);
        return { absPath, isVideo: VIDEO_EXTS.has(path.extname(absPath).toLowerCase()) };
      });

    if (sharedVideos.length) {
      // BASE: vídeo compartilhado contínuo cobrindo tudo (só vídeo, sem fotos)
      const videoEntradas = sharedVideos.map((f) => ({ absPath: resolveMedia(f, "vídeo compartilhado"), isVideo: true }));
      const videoPools = montarPools(videoEntradas, SECONDS_PER_ITEM, mediaDuration);
      const base = distribuirMidias(videoPools, totalDuration, SECONDS_PER_ITEM, toFileUrl);
      base.bigSegments.forEach((s) => outSegments.push(s));
      // FOTOS: punch-in em tela cheia por cima, dentro da janela de cada bloco
      let acc = 0;
      const blocos = audios.map((_, i) => {
        const startSec = acc; const durationSec = durBloco(i); acc += durationSec;
        // fotos E vídeos soltos do bloco intercalam por cima do vídeo de fundo
        return { startSec, durationSec, itens: entradasDoBloco(i) };
      });
      PHOTO_OVERLAYS = agendarPunchOverlay(blocos, toFileUrl);
      const nFotos = PHOTO_OVERLAYS.filter((o) => o.type !== "video").length;
      const nVideos = PHOTO_OVERLAYS.filter((o) => o.type === "video").length;
      console.log(`[PREP] Vídeo de fundo CONTÍNUO + ${nFotos} foto(s) + ${nVideos} vídeo(s) punch-in (${audios.length} bloco(s), ${sharedVideos.length} vídeo(s) de fundo)`);
    } else {
      // cada bloco se vira com a própria mídia (vazio → usa todas)
      const blocos = audios.map((_, i) => {
        let entradas = entradasDoBloco(i);
        if (!entradas.length) entradas = todasEntradas;
        return { durationSec: durBloco(i), entradas };
      });
      const dist = distribuirBlocos(blocos, SECONDS_PER_ITEM, toFileUrl, mediaDuration);
      dist.bigSegments.forEach((s) => outSegments.push(s));
      console.log(`[PREP] Distribuição POR BLOCO: ${audios.length} bloco(s) → ${dist.bigSegments.length} segmento(s) cobrindo ${totalDuration}s${dist.repetiu ? " (algum bloco repetiu mídia)" : ""}`);
    }
    return true;
  } catch (e) {
    console.warn("[PREP] blocks.json inválido — caindo na distribuição global:", e.message);
    return false;
  }
}

const showSubscribe = !["0", "false", "no", "off", "nao", "não"].includes(String(process.env.SUBSCRIBE ?? "true").toLowerCase());

function parseHeadlines(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((h) => ({ headline: String(h.headline || "").trim(), subheadline: String(h.subheadline || "").trim() }))
      .filter((h) => h.headline || h.subheadline);
  } catch {
    return [];
  }
}

// Manchetes: HEADLINES_JSON (lista [{headline,subheadline}]) → rotação a cada 60s.
// Se não vier, cai no par único HEADLINE/SUBHEADLINE (manchete fixa).
const headlines = parseHeadlines(process.env.HEADLINES_JSON);

const props = {
  bigSegments,
  durationSec: totalDuration,
  headline: headlines.length ? headlines[0].headline : (process.env.HEADLINE || ""),
  subheadline: headlines.length ? (headlines[0].subheadline || "") : (process.env.SUBHEADLINE || ""),
  showSubscribe,
  subscribeCycleSec: 30,
};
if (headlines.length > 1) props.headlines = headlines;
if (PHOTO_OVERLAYS && PHOTO_OVERLAYS.length) props.photoOverlays = PHOTO_OVERLAYS;

if (bigVideoMode) {
  props.bigAudio = true;
} else {
  props.audioSrc = toFileUrl(audioPath);
}

fs.writeFileSync(outFile, JSON.stringify(props, null, 2));
console.log(`[PREP] props.json escrito (mode=${MODE})`);
