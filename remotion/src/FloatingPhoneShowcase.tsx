import { useCurrentFrame, useVideoConfig, Img, OffthreadVideo, interpolate, Sequence, staticFile } from "remotion";

export type WideSegment = {
  src: string;
  type: "photo" | "video";
  durationSec: number;
  startSec?: number; // ponto de início do vídeo (avança a cada repetição no loop)
};

export type FloatingPhoneProps = {
  portraitVideoSrc: string;
  logoSrc: string;
  wideSegments: WideSegment[];
  durationSec: number;
};

export const FLOATING_PHONE_DURATION = 150; // fallback 5s @ 30fps

const BORDER_RADIUS = 24;
const STROKE_WIDTH = 2;
const NEON_COLOR = "#ff2020";
const TAIL_LENGTH = 320;
const CYCLE_SEC = 2;

export const FloatingPhoneShowcase: React.FC<FloatingPhoneProps> = ({
  portraitVideoSrc,
  logoSrc,
  wideSegments,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.round(durationSec * fps);

  const floatY = Math.sin((frame / fps) * (2 * Math.PI) / 3) * 12;

  const rectH = 1080 * 0.80;
  const rectW = rectH * (9 / 16);
  const marginRight = 120;
  const rectX = 1920 - marginRight - rectW;
  const verticalOffset = 60;
  const rectY = (1080 - rectH) / 2 + floatY + verticalOffset;

  const wideH = rectH;
  const wideW = wideH * (16 / 9);
  const gap = 60;
  const wideX = rectX - gap - wideW;
  const wideY = (1080 - rectH) / 2 + verticalOffset;

  const perimeter = 2 * (rectW + rectH);
  const cycleFrames = fps * CYCLE_SEC;
  const progress = (frame % cycleFrames) / cycleFrames;
  const headOffset = -(perimeter * progress);

  const pad = 32;
  const logoSize = 110;
  const logoMargin = 28;

  // Zoom suave aplicado só em fotos
  const wideImgScale = interpolate(frame, [0, totalFrames], [1.0, 1.08], { extrapolateRight: "clamp" });

  return (
    <div style={{ width: 1920, height: 1080, background: "#000000", position: "relative" }}>
      {/* Logo — canto superior esquerdo */}
      <Img
        src={logoSrc}
        style={{
          position: "absolute",
          left: logoMargin,
          top: logoMargin,
          width: logoSize,
          height: logoSize,
          objectFit: "contain",
        }}
      />

      {/* Retângulo 16:9 — segmentos do storyboard com blur fill */}
      <div
        style={{
          position: "absolute",
          left: wideX,
          top: wideY,
          width: wideW,
          height: wideH,
          borderRadius: BORDER_RADIUS,
          overflow: "hidden",
          background: "#000000",
        }}
      >
        {wideSegments.map((seg, i) => {
          const startFrame = wideSegments
            .slice(0, i)
            .reduce((acc, s) => acc + Math.round(s.durationSec * fps), 0);
          const durationInFrames = Math.round(seg.durationSec * fps);

          return (
            <Sequence key={i} from={startFrame} durationInFrames={durationInFrames} layout="none">
              {seg.type === "photo" ? (
                <>
                  {/* Fundo borrado */}
                  <Img
                    src={seg.src}
                    style={{
                      position: "absolute",
                      inset: -40,
                      width: "calc(100% + 80px)",
                      height: "calc(100% + 80px)",
                      objectFit: "cover",
                      filter: "blur(24px) brightness(0.5)",
                    }}
                  />
                  {/* Imagem com zoom suave */}
                  <Img
                    src={seg.src}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      transform: `scale(${wideImgScale})`,
                      transformOrigin: "center center",
                    }}
                  />
                </>
              ) : (
                <>
                  {/* Fundo borrado */}
                  <OffthreadVideo
                    src={seg.src}
                    trimBefore={Math.round((seg.startSec || 0) * fps)}
                    muted
                    style={{
                      position: "absolute",
                      inset: -40,
                      width: "calc(100% + 80px)",
                      height: "calc(100% + 80px)",
                      objectFit: "cover",
                      filter: "blur(24px) brightness(0.5)",
                    }}
                  />
                  {/* Vídeo original */}
                  <OffthreadVideo
                    src={seg.src}
                    trimBefore={Math.round((seg.startSec || 0) * fps)}
                    muted
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </>
              )}
            </Sequence>
          );
        })}
      </div>

      {/* Retângulo 9:16 — vídeo portrait */}
      <div
        style={{
          position: "absolute",
          left: rectX,
          top: rectY,
          width: rectW,
          height: rectH,
          borderRadius: BORDER_RADIUS,
          overflow: "hidden",
          background: "#000000",
        }}
      >
        <OffthreadVideo
          src={portraitVideoSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Sombra gradiente na parte de baixo */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "40%",
            background: "linear-gradient(to bottom, transparent, #000000)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* SVG neon no 9:16 */}
      <svg
        style={{
          position: "absolute",
          left: rectX - pad,
          top: rectY - pad,
          overflow: "visible",
          pointerEvents: "none",
        }}
        width={rectW + pad * 2}
        height={rectH + pad * 2}
      >
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={pad} y={pad} width={rectW} height={rectH} rx={BORDER_RADIUS} ry={BORDER_RADIUS}
          fill="none" stroke={NEON_COLOR} strokeWidth={STROKE_WIDTH} opacity={0.08} />
        <rect x={pad} y={pad} width={rectW} height={rectH} rx={BORDER_RADIUS} ry={BORDER_RADIUS}
          fill="none" stroke={NEON_COLOR} strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${TAIL_LENGTH} ${perimeter - TAIL_LENGTH}`}
          strokeDashoffset={headOffset} strokeLinecap="round" filter="url(#neon-glow)" />
        <rect x={pad} y={pad} width={rectW} height={rectH} rx={BORDER_RADIUS} ry={BORDER_RADIUS}
          fill="none" stroke="#ffffff" strokeWidth={STROKE_WIDTH * 0.4}
          strokeDasharray={`${TAIL_LENGTH * 0.15} ${perimeter - TAIL_LENGTH * 0.15}`}
          strokeDashoffset={headOffset} strokeLinecap="round" />
      </svg>
    </div>
  );
};
