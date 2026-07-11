import { useCurrentFrame, useVideoConfig, Img, OffthreadVideo, Audio, interpolate, Sequence, Loop, staticFile } from "remotion";
import { DriverStandings, Standing } from "./DriverStandings";
import { TrackMap3D, GPInfo } from "./TrackMap3D";
import { SubscribeBar } from "./SubscribePopup";
import { pickHeadline, HeadlineItem } from "./rotatingHeadline";

export type F1Segment = { src: string; type: "photo" | "video"; durationSec: number; startSec?: number };

export type Driver = { name: string; photoSrc?: string };

export type F1BroadcastProps = {
  bigSegments: F1Segment[];   // slideshow da grade grande (esquerda)
  fixedImageSrc?: string;     // imagem fixa (grade pequena de cima)
  standings?: Standing[];     // classificação (Top 3) na grade pequena de cima
  pipVideoSrc?: string;       // você (grade pequena de baixo)
  programLogoSrc?: string;    // logo do programa (rodapé, esquerda)
  f1LogoSrc?: string;         // logo da F1 (entre os pilotos, no topo)
  backgroundSrc?: string;     // imagem de fundo (substitui a textura do código)
  driverLeft: Driver;         // piloto esquerdo (topo) — fixo no código
  driverRight: Driver;        // piloto direito (topo)
  headline?: string;          // manchete (italiano) — vazio = sem texto (adiciona no CapCut)
  subheadline?: string;       // subtítulo
  headlines?: HeadlineItem[]; // várias manchetes → intercala a cada headlineRotateSec
  headlineRotateSec?: number; // intervalo da troca de manchete (default 60s)
  durationSec: number;
  showEndExpand?: boolean;    // animação final: painel grande toma a tela toda
  fullscreenMode?: boolean;   // modo narração: sem PiP (pista fica no lugar dele, classificação em cima)
  audioSrc?: string;          // narração (áudios já concatenados)
  nextGP?: GPInfo;            // próximo GP (pista 3D) — alterna com a classificação
  trackPath?: string;         // traçado SVG do circuito
  showSubscribe?: boolean;    // barra de inscrição (mãozinha clicando) em ciclo
  subscribeCycleSec?: number; // de quanto em quanto tempo a barra reaparece (default 30)
  bigAudio?: boolean;         // toca o áudio do vídeo do quadro grande (modo "vídeo grande")
};

// Conteúdo fixo (mocado) — pilotos, classificação e assets de marca
const DEFAULT_STANDINGS: Standing[] = [
  { pos: 1, name: "Antonelli", points: 156, teamColor: "#00D2BE", teamLogoSrc: staticFile("logo-mercedes.svg") },
  { pos: 2, name: "Hamilton", points: 115, teamColor: "#DC0000", teamLogoSrc: staticFile("ferrari-f1-logo.png"), logoScale: 1.45 },
  { pos: 3, name: "Russell", points: 106, teamColor: "#00D2BE", teamLogoSrc: staticFile("logo-mercedes.svg") },
  { pos: 4, name: "Leclerc", points: 75, teamColor: "#DC0000", teamLogoSrc: staticFile("ferrari-f1-logo.png"), logoScale: 1.45 },
  { pos: 5, name: "Norris", points: 73, teamColor: "#FF8000", teamLogoSrc: staticFile("mclaren-f1-logo.png") },
  { pos: 6, name: "Piastri", points: 68, teamColor: "#FF8000", teamLogoSrc: staticFile("mclaren-f1-logo.png") },
  { pos: 7, name: "Verstappen", points: 55, teamColor: "#1E41FF", teamLogoSrc: staticFile("redbull-f1-logo.png"), logoScale: 1.35 },
  { pos: 8, name: "Gasly", points: 41, teamColor: "#0093CC", teamLogoSrc: staticFile("alpine-f1-logo.png") },
  { pos: 9, name: "Hadjar", points: 34, teamColor: "#1E41FF", teamLogoSrc: staticFile("redbull-f1-logo.png"), logoScale: 1.35 },
  { pos: 10, name: "Lawson", points: 28, teamColor: "#6692FF", teamLogoSrc: staticFile("racingbulls-logo.webp") },
];

// ── Estilo por equipe (constructorId da API) — cor + logo + ajuste ──
// Times sem logo no projeto caem no fallback (caixinha branca), mas mantêm a cor.
const TEAM_STYLE: Record<string, { color: string; logo?: string; scale?: number }> = {
  mercedes:     { color: "#00D2BE", logo: staticFile("logo-mercedes.svg") },
  ferrari:      { color: "#DC0000", logo: staticFile("ferrari-f1-logo.png"), scale: 1.45 },
  mclaren:      { color: "#FF8000", logo: staticFile("mclaren-f1-logo.png") },
  red_bull:     { color: "#1E41FF", logo: staticFile("redbull-f1-logo.png"), scale: 1.35 },
  alpine:       { color: "#0093CC", logo: staticFile("alpine-f1-logo.png") },
  rb:           { color: "#6692FF", logo: staticFile("racingbulls-logo.webp") },
  haas:         { color: "#9C9FA2" },
  williams:     { color: "#005AFF" },
  audi:         { color: "#00594F" },
  aston_martin: { color: "#006F62" },
  cadillac:     { color: "#9A7B4F" },
};

// Preenche cor/logo/escala a partir do constructorId, sem sobrescrever o que já veio.
function resolveStandings(list: Standing[]): Standing[] {
  return list.map((s) => {
    const st = s.team ? TEAM_STYLE[s.team] : undefined;
    if (!st) return s;
    return {
      ...s,
      teamColor: s.teamColor || st.color,
      teamLogoSrc: s.teamLogoSrc ?? st.logo,
      logoScale: s.logoScale ?? st.scale,
    };
  });
}

export const F1_BROADCAST_DURATION = 30 * 30;

// ── Paleta Ferrari ────────────────────────────────────────────────
const FERRARI_RED = "#D40000";
const FERRARI_RED_HI = "#ff1e1e";
const FERRARI_YELLOW = "#FFE000";
const BG_DARK = "#1a1a1d"; // grafite fosco (não preto puro)
const PANEL_BG = "#000000";
const FONT = "'Neue Haas Grotesk Display Pro', 'Helvetica Neue', Arial, sans-serif";
const HEAD_FONT = FONT; // manchete na Neue Haas (peso forte aplicado no estilo)
const SUB_FONT = FONT;  // subtítulo na Neue Haas
const LOGO_BG = "#21211D";   // fundo do box do logo
const BAR_BG = "#262722";    // fundo do box do título/subtítulo

// Moldura de uma grade (borda vermelha + cantos arredondados)
const PanelFrame: React.FC<{ x: number; y: number; w: number; h: number; children?: React.ReactNode; label?: string; opacity?: number }> = ({ x, y, w, h, children, label, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x, top: y, width: w, height: h,
      borderRadius: 0,
      overflow: "hidden",
      background: PANEL_BG,
      border: `3px solid ${FERRARI_RED}`,
      boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
      opacity,
    }}
  >
    {children}
  </div>
);

// Card de piloto no topo (foto redonda + nome)
const DriverCard: React.FC<{ driver: Driver; flip?: boolean }> = ({ driver, flip }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18, flexDirection: flip ? "row-reverse" : "row" }}>
    <div style={{ width: 78, height: 78, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
      {driver.photoSrc ? (
        <Img src={driver.photoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: FONT, fontSize: 28, fontWeight: 700 }}>
          {driver.name?.[0] ?? "?"}
        </div>
      )}
    </div>
    <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 38, color: "#fff", letterSpacing: 0.5, whiteSpace: "nowrap", textTransform: "uppercase" }}>
      {driver.name}
    </span>
  </div>
);

// Mídia com blur fill: fundo borrado (cover) + mídia inteira na frente (contain).
// fx (só vídeo): espelha na horizontal + blur leve na frente — pra descaracterizar
// material reaproveitado.
const BlurFillMedia: React.FC<{ src: string; isVideo: boolean; muted?: boolean; trimBefore?: number; fx?: boolean }> = ({ src, isVideo, muted = true, trimBefore, fx }) => {
  const flip = fx && isVideo ? "scaleX(-1)" : undefined;
  const fgFilter = fx && isVideo ? "blur(3px)" : undefined;
  return (
    <>
      {/* fundo borrado e escurecido */}
      {isVideo ? (
        <OffthreadVideo src={src} muted trimBefore={trimBefore} style={{ position: "absolute", inset: -30, width: "calc(100% + 60px)", height: "calc(100% + 60px)", objectFit: "cover", filter: "blur(22px) brightness(0.5)", transform: flip }} />
      ) : (
        <Img src={src} style={{ position: "absolute", inset: -30, width: "calc(100% + 60px)", height: "calc(100% + 60px)", objectFit: "cover", filter: "blur(22px) brightness(0.5)" }} />
      )}
      {/* mídia inteira (sem cortar) */}
      {isVideo ? (
        <OffthreadVideo src={src} muted={muted} trimBefore={trimBefore} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: flip, filter: fgFilter }} />
      ) : (
        <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      )}
    </>
  );
};

// Overlay da pista 3D com fade in/out (frame relativo à Sequence)
const TrackOverlay: React.FC<{ width: number; height: number; gp: GPInfo; trackPath: string; durFrames: number }> = ({ width, height, gp, trackPath, durFrames }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, 12, durFrames - 12, durFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      <TrackMap3D width={width} height={height} gp={gp} trackPath={trackPath} />
    </div>
  );
};

// Painel pequeno superior: classificação (base) + pista 3D entrando de tempos em tempos
const SmallPanelContent: React.FC<{ width: number; height: number; standings?: Standing[]; fixedImageSrc?: string; f1LogoSrc?: string; gp?: GPInfo; trackPath?: string }> = ({ width, height, standings, fixedImageSrc, f1LogoSrc, gp, trackPath }) => {
  const { fps } = useVideoConfig();
  const CYCLE = Math.round(40 * fps);  // a cada 40s
  const TRACK_AT = Math.round(24 * fps); // pista entra aos 24s do ciclo
  const TRACK_DUR = Math.round(10 * fps); // fica 10s
  return (
    <>
      {standings && standings.length > 0 ? (
        <DriverStandings width={width} height={height} standings={standings} f1LogoSrc={f1LogoSrc} />
      ) : fixedImageSrc ? (
        <Img src={fixedImageSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      {gp && trackPath ? (
        <Loop durationInFrames={CYCLE}>
          <Sequence from={TRACK_AT} durationInFrames={TRACK_DUR} layout="none">
            <TrackOverlay width={width} height={height} gp={gp} trackPath={trackPath} durFrames={TRACK_DUR} />
          </Sequence>
        </Loop>
      ) : null}
    </>
  );
};

export const F1Broadcast: React.FC<F1BroadcastProps> = ({
  bigSegments,
  fixedImageSrc,
  standings = DEFAULT_STANDINGS,
  pipVideoSrc,
  programLogoSrc = staticFile("logo-programa.png"),
  f1LogoSrc = staticFile("logo-f1-aqui.png"),
  backgroundSrc = staticFile("fundo-tela.png"),
  driverLeft = { name: "Leclerc", photoSrc: staticFile("leclerc-aqui-foto.png") },
  driverRight = { name: "Hamilton", photoSrc: staticFile("hamilton-aqui.png") },
  headline = "",
  subheadline = "",
  headlines,
  headlineRotateSec = 60,
  durationSec,
  showEndExpand = true,
  fullscreenMode = false,
  audioSrc,
  nextGP,
  trackPath,
  showSubscribe = false,
  subscribeCycleSec = 30,
  bigAudio = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // manchete ativa no frame (rotaciona se vier a lista `headlines`, senão fixa)
  const hl = pickHeadline(
    headlines && headlines.length ? headlines : [{ headline, subheadline }],
    frame, fps, headlineRotateSec,
  );

  // resolve cor/logo das equipes a partir do constructorId (classificação automática)
  const resolvedStandings = resolveStandings(standings);

  // ── Layout (1920x1080) ──────────────────────────────────────────
  const PAD = 22;
  const TOP_H = 104;
  const BOT_H = 132;
  const GRID_SHRINK = 90; // grades curtas e centralizadas
  const areaTop = PAD + TOP_H + PAD;
  const areaBottom = 1080 - PAD - BOT_H - PAD;
  const gridTop = areaTop + GRID_SHRINK / 2;
  const gridH = (areaBottom - areaTop) - GRID_SHRINK;
  const gridBottom = gridTop + gridH;
  const GAP = 16;

  // Tarjas posicionadas JUNTO das grades (menos "distante")
  const INNER_GAP = 18;
  const topBarY = gridTop - INNER_GAP - TOP_H;     // tarja dos pilotos desce
  const botBarY = gridBottom + INNER_GAP;          // tarja de notícia sobe

  const bigW = Math.round((1920 - PAD * 2) * 0.72);
  const bigX = PAD;
  const rightX = bigX + bigW + GAP;
  const rightW = 1920 - PAD - rightX;
  const smallH = Math.round((gridH - GAP) / 2);

  // ── Final: nos últimos 4s o painel grande toma a largura toda e os 2 pequenos somem ──
  const totalFrames = Math.round(durationSec * fps);
  const expandStart = totalFrames - 4 * fps;
  const expand = showEndExpand
    ? interpolate(frame, [expandStart, expandStart + 0.7 * fps], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const fullGridW = 1920 - PAD * 2;
  const bigWAnim = bigW + (fullGridW - bigW) * expand;        // grande expande
  const smallOpacity = 1 - expand;                            // pequenos somem
  const smallXAnim = rightX + expand * (rightW + 80);         // e deslizam pra direita

  const isImg = (s?: string) => !!s && /\.(jpe?g|png|webp|gif|bmp|avif)(\?|$)/i.test(s);

  return (
    <div style={{ width: 1920, height: 1080, background: BG_DARK, position: "relative", overflow: "hidden" }}>
      {backgroundSrc ? (
        /* imagem de fundo */
        <Img src={backgroundSrc} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        /* fallback: textura "lousa fosca" do código */
        <>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(1000px 520px at 50% 0%, rgba(212,0,0,0.16), transparent 60%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(1100px 700px at 50% 40%, rgba(255,255,255,0.06), transparent 60%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(140% 120% at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)" }} />
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.12, mixBlendMode: "overlay", pointerEvents: "none" }}>
            <filter id="f1-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#f1-grain)" />
          </svg>
        </>
      )}

      {/* ── TOPO: 2 pilotos ───────────────────────────────────── */}
      <div style={{ position: "absolute", left: PAD, top: topBarY, width: 1920 - PAD * 2, height: TOP_H, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
        <DriverCard driver={driverLeft} />
        {f1LogoSrc ? (
          <Img src={f1LogoSrc} style={{ height: 80, objectFit: "contain", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 3, height: 56, background: FERRARI_RED, borderRadius: 2 }} />
        )}
        <DriverCard driver={driverRight} flip />
      </div>

      {/* ── GRADE GRANDE (esquerda): slideshow (expande no fim) ── */}
      <PanelFrame x={bigX} y={gridTop} w={bigWAnim} h={gridH} label="GRADE GRANDE — vídeos/imagens F1">
        {bigSegments.length > 0 ? (
          <>
            {bigSegments.map((seg, i) => {
              const start = bigSegments.slice(0, i).reduce((a, s) => a + Math.round(s.durationSec * fps), 0);
              const dur = Math.round(seg.durationSec * fps);
              return (
                <Sequence key={i} from={start} durationInFrames={dur} layout="none">
                  {/* fx (espelho+blur) só nos vídeos de fundo (normal/narração); no modo
                      vídeo grande (bigAudio) o vídeo é o destaque → deixa limpo */}
                  <BlurFillMedia src={seg.src} isVideo={seg.type === "video"} muted={!bigAudio} trimBefore={seg.startSec ? Math.round(seg.startSec * fps) : undefined} fx={!bigAudio} />
                </Sequence>
              );
            })}
          </>
        ) : null}
      </PanelFrame>

      {/* ── Painéis pequenos (cima = classificação/pista, baixo = PiP/pista) ── */}
      <>
        <PanelFrame x={smallXAnim} y={gridTop} w={rightW} h={smallH} opacity={smallOpacity}>
          {fullscreenMode ? (
            // narração: classificação fixa em cima
            <DriverStandings width={rightW} height={smallH} standings={resolvedStandings} f1LogoSrc={f1LogoSrc} />
          ) : (
            // normal: intercala classificação ↔ próximo GP
            <SmallPanelContent width={rightW} height={smallH} standings={resolvedStandings} fixedImageSrc={fixedImageSrc} f1LogoSrc={f1LogoSrc} gp={nextGP} trackPath={trackPath} />
          )}
        </PanelFrame>

        <PanelFrame x={smallXAnim} y={gridTop + smallH + GAP} w={rightW} h={smallH} opacity={smallOpacity}>
          {fullscreenMode ? (
            // narração: sem PiP → pista do próximo GP fixa embaixo
            nextGP && trackPath ? (
              <TrackMap3D width={rightW} height={smallH} gp={nextGP} trackPath={trackPath} />
            ) : undefined
          ) : pipVideoSrc ? (
            <BlurFillMedia src={pipVideoSrc} isVideo={!isImg(pipVideoSrc)} muted={false} />
          ) : undefined}
        </PanelFrame>
      </>

      {/* narração (áudios concatenados) */}
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* ── RODAPÉ: manchete ───────────────────────────────────── */}
      <div style={{ position: "absolute", left: PAD, top: botBarY, width: 1920 - PAD * 2, height: BOT_H, background: BAR_BG, borderRadius: 0, display: "flex", alignItems: "center", overflow: "hidden" }}>
        {/* logo do programa (fundo próprio) */}
        <div style={{ width: 180, height: "100%", background: LOGO_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: "12px 16px" }}>
          {programLogoSrc ? (
            <Img src={programLogoSrc} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontFamily: HEAD_FONT, fontSize: 30, color: FERRARI_YELLOW, lineHeight: 0.95, textAlign: "center" }}>MONDO<br />FERRARI</span>
          )}
        </div>
        {/* manchete */}
        <div style={{ flex: 1, padding: "0 30px", minWidth: 0, opacity: hl.opacity }}>
          <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 46, color: "#fff", letterSpacing: 0.2, lineHeight: 1.0, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {hl.headline}
          </div>
          <div style={{ fontFamily: SUB_FONT, fontWeight: 700, fontSize: 23, color: "#c9c9cf", marginTop: 3, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {hl.subheadline}
          </div>
        </div>
      </div>

      {/* ── Barra de inscrição (mãozinha) em ciclo — por cima de tudo ── */}
      {showSubscribe ? (
        <SubscribeBar
          channelName="Mondo Ferrari F1"
          channelHandle="@MondoFerrariF1"
          avatarSrc={staticFile("logo-estranho.png")}
          cycleSec={subscribeCycleSec}
        />
      ) : null}
    </div>
  );
};
