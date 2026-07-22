import { useCurrentFrame, useVideoConfig, Img, OffthreadVideo, Audio, Sequence, interpolate, staticFile } from "remotion";
import { DriverStandings, Standing } from "./DriverStandings";
import { TrackMap3D, GPInfo } from "./TrackMap3D";
import { SubscribeBar } from "./SubscribePopup";
import { pickHeadline, hasHeadlineContent, HeadlineItem } from "./rotatingHeadline";
import { PhotoPunchOverlays, PhotoOverlayItem } from "./PhotoPunchOverlay";
import { resolveStandings } from "./f1TeamStyles";

export type IMSegment = { src: string; type: "photo" | "video"; durationSec: number; startSec?: number };

export type IlMurettoF1BroadcastProps = {
  bigSegments: IMSegment[];    // vídeo/fotos no quadro emoldurado (largura toda)
  photoOverlays?: PhotoOverlayItem[]; // fotos punch-in por cima (modo vídeo de fundo contínuo)
  standings?: Standing[];      // classificação — janela flutuante (todas as equipes, sem viés)
  programLogoSrc?: string;     // logo do canal — rodapé, ao lado da manchete
  backgroundSrc?: string;      // fallback: só aparece se bigSegments vier vazio
  headline?: string;           // manchete (uma só, fixa)
  subheadline?: string;        // subtítulo
  headlines?: HeadlineItem[];  // várias manchetes → intercala a cada headlineRotateSec
  headlineRotateSec?: number;  // intervalo da troca de manchete (default 60s)
  durationSec: number;
  audioSrc?: string;           // narrazione (áudios já concatenados)
  bigAudio?: boolean;          // toca o áudio do vídeo de fundo em vez da narração
  nextGP?: GPInfo;             // próximo GP — janela flutuante
  trackPath?: string;          // traçado SVG do circuito
  showSubscribe?: boolean;     // barra de inscrição em ciclo
  subscribeCycleSec?: number;  // de quanto em quanto tempo a barra reaparece (default 30)
  showCopyrightWatermark?: boolean; // liga marca d'água (grade) + aviso central — default false, resolve o logo internamente
  watermarkSrc?: string;       // imagem da marca d'água (default = logo do canal, se showCopyrightWatermark)
  watermarkOpacity?: number;   // opacidade de cada marca (default 0.18)
  watermarkTileSize?: number;  // tamanho de cada "ladrilho" em px (default 220)
  watermarkRotateDeg?: number; // rotação da grade (default -28)
  centerNoticeText?: string;   // aviso centralizado por cima da marca d'água (default = frase de copyright, se showCopyrightWatermark)
  watermarkWindows?: { startSec: number; durationSec: number }[]; // se vier, marca d'água+aviso só aparecem nessas janelas (senão, sempre visível)
};

export const IL_MURETTO_F1_DURATION = 30 * 30;

// ── Paleta Il Muretto F1 — segue o design system Apple (DESIGN.md do usuário) ──
// Canvas claro, azul decorativo (Signal Blue) pra selos/ícones, hierarquia por cor
// de superfície + bordas finas (não por sombra — a única sombra do sistema "agarra"
// a mídia no canvas, tipo foto de produto). Cantos suaves (8px), nada de grid
// técnico/cantoneiras HUD. Botão de inscrever fica vermelho (padrão do canal).
const SIGNAL_BLUE = "#2997ff";  // azul decorativo (selos, ícones, traçado do circuito)
const CARBON = "#1d1d1f";       // texto primário
const ASH = "#707070";          // texto secundário
const FROST = "#f5f5f7";        // canvas
const ICE = "#f4f8fb";          // superfície elevada (painéis)
const HAIRLINE = "#d2d2d7";     // borda fina
const RADIUS = 8;               // cards/imagens — único valor de raio do sistema (fora de pills)
const SHADOW_XL = "3px 5px 30px rgba(0,0,0,0.22)"; // só na mídia, nunca em cards/painéis
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Mídia com blur fill: fundo borrado (cover) + mídia inteira na frente (contain).
const BlurFillMedia: React.FC<{ src: string; isVideo: boolean; muted?: boolean; trimBefore?: number }> = ({ src, isVideo, muted = true, trimBefore }) => (
  <>
    {isVideo ? (
      <OffthreadVideo src={src} muted trimBefore={trimBefore} style={{ position: "absolute", inset: -30, width: "calc(100% + 60px)", height: "calc(100% + 60px)", objectFit: "cover", filter: "blur(22px) brightness(0.5)" }} />
    ) : (
      <Img src={src} style={{ position: "absolute", inset: -30, width: "calc(100% + 60px)", height: "calc(100% + 60px)", objectFit: "cover", filter: "blur(22px) brightness(0.5)" }} />
    )}
    {isVideo ? (
      <OffthreadVideo src={src} muted={muted} trimBefore={trimBefore} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    ) : (
      <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    )}
  </>
);

// Janela flutuante no canto inferior direito da mídia — intercala classificação ↔
// próximo GP a cada `cycleSec` (com um fade curto na troca). Superfície Ice + borda
// fina (hairline) — sem sombra, seguindo a filosofia de elevação do design system.
const StrategyWindow: React.FC<{
  w: number; h: number; standings: Standing[]; nextGP?: GPInfo; trackPath?: string; cycleSec: number;
}> = ({ w, h, standings, nextGP, trackPath, cycleSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hasGP = !!(nextGP && trackPath);
  const cycle = Math.max(1, Math.round(cycleSec * fps));
  const local = frame % cycle;
  const showGP = hasGP && Math.floor(frame / cycle) % 2 === 1;
  const fade = Math.round(0.4 * fps);
  const opacity = interpolate(local, [0, fade], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", width: w, height: h, background: ICE, border: `1px solid ${HAIRLINE}`, borderRadius: RADIUS, overflow: "hidden", opacity }}>
      {showGP ? (
        <TrackMap3D width={w} height={h} gp={nextGP!} trackPath={trackPath!} accentColor={SIGNAL_BLUE} headingFont={FONT} headingWeight={600} bodyFont={FONT} panelBg="transparent" textColor={CARBON} mutedTextColor={ASH} />
      ) : (
        <DriverStandings width={w} height={h} standings={standings} accentColor={SIGNAL_BLUE} visibleRows={Math.max(3, Math.round(h / 84))} headingFont={FONT} headingWeight={600} bodyFont={FONT} showHeader={false} showLogo={false} />
      )}
    </div>
  );
};

export const IlMurettoF1Broadcast: React.FC<IlMurettoF1BroadcastProps> = ({
  bigSegments,
  photoOverlays,
  standings = [],
  programLogoSrc = staticFile("il-muretto-f1-logo.png"),
  backgroundSrc,
  headline = "",
  subheadline = "",
  headlines,
  headlineRotateSec = 60,
  durationSec,
  audioSrc,
  bigAudio = false,
  nextGP,
  trackPath,
  showSubscribe = false,
  subscribeCycleSec = 30,
  showCopyrightWatermark = false,
  watermarkSrc,
  watermarkOpacity = 0.18,
  watermarkTileSize = 220,
  watermarkRotateDeg = -28,
  centerNoticeText,
  watermarkWindows,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // resolve o logo default via staticFile() AQUI DENTRO (precisa do runtime do Remotion —
  // um prep script em Node não consegue montar essa URL, o base muda por bundle/render)
  const effectiveWatermarkSrc = showCopyrightWatermark ? (watermarkSrc || staticFile("il-muretto-f1-logo.png")) : watermarkSrc;
  const effectiveNoticeText = showCopyrightWatermark ? (centerNoticeText || "Contenuto protetto da diritti d'autore") : centerNoticeText;
  // sem watermarkWindows = sempre visível; com janelas, só aparece dentro delas
  const tSec = frame / fps;
  const inWatermarkWindow = !watermarkWindows || watermarkWindows.some((w) => tSec >= w.startSec && tSec < w.startSec + w.durationSec);

  // manchete ativa no frame (rotaciona se vier a lista `headlines`, senão fixa)
  const headlineList = headlines && headlines.length ? headlines : [{ headline, subheadline }];
  const hl = pickHeadline(headlineList, frame, fps, headlineRotateSec);
  // sem manchete em NENHUM ponto do vídeo → não reserva rodapé, o quadro toma o espaço
  const hasHeadline = hasHeadlineContent(headlineList);

  // resolve cor/logo das equipes a partir do constructorId (classificação automática)
  const resolvedStandings = resolveStandings(standings);

  // ── Layout: quadro de vídeo emoldurado (largura toda) + janela flutuante ──
  // (classificação ↔ próximo GP, intercalando a cada 40s) + rodapé de manchete.
  const PAD = 26;
  const GAP = 18;
  const BOT_H = hasHeadline ? 128 : 0; // rodapé de manchete (some se não houver)

  const gridTop = PAD;
  const gridBottom = 1080 - PAD - (hasHeadline ? GAP + BOT_H : 0);
  const gridH = gridBottom - gridTop;
  const bigW = 1920 - PAD * 2; // quadro de vídeo toma a largura toda
  const bigX = PAD;
  const botBarY = gridBottom + GAP;

  // janela flutuante: ≥30% da altura do quadro, ancorada no canto inferior direito
  const WIN_MARGIN = 24;
  const winH = Math.round(gridH * 0.34);
  const winW = Math.round(bigW * 0.40);
  const winX = bigX + bigW - winW - WIN_MARGIN;
  const winY = gridTop + gridH - winH - WIN_MARGIN;

  return (
    <div style={{ width: 1920, height: 1080, background: FROST, position: "relative", overflow: "hidden" }}>
      {/* ── QUADRO DE VÍDEO: cantos suaves + a única sombra do sistema (mídia = "foto de produto") ── */}
      <div style={{ position: "absolute", left: bigX, top: gridTop, width: bigW, height: gridH, overflow: "hidden", background: CARBON, borderRadius: RADIUS, boxShadow: SHADOW_XL }}>
        {bigSegments.length > 0 ? (
          <>
            {bigSegments.map((seg, i) => {
              const start = bigSegments.slice(0, i).reduce((a, s) => a + Math.round(s.durationSec * fps), 0);
              const dur = Math.round(seg.durationSec * fps);
              return (
                <Sequence key={i} from={start} durationInFrames={dur} layout="none">
                  <BlurFillMedia src={seg.src} isVideo={seg.type === "video"} muted={!bigAudio} trimBefore={seg.startSec ? Math.round(seg.startSec * fps) : undefined} />
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
              filter: "brightness(0) invert(1)",
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
                fontFamily: FONT, fontWeight: 800, fontSize: 44,
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
      </div>

      {/* ── JANELA FLUTUANTE: classificação ↔ próximo GP, intercalando a cada 40s ── */}
      <div style={{ position: "absolute", left: winX, top: winY }}>
        <StrategyWindow w={winW} h={winH} standings={resolvedStandings} nextGP={nextGP} trackPath={trackPath} cycleSec={40} />
      </div>

      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* ── RODAPÉ: logo + manchete (só existe se houver manchete) ── */}
      {hasHeadline ? (
        <div style={{ position: "absolute", left: PAD, top: botBarY, width: 1920 - PAD * 2, height: BOT_H, background: ICE, border: `1px solid ${HAIRLINE}`, borderRadius: RADIUS, display: "flex", alignItems: "center", overflow: "hidden", gap: 22, padding: "0 28px" }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: `1px solid ${HAIRLINE}` }}>
            {programLogoSrc ? (
              <Img src={programLogoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : null}
          </div>
          <div style={{ flex: 1, minWidth: 0, opacity: hl.opacity }}>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: ASH, letterSpacing: "-0.264px", textTransform: "uppercase", marginBottom: 4 }}>
              Aggiornamento
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 40, color: CARBON, letterSpacing: "0.44px", lineHeight: 1.14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {hl.headline}
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 21, color: ASH, marginTop: 2, letterSpacing: "-0.105px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {hl.subheadline}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Barra de inscrição (mãozinha) em ciclo — por cima de tudo ── */}
      {showSubscribe ? (
        <SubscribeBar
          channelName="Il Muretto F1"
          channelHandle="@ilmurettof1"
          avatarSrc={staticFile("il-muretto-f1-logo.png")}
          cycleSec={subscribeCycleSec}
          fontFamily={FONT}
          dock="top-right"
          scale={0.8}
        />
      ) : null}
    </div>
  );
};
