import { useCurrentFrame, useVideoConfig, Img, Sequence, interpolate } from "remotion";

export type PhotoOverlayItem = { src: string; startSec: number; durationSec: number };

// Uma foto em TELA CHEIA por cima do vídeo de fundo, com fade in/out.
// Mesmo tratamento das mídias: fundo borrado (cover) + foto inteira (contain) na frente.
const FadePhoto: React.FC<{ src: string; durationInFrames: number }> = ({ src, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = Math.min(Math.round(0.3 * fps), Math.floor(durationInFrames / 2));
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <Img src={src} style={{ position: "absolute", inset: -30, width: "calc(100% + 60px)", height: "calc(100% + 60px)", objectFit: "cover", filter: "blur(22px) brightness(0.5)" }} />
      <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
};

/**
 * Camada de fotos "punch-in": entram em tela cheia por cima do fundo (vídeo contínuo)
 * nos tempos absolutos agendados. Some quando não há overlays (modo normal).
 * Deve ser renderizada DENTRO do mesmo container do quadro grande, por cima dos vídeos.
 */
export const PhotoPunchOverlays: React.FC<{ overlays?: PhotoOverlayItem[] }> = ({ overlays }) => {
  const { fps } = useVideoConfig();
  if (!overlays || !overlays.length) return null;
  return (
    <>
      {overlays.map((o, i) => {
        const dur = Math.max(1, Math.round(o.durationSec * fps));
        return (
          <Sequence key={i} from={Math.round(o.startSec * fps)} durationInFrames={dur} layout="none">
            <FadePhoto src={o.src} durationInFrames={dur} />
          </Sequence>
        );
      })}
    </>
  );
};
