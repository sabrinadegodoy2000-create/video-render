import { useCurrentFrame, useVideoConfig, Img, OffthreadVideo, Audio, Sequence, staticFile } from "remotion";
import { SubscribeBar } from "./SubscribePopup";
import { pickHeadline, hasHeadlineContent, HeadlineItem } from "./rotatingHeadline";
import { PhotoPunchOverlays, PhotoOverlayItem } from "./PhotoPunchOverlay";

export type PDHSegment = { src: string; type: "photo" | "video"; durationSec: number; startSec?: number };

export type PapoDeHojeBroadcastProps = {
  bigSegments: PDHSegment[];   // slideshow do quadro grande (tela toda)
  photoOverlays?: PhotoOverlayItem[]; // fotos punch-in por cima (modo vídeo de fundo contínuo)
  programLogoSrc?: string;    // logo do programa (rodapé, esquerda)
  backgroundSrc?: string;     // imagem de fundo (atrás do quadro grande, nas bordas)
  headline?: string;          // manchete (uma só, fixa)
  subheadline?: string;       // subtítulo
  headlines?: HeadlineItem[]; // várias manchetes → intercala a cada headlineRotateSec
  headlineRotateSec?: number; // intervalo da troca de manchete (default 60s)
  durationSec: number;
  audioSrc?: string;          // narração (áudio concatenado), opcional
  bigAudio?: boolean;         // toca o áudio do(s) vídeo(s) do quadro grande em vez da narração
  showSubscribe?: boolean;    // barra de inscrição (mãozinha) em ciclo
  subscribeCycleSec?: number; // de quanto em quanto tempo a barra reaparece (default 30)
};

export const PAPO_DE_HOJE_DURATION = 30 * 30;

// ── Paleta Papo de Hoje ───────────────────────────────────────────
const ACCENT = "#FFD400";
const BG_DARK = "#1a1a1d";
const PANEL_BG = "#000000";
const FONT = "'Neue Haas Grotesk Display Pro', 'Helvetica Neue', Arial, sans-serif";
const LOGO_BG = "#21211D";
const BAR_BG = "#262722";

// Mídia com blur fill: fundo borrado (cover) + mídia inteira na frente (contain).
// trimBefore (frames) toca o vídeo a partir de um ponto — permite fatiar um vídeo
// longo em trechos de 3s diferentes sem recortar o arquivo.
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

export const PapoDeHojeBroadcast: React.FC<PapoDeHojeBroadcastProps> = ({
  bigSegments,
  photoOverlays,
  programLogoSrc = staticFile("papo-de-hoje-logo.png"),
  backgroundSrc,
  headline = "",
  subheadline = "",
  headlines,
  headlineRotateSec = 60,
  durationSec,
  audioSrc,
  bigAudio = false,
  showSubscribe = false,
  subscribeCycleSec = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // manchete ativa no frame (rotaciona se vier a lista `headlines`, senão fixa)
  const headlineList = headlines && headlines.length ? headlines : [{ headline, subheadline }];
  const hl = pickHeadline(headlineList, frame, fps, headlineRotateSec);
  // sem manchete em NENHUM ponto do vídeo → não reserva rodapé, o quadro toma tudo
  const hasHeadline = hasHeadlineContent(headlineList);

  // ── Layout (1920x1080): quadro grande ocupa tudo, manchete no rodapé ──
  const PAD = 22;
  const BOT_H = hasHeadline ? 132 : 0;
  const gridTop = PAD;
  const gridBottom = 1080 - PAD - BOT_H - PAD;
  const gridH = gridBottom - gridTop;
  const gridW = 1920 - PAD * 2;
  const botBarY = gridBottom + PAD;

  return (
    <div style={{ width: 1920, height: 1080, background: BG_DARK, position: "relative", overflow: "hidden" }}>
      {backgroundSrc ? (
        <Img src={backgroundSrc} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(1000px 520px at 50% 0%, rgba(255,212,0,0.14), transparent 60%)` }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(140% 120% at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)" }} />
        </>
      )}

      {/* ── QUADRO GRANDE: slideshow ocupando a tela toda ── */}
      <div
        style={{
          position: "absolute",
          left: PAD, top: gridTop, width: gridW, height: gridH,
          overflow: "hidden",
          background: PANEL_BG,
          border: `3px solid ${ACCENT}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
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
      </div>

      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* ── RODAPÉ: manchete (só existe se houver manchete configurada) ── */}
      {hasHeadline ? (
        <div style={{ position: "absolute", left: PAD, top: botBarY, width: gridW, height: BOT_H, background: BAR_BG, display: "flex", alignItems: "center", overflow: "hidden" }}>
          <div style={{ width: 180, height: "100%", background: LOGO_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: "12px 16px" }}>
            {programLogoSrc ? (
              <Img src={programLogoSrc} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            ) : null}
          </div>
          <div style={{ flex: 1, padding: "0 30px", minWidth: 0, opacity: hl.opacity }}>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 46, color: "#fff", letterSpacing: 0.2, lineHeight: 1.0, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {hl.headline}
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 23, color: "#c9c9cf", marginTop: 3, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {hl.subheadline}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Barra de inscrição (mãozinha) em ciclo — mocada ── */}
      {showSubscribe ? (
        <SubscribeBar
          channelName="Papo de Hoje"
          channelHandle="@papodehojebr"
          avatarSrc={staticFile("papo-de-hoje-logo.png")}
          cycleSec={subscribeCycleSec}
          subscribeText="Inscrever-se"
          subscribedText="Inscrito"
        />
      ) : null}
    </div>
  );
};
