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

// ── Vídeo principal + logo (opcional) + avatar do canal (opcional) ──
// Se veio via inputs (ferramenta), os valores do env mandam — e VAZIO = "nenhum"
// (não cai de volta no render-job.json). Sem inputs (run manual), usa o render-job.json.
const usingInputs = !!process.env.MAIN_VIDEO;
const mainVideoFile = process.env.MAIN_VIDEO || job.mainVideo || job.portrait;
const logoFile = usingInputs ? (process.env.LOGO || "") : (job.logo || "");          // opcional
const avatarFile = usingInputs ? (process.env.AVATAR || "") : (job.avatar || "");    // opcional

const mainPath = resolveMedia(mainVideoFile, "mainVideo");
const logoPath = logoFile ? resolveMedia(logoFile, "logo") : "";
const avatarPath = avatarFile ? resolveMedia(avatarFile, "avatar") : "";

// Textos do popup de inscrição (configuráveis por canal)
const channelName = process.env.CHANNEL_NAME || "Mondo Ferrari F1";
const channelHandle = process.env.CHANNEL_HANDLE || "@MondoFerrariF1";
const subscribeText = process.env.SUBSCRIBE_TEXT || "Iscriviti";
const subscribedText = process.env.SUBSCRIBED_TEXT || "Iscritto";

const totalDuration = Math.ceil(videoDuration(mainPath));
if (!totalDuration) {
  throw new Error("Não consegui medir a duração do vídeo principal (mainVideo). O arquivo está corrompido?");
}
console.log(`[PREP] Vídeo principal: ${path.basename(mainPath)} — ${totalDuration}s`);

// ── Mídias do 16:9 ───────────────────────────────────────────────
// Se "wide" não estiver definido no JSON, auto-detecta tudo na pasta
// que não seja o vídeo principal nem o logo.
const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

let wideInput = Array.isArray(job.wide) ? job.wide : null;

if (!wideInput) {
  const reserved = new Set([
    path.basename(mainVideoFile),
    logoFile ? path.basename(logoFile) : null,
    avatarFile ? path.basename(avatarFile) : null,
    "floating-phone-output.mp4",
  ].filter(Boolean));
  const allFiles = fs.readdirSync(mediaDir).filter((f) => {
    if (reserved.has(f)) return false;
    const ext = path.extname(f).toLowerCase();
    return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext);
  });
  if (allFiles.length === 0) {
    throw new Error(
      "Nenhuma mídia encontrada para o 16:9. Suba imagens/vídeos no Release além do portrait e do logo."
    );
  }
  wideInput = allFiles.sort(); // ordem alfabética (previsível)
  console.log(`[PREP] Auto-detectadas ${wideInput.length} mídia(s) para o 16:9:`);
  wideInput.forEach((f) => console.log(`  - ${f}`));
}

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
    VIDEO_EXTS.has(ext);
  return {
    absPath,
    type: isVideo ? "video" : "photo",
    vdur: isVideo ? videoDuration(absPath) : 0,
  };
});

// ── Loop para preencher a FASE 2 ─────────────────────────────────
// O vídeo principal ocupa a tela cheia nos primeiros PHASE1_SEC segundos.
// As imagens/vídeos do 16:9 só aparecem depois disso, então preenchem (total − PHASE1_SEC).
const PHASE1_SEC = 0; // precisa bater com o PHASE1_SEC do FloatingPhoneShowcase.tsx (0 = PiP o vídeo todo)
const wideFill = Math.max(0, totalDuration - PHASE1_SEC);

const looped = [];
let current = 0;
let idx = 0;
const cursors = {}; // absPath -> segundos já consumidos do vídeo

while (current < wideFill) {
  const seg = base[idx % base.length];
  const remaining = wideFill - current;
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

console.log(`[PREP] ${base.length} mídia(s) única(s) → ${looped.length} segmento(s) para cobrir a fase 2 (${wideFill}s, após ${PHASE1_SEC}s de tela cheia do principal)`);

const props = {
  portraitVideoSrc: toFileUrl(mainPath), // nome da prop no componente segue "portraitVideoSrc"
  logoSrc: logoPath ? toFileUrl(logoPath) : "",       // vazio = sem logo no topo
  wideSegments: looped,
  durationSec: totalDuration,
  channelName,
  channelHandle,
  subscribeText,
  subscribedText,
  subAvatarSrc: avatarPath ? toFileUrl(avatarPath) : "",
};

fs.writeFileSync(outFile, JSON.stringify(props, null, 2));
console.log(`[PREP] props.json escrito em ${outFile}`);
