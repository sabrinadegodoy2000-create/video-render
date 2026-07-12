import { useCurrentFrame, useVideoConfig, Img, OffthreadVideo, Audio, Sequence, staticFile } from "remotion";
import { SubscribeBar } from "./SubscribePopup";
import { pickHeadline, HeadlineItem } from "./rotatingHeadline";
import { PhotoPunchOverlays, PhotoOverlayItem } from "./PhotoPunchOverlay";

export type FOSegment = { src: string; type: "photo" | "video"; durationSec: number; startSec?: number };

export type FutbolOcultoBroadcastProps = {
  bigSegments: FOSegment[];    // vídeo/fotos em tela cheia (full-bleed)
  photoOverlays?: PhotoOverlayItem[]; // fotos punch-in por cima (modo vídeo de fundo contínuo)
  programLogoSrc?: string;     // logo do canal (badge circular, sobre o vídeo)
  headline?: string;           // manchete (uma só, fixa)
  subheadline?: string;        // subtítulo
  headlines?: HeadlineItem[];  // várias manchetes → intercala a cada headlineRotateSec
  headlineRotateSec?: number;  // intervalo da troca de manchete (default 60s)
  durationSec: number;
  audioSrc?: string;           // narración (áudio concatenado), opcional
  bigAudio?: boolean;          // toca o áudio do(s) vídeo(s) do quadro em vez da narração
  showSubscribe?: boolean;     // barra de inscrição em ciclo
  subscribeCycleSec?: number;  // de quanto em quanto tempo a barra reaparece (default 30)
};

export const FUTBOL_OCULTO_DURATION = 30 * 30;

// ── Paleta Fútbol Oculto ───────────────────────────────────────────
const MAROON = "rgb(107, 18, 19)";
const GOLD = "rgb(194, 145, 72)";
const BG_DARK = "#0a0705";
const FONT = "'Neue Haas Grotesk Display Pro', 'Helvetica Neue', Arial, sans-serif";

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

export const FutbolOcultoBroadcast: React.FC<FutbolOcultoBroadcastProps> = ({
  bigSegments,
  photoOverlays,
  programLogoSrc = staticFile("futbol-oculto-logo.png"),
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
  const hl = pickHeadline(
    headlines && headlines.length ? headlines : [{ headline, subheadline }],
    frame, fps, headlineRotateSec,
  );

  return (
    <div style={{ width: 1920, height: 1080, background: BG_DARK, position: "relative", overflow: "hidden" }}>
      {/* ── VÍDEO/FOTOS: full-bleed, ocupa a tela inteira ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
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

      {/* ── Degradê escuro no rodapé (deixa a manchete legível sobre o vídeo) ── */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 360,
          background: "linear-gradient(180deg, rgba(10,7,5,0) 0%, rgba(10,7,5,0.55) 45%, rgba(10,7,5,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Linha de acento dourado/vinho ── */}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 172, height: 3, background: `linear-gradient(90deg, ${GOLD}, ${MAROON})`, opacity: hl.opacity }} />

      {/* ── MANCHETE: sobreposta ao vídeo, no rodapé ── */}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 56, display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ width: 112, height: 112, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: `2px solid ${GOLD}`, boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }}>
          {programLogoSrc ? (
            <Img src={programLogoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0, opacity: hl.opacity }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 48, color: "#fff", letterSpacing: 0.2, lineHeight: 1.05, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
            {hl.headline}
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: GOLD, marginTop: 5, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
            {hl.subheadline}
          </div>
        </div>
      </div>

      {/* ── Barra de inscrição (mãozinha) em ciclo — mocada ── */}
      {showSubscribe ? (
        <SubscribeBar
          channelName="Fútbol Oculto"
          channelHandle="@FutbolOcultoreal"
          avatarSrc={staticFile("futbol-oculto-logo.png")}
          cycleSec={subscribeCycleSec}
          subscribeText="Suscríbete"
          subscribedText="Suscrito"
        />
      ) : null}
    </div>
  );
};
