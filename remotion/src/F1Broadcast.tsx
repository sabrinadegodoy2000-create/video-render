import { useCurrentFrame, useVideoConfig, Img, OffthreadVideo, Audio, interpolate, Sequence, staticFile } from "remotion";
import { DriverStandings, Standing } from "./DriverStandings";
import { TrackMap3D, GPInfo } from "./TrackMap3D";
import { SubscribeBar } from "./SubscribePopup";
import { pickHeadline, hasHeadlineContent, HeadlineItem } from "./rotatingHeadline";
import { PhotoPunchOverlays, PhotoOverlayItem } from "./PhotoPunchOverlay";
import { resolveStandings } from "./f1TeamStyles";

export type F1Segment = { src: string; type: "photo" | "video"; durationSec: number; startSec?: number };

export type Driver = { name: string; photoSrc?: string };

export type F1BroadcastProps = {
  bigSegments: F1Segment[];   // vídeo/fotos full-bleed (preenche o "buraco" do L)
  photoOverlays?: PhotoOverlayItem[]; // fotos punch-in por cima (modo vídeo de fundo contínuo)
  standings?: Standing[];     // classificação — faixa vertical direita
  programLogoSrc?: string;    // logo do programa — topo da faixa vertical
  backgroundSrc?: string;     // fallback: só aparece se bigSegments vier vazio
  headline?: string;          // manchete (italiano) — vazio = sem texto
  subheadline?: string;       // subtítulo
  headlines?: HeadlineItem[]; // várias manchetes → intercala a cada headlineRotateSec
  headlineRotateSec?: number; // intervalo da troca de manchete (default 60s)
  durationSec: number;
  showEndExpand?: boolean;    // flourish final: painéis somem, vídeo fica full-bleed puro
  audioSrc?: string;          // narração (áudios já concatenados)
  nextGP?: GPInfo;            // próximo GP — base da faixa vertical
  trackPath?: string;         // traçado SVG do circuito
  showSubscribe?: boolean;    // barra de inscrição (mãozinha clicando) em ciclo
  subscribeCycleSec?: number; // de quanto em quanto tempo a barra reaparece (default 30)
  bigAudio?: boolean;         // toca o áudio do vídeo de fundo (modo "vídeo grande")
  showCopyrightWatermark?: boolean; // liga marca d'água (grade) + aviso central — default false, resolve o logo internamente
  watermarkSrc?: string;      // imagem da marca d'água (default = logo do programa, se showCopyrightWatermark)
  watermarkOpacity?: number;  // opacidade de cada marca (default 0.3)
  watermarkTileSize?: number; // tamanho de cada "ladrilho" em px (default 220)
  watermarkRotateDeg?: number; // rotação da grade (default -28)
  centerNoticeText?: string;   // aviso centralizado por cima da marca d'água (default = frase de copyright, se showCopyrightWatermark)
  watermarkWindows?: { startSec: number; durationSec: number }[]; // se vier, marca d'água+aviso só aparecem nessas janelas (senão, sempre visível)
  // Legado (layout antigo, não usados neste layout — mantidos só por compat de tipos):
  fixedImageSrc?: string;
  pipVideoSrc?: string;
  driverLeft?: Driver;
  driverRight?: Driver;
  fullscreenMode?: boolean;
};

// Conteúdo fixo (mocado) — classificação e assets de marca
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

export const F1_BROADCAST_DURATION = 30 * 30;

// ── Paleta Ferrari ────────────────────────────────────────────────
const FERRARI_YELLOW = "#FFE000";
const BG_DARK = "#1a1a1d"; // grafite fosco (não preto puro)
// preto puro "apaga" — em vez disso, um preto com DNA vermelho: gradiente quente
// + brilho sutil, ecoando o spotlight que já existe no vídeo de fundo.
const PANEL_BG = "#100809"; // tom sólido de referência (fallback + alvo do esmaecimento do vídeo)
const PANEL_BG_SIDE = `radial-gradient(60% 42% at 50% 0%, rgba(212,0,0,0.24), transparent 72%), linear-gradient(180deg, #1a0b0c 0%, ${PANEL_BG} 55%, #0c0506 100%)`;
const PANEL_BG_BOTTOM = `linear-gradient(90deg, rgba(212,0,0,0.12), transparent 40%), linear-gradient(180deg, #170a0b 0%, ${PANEL_BG} 100%)`;
const FONT = "'Neue Haas Grotesk Display Pro', 'Helvetica Neue', Arial, sans-serif";
const HEAD_FONT = FONT;
const SUB_FONT = FONT;

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

export const F1Broadcast: React.FC<F1BroadcastProps> = ({
  bigSegments,
  photoOverlays,
  standings = DEFAULT_STANDINGS,
  programLogoSrc = staticFile("logo-programa.png"),
  backgroundSrc = staticFile("fundo-tela.png"),
  headline = "",
  subheadline = "",
  headlines,
  headlineRotateSec = 60,
  durationSec,
  showEndExpand = true,
  audioSrc,
  nextGP,
  trackPath,
  showSubscribe = false,
  subscribeCycleSec = 30,
  bigAudio = false,
  showCopyrightWatermark = false,
  watermarkSrc,
  watermarkOpacity = 0.3,
  watermarkTileSize = 220,
  watermarkRotateDeg = -28,
  centerNoticeText,
  watermarkWindows,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // resolve o logo default via staticFile() AQUI DENTRO (precisa do runtime do Remotion —
  // um prep script em Node não consegue montar essa URL, o base muda por bundle/render)
  const effectiveWatermarkSrc = showCopyrightWatermark ? (watermarkSrc || staticFile("logo-programa.png")) : watermarkSrc;
  const effectiveNoticeText = showCopyrightWatermark ? (centerNoticeText || "Contenuto protetto da diritti d'autore") : centerNoticeText;
  // sem watermarkWindows = sempre visível (comportamento do teste local); com janelas, só aparece dentro delas
  const t = frame / fps;
  const inWatermarkWindow = !watermarkWindows || watermarkWindows.some((w) => t >= w.startSec && t < w.startSec + w.durationSec);

  // manchete ativa no frame (rotaciona se vier a lista `headlines`, senão fixa)
  const headlineList = headlines && headlines.length ? headlines : [{ headline, subheadline }];
  const hl = pickHeadline(headlineList, frame, fps, headlineRotateSec);
  // sem manchete em NENHUM ponto do vídeo → não reserva a faixa horizontal, vídeo toma tudo
  const hasHeadline = hasHeadlineContent(headlineList);

  // resolve cor/logo das equipes a partir do constructorId (classificação automática)
  const resolvedStandings = resolveStandings(standings);

  // ── Layout "L invertido" (1920x1080): vídeo full-bleed no buraco do L ──
  // faixa vertical (direita, altura toda) + faixa horizontal (rodapé, até a vertical começar)
  const SIDE_W = 470;   // faixa vertical: logo + classificação + próximo GP
  const BOTTOM_H = hasHeadline ? 150 : 0; // faixa horizontal: manchete (some se não houver)
  const FADE = 130;     // esmaecimento do vídeo pro painel — continuidade, sem linha de corte
  const LOGO_H = 156;   // bloco do logo, topo da faixa vertical
  const GP_H = 300;     // bloco do próximo GP, base da faixa vertical

  const mediaW = 1920 - SIDE_W;
  const mediaH = 1080 - BOTTOM_H;

  // ── Flourish final: painéis somem nos últimos 4s, vídeo fica full-bleed puro ──
  const totalFrames = Math.round(durationSec * fps);
  const expandStart = totalFrames - 4 * fps;
  const expand = showEndExpand
    ? interpolate(frame, [expandStart, expandStart + 0.7 * fps], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const panelOpacity = 1 - expand;
  const sideXAnim = 1920 - SIDE_W + expand * (SIDE_W + 40);   // faixa vertical desliza pra fora
  const botYAnim = 1080 - BOTTOM_H + expand * (BOTTOM_H + 40); // faixa horizontal desliza pra baixo

  return (
    <div style={{ width: 1920, height: 1080, background: BG_DARK, position: "relative", overflow: "hidden" }}>
      {/* ── VÍDEO/FOTOS: full-bleed no "buraco" do L (topo-esquerda) ── */}
      <div style={{ position: "absolute", left: 0, top: 0, width: mediaW, height: mediaH, overflow: "hidden", background: PANEL_BG }}>
        {bigSegments.length > 0 ? (
          <>
            {bigSegments.map((seg, i) => {
              const start = bigSegments.slice(0, i).reduce((a, s) => a + Math.round(s.durationSec * fps), 0);
              const dur = Math.round(seg.durationSec * fps);
              return (
                <Sequence key={i} from={start} durationInFrames={dur} layout="none">
                  {/* fx (espelho+blur) descaracteriza material reaproveitado; no modo
                      vídeo grande (bigAudio) o vídeo é o destaque → deixa limpo */}
                  <BlurFillMedia src={seg.src} isVideo={seg.type === "video"} muted={!bigAudio} trimBefore={seg.startSec ? Math.round(seg.startSec * fps) : undefined} fx={!bigAudio} />
                </Sequence>
              );
            })}
            {/* fotos punch-in em tela cheia por cima do vídeo de fundo contínuo */}
            <PhotoPunchOverlays overlays={photoOverlays} />
          </>
        ) : backgroundSrc ? (
          <Img src={backgroundSrc} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
        {/* marca d'água em grade repetida por cima do vídeo/fotos — inset negativo +
            rotação garantem cobertura total até nos cantos; o overflow:hidden do
            container pai corta o excesso */}
        {effectiveWatermarkSrc && inWatermarkWindow ? (
          <div
            style={{
              position: "absolute", inset: "-30%", pointerEvents: "none",
              backgroundImage: `url(${effectiveWatermarkSrc})`,
              backgroundRepeat: "repeat",
              backgroundSize: `${watermarkTileSize}px`,
              opacity: watermarkOpacity,
              transform: `rotate(${watermarkRotateDeg}deg)`,
              transformOrigin: "center",
            }}
          />
        ) : null}
        {/* aviso centralizado — por cima da marca d'água */}
        {effectiveNoticeText && inWatermarkWindow ? (
          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 6%",
            }}
          >
            <span
              style={{
                fontFamily: HEAD_FONT, fontWeight: 800, fontSize: 44,
                color: "#fff", textAlign: "center", lineHeight: 1.15,
                textTransform: "uppercase", letterSpacing: 1,
                background: "#D40000",
                padding: "30px 32px",
                transform: "rotate(-12deg)",
              }}
            >
              {effectiveNoticeText}
            </span>
          </div>
        ) : null}
        {/* esmaece pro tom do painel nas bordas direita/inferior — sem linha de corte,
            o vídeo "flui" pra dentro dos painéis em vez de terminar num degrau seco */}
        <div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage:
              `linear-gradient(90deg, transparent calc(100% - ${FADE}px), ${PANEL_BG} 100%),` +
              `linear-gradient(180deg, transparent calc(100% - ${FADE}px), ${PANEL_BG} 100%)`,
          }}
        />
      </div>

      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* ── FAIXA VERTICAL (direita, altura toda): logo → classificação → próximo GP ── */}
      <div style={{ position: "absolute", left: sideXAnim, top: 0, width: SIDE_W, height: 1080, background: PANEL_BG_SIDE, display: "flex", flexDirection: "column", overflow: "hidden", opacity: panelOpacity }}>

        {/* logo do programa — só um traço curto por baixo (não uma parede full-width) */}
        <div style={{ height: LOGO_H, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "22px 28px 14px" }}>
          {programLogoSrc ? (
            <Img src={programLogoSrc} style={{ maxWidth: "100%", maxHeight: "82%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontFamily: HEAD_FONT, fontSize: 34, color: FERRARI_YELLOW, lineHeight: 0.95, textAlign: "center" }}>MONDO<br />FERRARI</span>
          )}
          <div style={{ width: 64, height: 3, marginTop: 12, background: FERRARI_YELLOW }} />
        </div>

        {/* classificação — preenche o espaço que sobra */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DriverStandings width={SIDE_W} height={1080 - LOGO_H - GP_H} standings={resolvedStandings} />
        </div>

        {/* próximo GP — base da faixa */}
        {nextGP && trackPath ? (
          <div style={{ height: GP_H, flexShrink: 0 }}>
            <TrackMap3D width={SIDE_W} height={GP_H} gp={nextGP} trackPath={trackPath} stacked />
          </div>
        ) : null}
      </div>

      {/* ── FAIXA HORIZONTAL (rodapé, até a faixa vertical começar): manchete (só existe se houver) ── */}
      {hasHeadline ? (
        <div style={{ position: "absolute", left: 0, top: botYAnim, width: mediaW, height: BOTTOM_H, background: PANEL_BG_BOTTOM, display: "flex", alignItems: "center", overflow: "hidden", opacity: panelOpacity }}>
          <div style={{ flex: 1, padding: "0 44px", minWidth: 0, opacity: hl.opacity }}>
            <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 48, color: "#fff", letterSpacing: 0.2, lineHeight: 1.0, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {hl.headline}
            </div>
            <div style={{ fontFamily: SUB_FONT, fontWeight: 700, fontSize: 24, color: "#c9c9cf", marginTop: 5, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {hl.subheadline}
            </div>
          </div>
        </div>
      ) : null}

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
