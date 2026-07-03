/**
 * Dicionário F1 (pilotos, equipes, circuitos) com apelidos em italiano +
 * detecção de entidades em texto e montagem do "cue sheet" (bigSegments)
 * casando a fala com as tags das mídias.
 *
 * Fluxo:
 *   transcript (palavras + tempos) ──▶ detectEntities por janela
 *   tags das mídias (do auto-tag por visão) ──▶ buildCueSheet
 *   → [{ src, type, durationSec }] pronto pro F1Broadcast.
 *
 * Sem dependências. Usado pelo prep-f1-props.mjs.
 */

// ── Pilotos ──────────────────────────────────────────────────────
// IDs = sobrenome. O auto-tag por visão DEVE devolver esses mesmos IDs.
// Grid 2026 + lendas da Ferrari (pra casar imagens/arquivo históricos).
export const DRIVERS = {
  // — Grid 2026 —
  verstappen: { aliases: ["verstappen", "max verstappen", "super max", "mad max", "#1"] },
  hamilton:   { aliases: ["hamilton", "lewis", "sir lewis", "sette volte campione", "sette volte iridato", "seven time", "seven times", "#44", "lh44"] },
  leclerc:    { aliases: ["leclerc", "charles", "il predestinato", "sharl", "il monegasco", "#16"] },
  norris:     { aliases: ["norris", "lando", "#4"] },
  piastri:    { aliases: ["piastri", "oscar", "il pirata", "#81"] },
  russell:    { aliases: ["russell", "george russell", "mr saturday", "#63"] },
  antonelli:  { aliases: ["antonelli", "kimi", "kimi antonelli", "andrea kimi", "il bolognese", "#12"] },
  gasly:      { aliases: ["gasly", "pierre gasly", "#10"] },
  hadjar:     { aliases: ["hadjar", "isack", "#6"] },
  lawson:     { aliases: ["lawson", "liam", "#30"] },
  alonso:     { aliases: ["alonso", "fernando", "el plan", "lo spagnolo", "#14"] },
  stroll:     { aliases: ["stroll", "lance", "#18"] },
  sainz:      { aliases: ["sainz", "carlos", "smooth operator", "#55"] },
  albon:      { aliases: ["albon", "alexander albon", "#23"] },
  bearman:    { aliases: ["bearman", "ollie", "oliver bearman", "#87"] },
  ocon:       { aliases: ["ocon", "esteban", "#31"] },
  bortoleto:  { aliases: ["bortoleto", "gabriel bortoleto", "#5"] },
  hulkenberg: { aliases: ["hulkenberg", "hulk", "the hulk", "#27"] },
  bottas:     { aliases: ["bottas", "valtteri", "#77"] },
  perez:      { aliases: ["perez", "checo", "sergio perez", "#11"] },
  colapinto:  { aliases: ["colapinto", "franco colapinto", "#43"] },
  lindblad:   { aliases: ["lindblad", "arvid", "#0"] },
  // — Lendas / storia (útil pra imagens de arquivo Ferrari) —
  schumacher: { aliases: ["schumacher", "schumi", "michael schumacher", "il kaiser", "il predestinato tedesco"] },
  vettel:     { aliases: ["vettel", "sebastian vettel", "seb"] },
  massa:      { aliases: ["felipe massa", "massa"] },
  raikkonen:  { aliases: ["raikkonen", "räikkönen", "iceman", "kimi raikkonen"] },
  senna:      { aliases: ["senna", "ayrton", "ayrton senna", "magic"] },
  lauda:      { aliases: ["lauda", "niki lauda", "niki"] },
  villeneuve: { aliases: ["villeneuve", "gilles villeneuve", "gilles", "jacques villeneuve"] },
  prost:      { aliases: ["prost", "alain prost", "il professore"] },
};

// ── Equipes (epítetos italianos incluídos) ───────────────────────
export const TEAMS = {
  ferrari:      { aliases: ["ferrari", "scuderia", "scuderia ferrari", "cavallino", "cavallino rampante", "la rossa", "le rosse", "maranello", "ferraristi"] },
  mercedes:     { aliases: ["mercedes", "frecce d argento", "freccia d argento", "tre punte", "brackley", "amg"] },
  red_bull:     { aliases: ["red bull", "redbull", "red bull racing", "i tori", "milton keynes", "rbr"] },
  mclaren:      { aliases: ["mclaren", "papaya", "woking"] },
  alpine:       { aliases: ["alpine", "enstone", "renault"] },
  rb:           { aliases: ["racing bulls", "visa cash app", "toro rosso", "alphatauri", "faenza", "vcarb"] },
  williams:     { aliases: ["williams", "grove"] },
  aston_martin: { aliases: ["aston martin", "aston", "silverstone racing"] },
  haas:         { aliases: ["haas", "gene haas"] },
  audi:         { aliases: ["audi", "sauber", "kick sauber", "hinwil"] },
  cadillac:     { aliases: ["cadillac", "andretti"] },
};

// ── Circuitos (nome + apelidos + país IT). Evitei "italia" (genérico demais). ──
export const CIRCUITS = {
  monza:       { aliases: ["monza", "tempio della velocità", "autodromo nazionale"] },
  imola:       { aliases: ["imola", "enzo e dino ferrari", "emilia romagna"] },
  spa:         { aliases: ["spa", "francorchamps", "eau rouge", "belgio"] },
  monaco:      { aliases: ["monaco", "montecarlo", "monte carlo", "principato"] },
  silverstone: { aliases: ["silverstone", "gran bretagna", "inghilterra"] },
  redbullring: { aliases: ["red bull ring", "spielberg", "austria"] },
  suzuka:      { aliases: ["suzuka", "giappone"] },
  interlagos:  { aliases: ["interlagos", "san paolo", "brasile"] },
  jeddah:      { aliases: ["jeddah", "gedda", "arabia saudita", "arabia"] },
  sakhir:      { aliases: ["sakhir", "bahrain"] },
  shanghai:    { aliases: ["shanghai", "cina"] },
  miami:       { aliases: ["miami"] },
  montreal:    { aliases: ["montreal", "gilles villeneuve", "canada"] },
  barcelona:   { aliases: ["barcellona", "catalunya", "montmelo", "spagna"] },
  hungaroring: { aliases: ["hungaroring", "budapest", "ungheria"] },
  zandvoort:   { aliases: ["zandvoort", "olanda", "paesi bassi"] },
  baku:        { aliases: ["baku", "azerbaigian"] },
  marinabay:   { aliases: ["marina bay", "singapore"] },
  cota:        { aliases: ["austin", "cota", "stati uniti", "circuit of the americas"] },
  mexico:      { aliases: ["hermanos rodriguez", "citta del messico", "messico"] },
  vegas:       { aliases: ["las vegas", "vegas"] },
  losail:      { aliases: ["losail", "lusail", "qatar"] },
  yasmarina:   { aliases: ["yas marina", "abu dhabi", "yas"] },
  melbourne:   { aliases: ["albert park", "melbourne", "australia"] },
};

// ── Pessoas (chefes de equipe / figuras) ─────────────────────────
export const PEOPLE = {
  vasseur:     { aliases: ["vasseur", "fred vasseur"] },
  wolff:       { aliases: ["toto wolff", "toto", "wolff"] },
  horner:      { aliases: ["christian horner", "horner"] },
  stella:      { aliases: ["andrea stella"] },       // team principal McLaren (evitar "stella" solto)
  mekies:      { aliases: ["laurent mekies", "mekies"] },
  domenicali:  { aliases: ["domenicali", "stefano domenicali"] },
  newey:       { aliases: ["adrian newey", "newey"] },
  ben_sulayem: { aliases: ["ben sulayem", "presidente fia"] },
};

// ── Cenas / ações (detectadas na FALA e na imagem) ───────────────
export const SCENES = {
  start:       { aliases: ["partenza", "la partenza", "griglia di partenza", "spegnimento semafori", "start", "largata"] },
  overtake:    { aliases: ["sorpasso", "sorpassi", "sorpassa", "staccata", "attacco", "overtake", "controsorpasso"] },
  crash:       { aliases: ["incidente", "botto", "contatto", "testacoda", "a muro", "fuori pista", "bandiera rossa", "crash"] },
  pitstop:     { aliases: ["pit stop", "ai box", "cambio gomme", "sosta ai box", "pit lane"] },
  podium:      { aliases: ["podio", "sul podio", "champagne", "trofeo", "gradino piu alto"] },
  celebration: { aliases: ["festeggia", "esultanza", "festeggiamenti", "celebrazione"] },
  rain:        { aliases: ["pioggia", "sotto la pioggia", "bagnato", "gomme da bagnato", "intermedie", "wet"] },
  safetycar:   { aliases: ["safety car", "virtual safety car", "vsc", "auto di sicurezza"] },
  qualifying:  { aliases: ["qualifiche", "pole position", "pole", "giro veloce", "q3", "time attack"] },
  duel:        { aliases: ["duello", "bagarre", "battaglia", "lotta ruota a ruota"] },
};

// normaliza texto: minúsculo, sem acento, pontuação/apóstrofo → espaço (mantém # e alfanumérico)
const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9#]+/g, " ").trim();

// pré-computa aliases normalizados por entidade, em ordem (mais longos primeiro = mais específicos)
function buildIndex(dict, kind) {
  const out = [];
  for (const [id, def] of Object.entries(dict)) {
    for (const a of def.aliases) out.push({ id, kind, alias: norm(a) });
  }
  return out.sort((x, y) => y.alias.length - x.alias.length);
}
const INDEX = [
  ...buildIndex(DRIVERS, "driver"), ...buildIndex(TEAMS, "team"), ...buildIndex(CIRCUITS, "circuit"),
  ...buildIndex(PEOPLE, "person"), ...buildIndex(SCENES, "scene"),
];

/**
 * Detecta entidades faladas num trecho de texto.
 * Retorna { drivers, teams, circuits, people, scenes } (Sets) — usa word-boundary.
 */
export function detectEntities(text) {
  const t = " " + norm(text) + " ";
  const out = { drivers: new Set(), teams: new Set(), circuits: new Set(), people: new Set(), scenes: new Set() };
  const bucket = { driver: "drivers", team: "teams", circuit: "circuits", person: "people", scene: "scenes" };
  for (const { id, kind, alias } of INDEX) {
    // fronteira: precedido/seguido por não-alfanumérico (aliases podem ter espaço/#)
    const re = new RegExp("(^|[^a-z0-9])" + alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])");
    if (re.test(t)) out[bucket[kind]].add(id);
  }
  return out;
}

/**
 * Monta o cue sheet (bigSegments) casando cada janela de tempo com o melhor asset.
 *
 * @param {Array} words       [{ word, start, end }]  (segundos) — da transcrição
 * @param {Array} assets      [{ src, type, tags:{drivers:[],teams:[],circuits:[]} }] — do auto-tag
 * @param {Object} opts       { totalDuration, windowSec=3, genericPool=[] , toUrl=(s)=>s }
 * @returns {Array} bigSegments [{ src, type, durationSec }]
 */
export function buildCueSheet(words, assets, opts = {}) {
  const windowSec = opts.windowSec || 3;
  const total = opts.totalDuration || (words.length ? words[words.length - 1].end : 0);
  const toUrl = opts.toUrl || ((s) => s);

  // índice asset → conjunto de entidades (pra pontuar rápido)
  const tagLen = (t) => (t?.drivers?.length || 0) + (t?.teams?.length || 0) + (t?.circuits?.length || 0) + (t?.people?.length || 0) + (t?.scenes?.length || 0);
  const A = assets.map((a) => ({
    ...a,
    D: new Set(a.tags?.drivers || []),
    T: new Set(a.tags?.teams || []),
    C: new Set(a.tags?.circuits || []),
    P: new Set(a.tags?.people || []),
    S: new Set(a.tags?.scenes || []),
    generic: tagLen(a.tags) === 0,
  }));
  const genericAssets = A.filter((a) => a.generic);

  const segments = [];
  let lastSrc = null;

  for (let t = 0; t < total; t += windowSec) {
    const winEnd = Math.min(t + windowSec, total);
    // entidades faladas nesta janela (com uma leve margem à frente pra "antecipar" a fala).
    // Janelas maiores ajudam cena/pessoa a casarem com a frase inteira.
    const spoken = { drivers: new Set(), teams: new Set(), circuits: new Set(), people: new Set(), scenes: new Set() };
    for (const w of words) {
      if (w.end < t - 0.4 || w.start > winEnd + 0.6) continue;
      const e = detectEntities(w.word);
      for (const k of ["drivers", "teams", "circuits", "people", "scenes"]) e[k].forEach((x) => spoken[k].add(x));
    }

    // pontua: piloto (3) = pessoa (3) = cena (3) > circuito (2) > equipe (1); penaliza repetir
    let best = null, bestScore = 0;
    for (const a of A) {
      let s = 0;
      for (const d of spoken.drivers) if (a.D.has(d)) s += 3;
      for (const p of spoken.people) if (a.P.has(p)) s += 3;
      for (const sc of spoken.scenes) if (a.S.has(sc)) s += 3;
      for (const c of spoken.circuits) if (a.C.has(c)) s += 2;
      for (const tm of spoken.teams) if (a.T.has(tm)) s += 1;
      if (s === 0) continue;
      if (toUrl(a.src) === lastSrc) s -= 1.5; // evita repetir consecutivo
      if (s > bestScore) { bestScore = s; best = a; }
    }

    // fallback: nada casou → genérico (rotaciona), senão mantém o anterior/1º asset
    if (!best) {
      if (genericAssets.length) {
        best = genericAssets[Math.floor(t / windowSec) % genericAssets.length];
      } else {
        best = A.find((a) => toUrl(a.src) !== lastSrc) || A[0];
      }
    }

    const src = toUrl(best.src);
    // se caiu no mesmo do anterior, tenta variar pra não travar na tela
    const seg = { src, type: best.type || "photo", durationSec: +(winEnd - t).toFixed(2) };
    // agrupa se for o mesmo asset em janelas seguidas (menos cortes)
    const prev = segments[segments.length - 1];
    if (prev && prev.src === seg.src) prev.durationSec = +(prev.durationSec + seg.durationSec).toFixed(2);
    else segments.push(seg);
    lastSrc = src;
  }
  return segments;
}
