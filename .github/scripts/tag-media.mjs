/**
 * Auto-tag por visão: descobre quais pilotos/equipes/circuitos de F1 aparecem
 * em cada imagem/vídeo, usando o Claude (visão). Resultado cacheado por hash
 * do arquivo — cada mídia é analisada UMA vez.
 *
 * Uso:
 *   ANTHROPIC_API_KEY=... node tag-media.mjs <pasta-midias> [--cache c.json] [--out assets.json]
 *   DRY_RUN=1 node tag-media.mjs <pasta>      # testa o encanamento sem chamar a API
 *
 * Saída (assets.json): [{ src:"file://...", type:"photo"|"video", tags:{drivers,teams,circuits} }]
 * Alimenta o buildCueSheet() do f1-entities.mjs.
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { DRIVERS, TEAMS, CIRCUITS, PEOPLE, SCENES } from "./f1-entities.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// carrega .github/scripts/.env (ANTHROPIC_API_KEY=...) sem sobrescrever o que já existe
(() => {
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

// Opus 4.8 = melhor em rosto de piloto (padrão). TAG_MODEL=claude-haiku-4-5 pra economizar.
const MODEL = process.env.TAG_MODEL || "claude-opus-4-8";
const DRY = ["1", "true", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());
const FRAMES_PER_VIDEO = 3;

const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

const DRIVER_IDS = new Set(Object.keys(DRIVERS));
const TEAM_IDS = new Set(Object.keys(TEAMS));
const CIRCUIT_IDS = new Set(Object.keys(CIRCUITS));
const PEOPLE_IDS = new Set(Object.keys(PEOPLE));
const SCENE_IDS = new Set(Object.keys(SCENES));

// descrições visuais das cenas (o modelo tagueia a AÇÃO do clipe)
const SCENE_HINT = {
  start: "race start / starting grid, lights out",
  overtake: "one car passing another, wheel to wheel",
  crash: "accident, car in the wall, debris, red flag",
  pitstop: "car in the pit box, mechanics changing tyres",
  podium: "podium ceremony, trophies, champagne",
  celebration: "driver or team celebrating a win",
  rain: "wet track, spray, rain",
  safetycar: "safety car on track",
  qualifying: "qualifying / pole lap context",
  duel: "close on-track battle between two cars",
};

// nome legível de cada id (primeiro alias "de nome", não apelido/número) — ajuda o modelo
const displayName = (id, def) => {
  const a = def.aliases.find((x) => !x.startsWith("#") && x.length > 2) || id;
  return a.replace(/\b\w/g, (c) => c.toUpperCase());
};
const listFor = (dict, ids) =>
  Object.entries(dict).map(([id, def]) => `${id} (${displayName(id, def)})`).join(", ");

const SYSTEM =
  "You are an expert Formula 1 image analyst. From the frames, identify: drivers (face, helmet, name/number on car or suit), teams (livery, colors, sponsor logos), circuits (track layout, grandstands, signage), people (team principals / paddock figures by face), and the scene/action taking place. " +
  "Report ALL entities you see with reasonable confidence — an image can have several drivers and/or people. It is fine to return empty lists. Never guess. Use ONLY the exact IDs provided.";

const sceneList = Object.keys(SCENES).map((id) => `${id} (${SCENE_HINT[id] || id})`).join(", ");
const PROMPT_IDS =
  `DRIVERS: ${listFor(DRIVERS, DRIVER_IDS)}\n\n` +
  `TEAMS: ${listFor(TEAMS, TEAM_IDS)}\n\n` +
  `CIRCUITS: ${listFor(CIRCUITS, CIRCUIT_IDS)}\n\n` +
  `PEOPLE: ${listFor(PEOPLE, PEOPLE_IDS)}\n\n` +
  `SCENES: ${sceneList}`;

const USER_TEXT =
  "The image(s) below are frames from ONE media asset. Identify which F1 entities appear (include every driver/person visible).\n\n" +
  PROMPT_IDS +
  '\n\nReturn ONLY a JSON object, no prose, in this exact shape:\n' +
  '{"drivers": [], "teams": [], "circuits": [], "people": [], "scenes": []}\n' +
  "Use only IDs from the lists above. Empty arrays when nothing is clearly identifiable.";

const client = DRY ? null : new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

function sh(cmd, args) {
  return execFileSync(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
}
function mediaDuration(abs) {
  try {
    const out = sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", abs]).toString().trim();
    const d = parseFloat(out);
    return Number.isFinite(d) ? d : 0;
  } catch { return 0; }
}
function fileHash(abs) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex").slice(0, 16);
}

// extrai 1 frame (imagem) ou N frames (vídeo), redimensiona p/ 768px, retorna base64 jpeg[]
function extractFrames(abs, isVideo, tmpDir) {
  const frames = [];
  const scale = "scale='min(768,iw)':-2";
  if (!isVideo) {
    const out = path.join(tmpDir, "f0.jpg");
    sh("ffmpeg", ["-y", "-i", abs, "-vf", scale, "-frames:v", "1", "-q:v", "4", out]);
    frames.push(out);
  } else {
    const dur = mediaDuration(abs) || 0;
    const times = dur > 1
      ? Array.from({ length: FRAMES_PER_VIDEO }, (_, i) => (dur * (i + 0.5)) / FRAMES_PER_VIDEO)
      : [0];
    times.forEach((t, i) => {
      const out = path.join(tmpDir, `f${i}.jpg`);
      try {
        sh("ffmpeg", ["-y", "-ss", String(t.toFixed(2)), "-i", abs, "-vf", scale, "-frames:v", "1", "-q:v", "4", out]);
        if (fs.existsSync(out)) frames.push(out);
      } catch {}
    });
  }
  return frames.map((f) => fs.readFileSync(f).toString("base64"));
}

const EMPTY_TAGS = { drivers: [], teams: [], circuits: [], people: [], scenes: [] };
function sanitizeTags(obj) {
  const arr = (x, set) => [...new Set((Array.isArray(x) ? x : []).map(String).filter((v) => set.has(v)))];
  return {
    drivers: arr(obj?.drivers, DRIVER_IDS),
    teams: arr(obj?.teams, TEAM_IDS),
    circuits: arr(obj?.circuits, CIRCUIT_IDS),
    people: arr(obj?.people, PEOPLE_IDS),
    scenes: arr(obj?.scenes, SCENE_IDS),
  };
}

async function tagFrames(framesB64) {
  if (DRY) return { ...EMPTY_TAGS };
  const content = framesB64.map((data) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data },
  }));
  content.push({ type: "text", text: USER_TEXT });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });
  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { ...EMPTY_TAGS };
  try { return sanitizeTags(JSON.parse(m[0])); }
  catch { return { ...EMPTY_TAGS }; }
}

async function main() {
  const args = process.argv.slice(2);
  const mediaDir = args.find((a) => !a.startsWith("--"));
  const getOpt = (k, d) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : d; };
  if (!mediaDir || !fs.existsSync(mediaDir)) {
    console.error("Uso: node tag-media.mjs <pasta-midias> [--cache c.json] [--out assets.json]");
    process.exit(1);
  }
  const cacheFile = getOpt("--cache", path.join(__dirname, "media-tags-cache.json"));
  const outFile = getOpt("--out", path.join(mediaDir, "media-assets.json"));

  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf-8")) : {};
  const files = fs.readdirSync(mediaDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext);
  }).sort();

  const assets = [];
  const tagsMap = {}; // nome-do-arquivo → tags (portável; é o que sobe pro workflow)
  let tagged = 0, cached = 0;
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "f1tag-"));

  for (const f of files) {
    const abs = path.resolve(mediaDir, f);
    const ext = path.extname(f).toLowerCase();
    const isVideo = VIDEO_EXTS.has(ext);
    const hash = fileHash(abs);

    let tags;
    if (cache[hash]?.tags) {
      tags = cache[hash].tags; cached++;
    } else {
      const tmp = fs.mkdtempSync(path.join(tmpRoot, "m-"));
      const frames = extractFrames(abs, isVideo, tmp);
      tags = frames.length ? await tagFrames(frames) : { ...EMPTY_TAGS };
      if (!DRY) cache[hash] = { file: f, tags, at: new Date().toISOString() }; // DRY não polui o cache
      tagged++;
    }

    assets.push({ src: "file://" + abs.split(path.sep).join("/"), type: isVideo ? "video" : "photo", tags });
    tagsMap[f] = tags;
    const flat = [
      ...tags.drivers,
      ...tags.people.map((p) => "👤" + p),
      ...tags.scenes.map((s) => "🎬" + s),
      ...tags.teams.map((t) => "🏎" + t),
      ...tags.circuits.map((c) => "📍" + c),
    ];
    console.log(`${f.padEnd(40)} → ${flat.join(", ") || "(genérico)"}`);
  }

  if (!DRY) fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  fs.writeFileSync(outFile, JSON.stringify(assets, null, 2));
  fs.writeFileSync(path.join(mediaDir, "media-tags.json"), JSON.stringify(tagsMap, null, 2)); // portável p/ o workflow
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

  console.log(`\n[TAG] ${files.length} mídia(s): ${tagged} nova(s) analisada(s), ${cached} do cache${DRY ? "  (DRY_RUN — sem API)" : ""}.`);
  console.log(`[TAG] Cache: ${cacheFile}`);
  console.log(`[TAG] Assets: ${outFile}`);
}

main().catch((e) => { console.error("[TAG] Erro:", e.message); process.exit(1); });
