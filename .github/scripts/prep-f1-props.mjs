/**
 * Prepara o props.json para a composição F1Broadcast.
 *
 * MODO NORMAL (padrão):
 *   - PiP = vídeo principal (você). Duração total = a dele.
 *   - Grade grande = demais mídias (auto-detectadas), em loop pra preencher.
 *
 * MODO NARRAÇÃO (FULLSCREEN=true):
 *   - Sem PiP. Layout normal: classificação em cima, pista do próximo GP embaixo.
 *   - Duração = áudio narration.m4a (áudios já concatenados no workflow).
 *   - Grade grande = mídias de fundo em loop pra preencher a narração.
 *
 * Uso: node prep-f1-props.mjs <render-job.json> <pasta-midias> <props.json>
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { buildCueSheet } from "./f1-entities.mjs";

const [, , jobFile, mediaDir, outFile] = process.argv;
if (!jobFile || !mediaDir || !outFile) {
  console.error("Uso: node prep-f1-props.mjs <render-job.json> <pasta-midias> <props.json>");
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFile, "utf-8"));
const SECONDS_PER_ITEM = Number(job.secondsPerItem) > 0 ? Number(job.secondsPerItem) : 3;

// Modo: normal (PiP) | narracao (áudios) | bigvideo (vídeo único no quadro grande)
// Retrocompat: FULLSCREEN=true equivale a MODE=narracao.
const legacyFull = ["1", "true", "yes", "on", "sim"].includes(String(process.env.FULLSCREEN || "").toLowerCase());
const MODE = (String(process.env.MODE || "").toLowerCase()) || (legacyFull ? "narracao" : "normal");
const fullscreen = MODE === "narracao";      // layout classificação/pista + duração pelos áudios
const bigVideoMode = MODE === "bigvideo";    // vídeo único no quadro grande (com áudio) + classificação/pista

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

// ── Próximo GP (Jolpica) + traçado real (f1-circuits) ────────────
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

    // traçado real
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

// ── Fonte da duração + montagem do quadro grande ─────────────────
let totalDuration, pipPath = null, audioPath = null, pipFile = "", bigVideoPath = null;
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
  // duração
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

  // grade grande (fundo) — auto-detecta imagens/vídeos
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

  // ── Cue sheet SEMÂNTICO (se houver transcrição + tags das mídias) ──
  // transcript.json (Whisper, no workflow) + media-tags.json (auto-tag local).
  // Casa cada janela da fala com o melhor take; senão, cai no loop simples.
  let usedSemantic = false;
  const transcriptPath = path.join(mediaDir, "transcript.json");
  const tagsPath = path.join(mediaDir, "media-tags.json");
  if (fs.existsSync(transcriptPath) && fs.existsSync(tagsPath)) {
    try {
      const tr = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
      const words = Array.isArray(tr) ? tr : (tr.words || []);
      const tagsMap = JSON.parse(fs.readFileSync(tagsPath, "utf-8"));
      const assets = base.map((s) => ({ src: s.absPath, type: s.type, tags: tagsMap[path.basename(s.absPath)] || {} }));
      if (words.length && assets.length) {
        const cue = buildCueSheet(words, assets, { totalDuration, windowSec: SECONDS_PER_ITEM, toUrl: toFileUrl });
        if (cue.length) {
          cue.forEach((seg) => bigSegments.push(seg));
          usedSemantic = true;
          console.log(`[PREP] Cue sheet SEMÂNTICO: ${cue.length} segmento(s) casados com a narração (${words.length} palavras, ${assets.length} mídia(s)).`);
        }
      }
    } catch (e) {
      console.warn("[PREP] Cue sheet semântico falhou, usando loop:", e.message);
    }
  }

  if (!usedSemantic) {
    // Fatia vídeos longos em trechos de SECONDS_PER_ITEM (0s, 3s, 6s...) via startSec,
    // e distribui em rodízio SEM repetir. Só repete quando os trechos acabam antes do áudio.
    const pools = base.map((seg) => {
      let slices = [0];
      if (seg.type === "video") {
        const dur = mediaDuration(seg.absPath);
        const n = Math.max(1, Math.floor(dur / SECONDS_PER_ITEM));
        slices = Array.from({ length: n }, (_, i) => +(i * SECONDS_PER_ITEM).toFixed(2));
      }
      return { absPath: seg.absPath, type: seg.type, isVideo: seg.type === "video", slices, cursor: 0 };
    });
    const totalTrechos = pools.reduce((a, p) => a + p.slices.length, 0);

    let current = 0, repeticoes = 0;
    while (current < totalDuration) {
      let usouAlgum = false;
      for (const p of pools) {
        if (current >= totalDuration) break;
        if (p.cursor >= p.slices.length) continue;
        const startSec = p.slices[p.cursor]; p.cursor += 1;
        const remaining = totalDuration - current;
        const seg = { src: toFileUrl(p.absPath), type: p.type, durationSec: +Math.min(SECONDS_PER_ITEM, remaining).toFixed(2) };
        if (p.isVideo && startSec > 0) seg.startSec = startSec;
        bigSegments.push(seg);
        current += SECONDS_PER_ITEM;
        usouAlgum = true;
      }
      if (!usouAlgum) {
        pools.forEach((p) => { p.cursor = 0; });
        repeticoes += 1;
        if (repeticoes > 5000) break;
      }
    }
    console.log(`[PREP] ${pools.length} mídia(s) → ${totalTrechos} trecho(s) de ${SECONDS_PER_ITEM}s → ${bigSegments.length} segmento(s) cobrindo ${totalDuration}s${repeticoes ? ` (repetiu ${repeticoes}x)` : " (sem repetição)"}`);
  }
}

const showEndExpand = ["1", "true", "yes", "on", "sim"].includes(String(process.env.END_EXPAND || "").toLowerCase());
// barra de inscrição: padrão LIGADA (só desliga se vier explicitamente "false"/"no"/"0")
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
  // vídeo único no quadro grande (com áudio) + layout classificação/pista
  props.fullscreenMode = true;
  props.bigAudio = true;
  props.showEndExpand = showEndExpand;
} else if (fullscreen) {
  props.fullscreenMode = true;
  props.audioSrc = toFileUrl(audioPath);
  props.showEndExpand = false;
} else {
  props.pipVideoSrc = toFileUrl(pipPath);
  props.showEndExpand = showEndExpand;
}

// pista do próximo GP — usada nos dois modos:
//   normal    → intercala com a classificação no painel de cima
//   narração  → fica fixa embaixo (no lugar do PiP)
const gpData = await fetchNextGP();
if (gpData?.gp && gpData?.trackPath) {
  props.nextGP = gpData.gp;
  props.trackPath = gpData.trackPath;
}

// classificação dos pilotos ao vivo (Top 10) — usada nos dois modos.
// Se a API falhar, o componente cai no DEFAULT_STANDINGS embutido.
const standings = await fetchStandings(10);
if (standings && standings.length) {
  props.standings = standings;
}

fs.writeFileSync(outFile, JSON.stringify(props, null, 2));
console.log(`[PREP] props.json escrito (fullscreen=${fullscreen})`);
