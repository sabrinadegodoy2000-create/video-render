/**
 * Prepara o props.json para a composição IlMurettoF1Broadcast.
 *
 * MODO NARRAÇÃO (padrão):
 *   - Duração = áudio narration.m4a (áudios já concatenados no workflow).
 *   - Quadro emoldurado = mídias de fundo em loop pra preencher a narração.
 *
 * MODO VÍDEO GRANDE (MODE=bigvideo):
 *   - Vídeo único no quadro (com áudio). Duração = a dele.
 *
 * Classificação e próximo GP vêm da API Jolpica (todas as equipes, sem viés de time).
 *
 * Uso: node prep-il-muretto-f1-props.mjs <render-job.json> <pasta-midias> <props.json>
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { montarPools, distribuirMidias, distribuirBlocos, agendarPunchOverlay } from "./media-distribute.mjs";

const [, , jobFile, mediaDir, outFile] = process.argv;
if (!jobFile || !mediaDir || !outFile) {
  console.error("Uso: node prep-il-muretto-f1-props.mjs <render-job.json> <pasta-midias> <props.json>");
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFile, "utf-8"));
const SECONDS_PER_ITEM = Number(job.secondsPerItem) > 0 ? Number(job.secondsPerItem) : 3;

const MODE = (String(process.env.MODE || "").toLowerCase()) || "narracao";
const bigVideoMode = MODE === "bigvideo";
const narracao2Mode = MODE === "narracao2"; // fundo com marca d'água intercalando com mídias upadas

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
    const sobra = totalDuration - somaDurs; // fecha o arredondamento no último bloco
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
      const blocos = audios.map((_, i) => {
        let entradas = entradasDoBloco(i);
        if (!entradas.length) entradas = todasEntradas; // bloco sem mídia → usa todas
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

// ── Próximo GP (Jolpica) + traçado real (f1-circuits) — todas as equipes ──
const RACE_IT = {
  "Bahrain Grand Prix": "Gran Premio del Bahrain",
  "Saudi Arabian Grand Prix": "Gran Premio dell'Arabia Saudita",
  "Australian Grand Prix": "Gran Premio d'Australia",
  "Japanese Grand Prix": "Gran Premio del Giappone",
  "Chinese Grand Prix": "Gran Premio della Cina",
  "Miami Grand Prix": "Gran Premio di Miami",
  "Emilia Romagna Grand Prix": "Gran Premio dell'Emilia-Romagna",
  "Monaco Grand Prix": "Gran Premio di Monaco",
  "Canadian Grand Prix": "Gran Premio del Canada",
  "Spanish Grand Prix": "Gran Premio di Spagna",
  "Austrian Grand Prix": "Gran Premio d'Austria",
  "British Grand Prix": "Gran Premio di Gran Bretagna",
  "Hungarian Grand Prix": "Gran Premio d'Ungheria",
  "Belgian Grand Prix": "Gran Premio del Belgio",
  "Dutch Grand Prix": "Gran Premio d'Olanda",
  "Italian Grand Prix": "Gran Premio d'Italia",
  "Azerbaijan Grand Prix": "Gran Premio dell'Azerbaigian",
  "Singapore Grand Prix": "Gran Premio di Singapore",
  "United States Grand Prix": "Gran Premio degli Stati Uniti",
  "Mexico City Grand Prix": "Gran Premio del Messico",
  "São Paulo Grand Prix": "Gran Premio del Brasile",
  "Las Vegas Grand Prix": "Gran Premio di Las Vegas",
  "Qatar Grand Prix": "Gran Premio del Qatar",
  "Abu Dhabi Grand Prix": "Gran Premio di Abu Dhabi",
};
const COUNTRY_ISO = {
  Bahrain: "bh", "Saudi Arabia": "sa", Australia: "au", Japan: "jp", China: "cn",
  USA: "us", "United States": "us", Italy: "it", Monaco: "mc", Canada: "ca",
  Spain: "es", Austria: "at", UK: "gb", "United Kingdom": "gb", Hungary: "hu",
  Belgium: "be", Netherlands: "nl", Azerbaijan: "az", Singapore: "sg", Mexico: "mx",
  Brazil: "br", Qatar: "qa", UAE: "ae", "United Arab Emirates": "ae", France: "fr",
};

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function coordsToPath(coords) {
  const xs = coords.map((c) => c[0]), ys = coords.map((c) => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const span = 84, sc = Math.min(span / w, span / h);
  const offX = (100 - w * sc) / 2, offY = (100 - h * sc) / 2;
  const pts = coords.map(([x, y]) => [
    +(offX + (x - minX) * sc).toFixed(2),
    +(offY + (maxY - y) * sc).toFixed(2), // inverte Y (lat sobe; SVG y desce)
  ]);
  return "M" + pts.map((p) => `${p[0]},${p[1]}`).join(" L") + " Z";
}

async function fetchNextGP() {
  try {
    const r = await fetch("https://api.jolpi.ca/ergast/f1/current/next.json");
    const data = await r.json();
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) { console.warn("[GP] Sem próxima corrida na API."); return null; }
    const circuit = race.Circuit;
    const country = circuit?.Location?.country || "";
    const iso = COUNTRY_ISO[country];

    let trackPath = null;
    try {
      const geo = await (await fetch("https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson")).json();
      const target = norm(circuit.circuitName);
      const feats = geo.features || [];
      let f = feats.find((ft) => norm(ft.properties?.Name) === target)
        || feats.find((ft) => { const n = norm(ft.properties?.Name); return n && (n.includes(target) || target.includes(n)); })
        || feats.find((ft) => norm(ft.properties?.Location) === norm(circuit.Location?.locality));
      if (f) {
        const g = f.geometry;
        const coords = g.type === "LineString" ? g.coordinates : g.type === "MultiLineString" ? g.coordinates.flat() : null;
        if (coords && coords.length > 2) trackPath = coordsToPath(coords);
      }
      if (!trackPath) console.warn(`[GP] Traçado não encontrado pra "${circuit.circuitName}".`);
    } catch (e) { console.warn("[GP] Falha ao buscar traçado:", e.message); }

    const gp = {
      label: "PROSSIMO GP",
      name: RACE_IT[race.raceName] || race.raceName,
      circuit: circuit.circuitName,
      flagSrc: iso ? `https://flagcdn.com/w320/${iso}.png` : undefined,
    };
    console.log(`[GP] Próximo: ${gp.name} (${gp.circuit}) — traçado: ${trackPath ? "ok" : "—"}`);
    return { gp, trackPath };
  } catch (e) {
    console.warn("[GP] Falha ao buscar próximo GP:", e.message);
    return null;
  }
}

async function fetchStandings(topN = 10) {
  try {
    const r = await fetch("https://api.jolpi.ca/ergast/f1/current/driverStandings.json");
    const data = await r.json();
    const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
    if (!list || !list.length) { console.warn("[STANDINGS] Sem classificação na API."); return null; }
    const standings = list.slice(0, topN).map((d) => ({
      pos: Number(d.position),
      name: d.Driver?.familyName || d.Driver?.code || "",
      points: Number(d.points),
      team: d.Constructors?.[0]?.constructorId || "",
    }));
    console.log(`[STANDINGS] Top ${standings.length}: ` + standings.map((s) => `${s.pos}.${s.name}(${s.points})`).join(" "));
    return standings;
  } catch (e) {
    console.warn("[STANDINGS] Falha ao buscar classificação:", e.message);
    return null;
  }
}

// ── Fonte da duração + montagem do quadro ─────────────────────────
let totalDuration, audioPath = null, bigVideoPath = null;
let PHOTO_OVERLAYS = null; // fotos punch-in (modo vídeo de fundo contínuo)
let watermarkWindows = null; // janelas com marca d'água (modo narração v2)
const bigSegments = [];

if (narracao2Mode) {
  // "Narração v2": UM fundo (imagem ou vídeo) com marca d'água + aviso de copyright,
  // intercalando em batidas de `SECONDS_PER_ITEM`s com as mídias upadas (sem marca d'água).
  // Convenção de nome dos arquivos (vem do server.py): "bg_*" = fundo; "altNN_*" = alternadas, em ordem.
  audioPath = resolveMedia("narration.m4a", "narração");
  totalDuration = Math.ceil(mediaDuration(audioPath));
  if (!totalDuration) throw new Error("Não consegui medir a duração da narração (narration.m4a).");

  const files = fs.readdirSync(mediaDir);
  const bgFile = files.find((f) => f.startsWith("bg_"));
  if (!bgFile) throw new Error("Narração v2: nenhum arquivo de fundo (bg_*) encontrado.");
  const bgPath = resolveMedia(bgFile, "fundo");
  const bgIsVideo = VIDEO_EXTS.has(path.extname(bgPath).toLowerCase());
  const bgSlices = bgIsVideo ? Math.max(1, Math.floor(mediaDuration(bgPath) / SECONDS_PER_ITEM)) : 1;

  const altItems = files
    .filter((f) => /^alt\d+_/.test(f))
    .sort()
    .map((f) => {
      const absPath = resolveMedia(f, "mídia alternada");
      const isVideo = VIDEO_EXTS.has(path.extname(absPath).toLowerCase());
      // vídeo alternado avança pelas próprias fatias de 3s a cada reaparição (como o fundo) —
      // só conta fatia CHEIA; se o vídeo tiver menos de 3s no total, usa 1 fatia mesmo assim
      // (o Remotion trava no último frame pelo tempo que faltar, sem quebrar)
      const slices = isVideo ? Math.max(1, Math.floor(mediaDuration(absPath) / SECONDS_PER_ITEM)) : 1;
      return { absPath, isVideo, slices, sliceIdx: 0 };
    });

  const nBeats = Math.ceil(totalDuration / SECONDS_PER_ITEM);
  let acc = 0, bgSliceIdx = 0, altIdx = 0;
  watermarkWindows = [];
  for (let i = 0; i < nBeats; i++) {
    const dur = Math.min(SECONDS_PER_ITEM, totalDuration - acc);
    // fundo, mídia, fundo, mídia... — se não subiu nenhuma alternada, fica só no fundo
    const isBgBeat = i % 2 === 0 || altItems.length === 0;
    if (isBgBeat) {
      if (bgIsVideo) {
        const startSec = (bgSliceIdx % bgSlices) * SECONDS_PER_ITEM;
        bgSliceIdx++;
        bigSegments.push({ src: toFileUrl(bgPath), type: "video", durationSec: dur, startSec });
      } else {
        bigSegments.push({ src: toFileUrl(bgPath), type: "photo", durationSec: dur });
      }
      watermarkWindows.push({ startSec: +acc.toFixed(2), durationSec: dur });
    } else {
      const alt = altItems[altIdx % altItems.length];
      altIdx++;
      const seg = { src: toFileUrl(alt.absPath), type: alt.isVideo ? "video" : "photo", durationSec: dur };
      if (alt.isVideo) {
        seg.startSec = (alt.sliceIdx % alt.slices) * SECONDS_PER_ITEM;
        alt.sliceIdx++;
      }
      bigSegments.push(seg);
    }
    acc += dur;
  }
  console.log(`[PREP] Modo NARRAÇÃO V2 — fundo ${bgIsVideo ? "vídeo" : "imagem"} (${path.basename(bgPath)}) + ${altItems.length} mídia(s) alternada(s) — ${totalDuration}s, ${bigSegments.length} batida(s)`);
} else if (bigVideoMode) {
  const bigFile = process.env.MAIN_VIDEO || job.mainVideo;
  bigVideoPath = resolveMedia(bigFile, "vídeo grande");
  totalDuration = Math.ceil(mediaDuration(bigVideoPath));
  if (!totalDuration) throw new Error("Não consegui medir a duração do vídeo grande (mainVideo).");
  bigSegments.push({ src: toFileUrl(bigVideoPath), type: "video", durationSec: totalDuration });
  console.log(`[PREP] Modo VÍDEO GRANDE — ${path.basename(bigVideoPath)} — ${totalDuration}s`);
} else {
  audioPath = resolveMedia("narration.m4a", "narração");
  totalDuration = Math.ceil(mediaDuration(audioPath));
  if (!totalDuration) throw new Error("Não consegui medir a duração da narração (narration.m4a).");
  console.log(`[PREP] Modo NARRAÇÃO — duração ${totalDuration}s`);

  const reserved = new Set(["narration.m4a"]);
  const wideInput = fs.readdirSync(mediaDir).filter((f) => {
    if (reserved.has(f) || f.startsWith("audio-")) return false;
    const ext = path.extname(f).toLowerCase();
    return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext);
  }).sort();
  if (wideInput.length === 0) throw new Error("Nenhuma mídia de fundo encontrada (suba imagens/vídeos).");
  console.log(`[PREP] Fundo auto-detectado: ${wideInput.length} mídia(s)`);

  const entradas = wideInput.map((filename) => {
    const absPath = resolveMedia(filename, filename);
    return { absPath, isVideo: VIDEO_EXTS.has(path.extname(absPath).toLowerCase()) };
  });

  // ── Distribuição POR BLOCO (opcional) ─────────────────────────────
  const usedBlocks = distribuirPorBlocoSeHouver(mediaDir, entradas, totalDuration, bigSegments);
  if (!usedBlocks) {
    const pools = montarPools(entradas, SECONDS_PER_ITEM, mediaDuration);
    const dist = distribuirMidias(pools, totalDuration, SECONDS_PER_ITEM, toFileUrl);
    dist.bigSegments.forEach((s) => bigSegments.push(s));
    console.log(`[PREP] ${pools.length} mídia(s) → ${bigSegments.length} segmento(s) cobrindo ${totalDuration}s${dist.repetiu ? " (repetiu: mídia curta p/ o áudio)" : " (sem repetição)"}`);
  }
}

const showSubscribe = !["0", "false", "no", "off", "nao", "não"].includes(String(process.env.SUBSCRIBE ?? "true").toLowerCase());

// Manchetes: HEADLINES_JSON (lista [{headline,subheadline}]) → rotação a cada 60s.
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

if (narracao2Mode) {
  props.audioSrc = toFileUrl(audioPath);
  props.showCopyrightWatermark = true;
  if (watermarkWindows) props.watermarkWindows = watermarkWindows;
} else if (bigVideoMode) {
  props.bigAudio = true;
} else {
  props.audioSrc = toFileUrl(audioPath);
}

// próximo GP + classificação — todas as equipes, sem viés de time
const gpData = await fetchNextGP();
if (gpData?.gp && gpData?.trackPath) {
  props.nextGP = gpData.gp;
  props.trackPath = gpData.trackPath;
}

const standings = await fetchStandings(10);
if (standings && standings.length) {
  props.standings = standings;
}

fs.writeFileSync(outFile, JSON.stringify(props, null, 2));
console.log(`[PREP] props.json escrito (mode=${MODE})`);
