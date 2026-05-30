import { FONT_FAMILY, LETTER_SPACING } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useOffthreadVideoConfig,
  interpolate,
  spring,
  Img,
  OffthreadVideo,
} from "remotion";

export interface TextMaskProps {
  /** Texto grande que serve de máscara */
  text: string;
  /** Mídia de fundo (aparece dentro do texto) */
  mediaSrc: string;
  /** Tipo da mídia */
  mediaType?: "image" | "video";
  /** Cor de fundo ao redor do texto */
  backgroundColor?: string;
  /** Tamanho da fonte (px) */
  fontSize?: number;
  /** Animação de entrada */
  animation?: "scale-up" | "slide-up" | "fade-in" | "zoom-through";
  /** Frame de entrada */
  enterFrame?: number;
}

export const TextMask: React.FC<TextMaskProps> = ({
  text,
  mediaSrc,
  mediaType = "image",
  backgroundColor = "#0a0a0a",
  fontSize = 300,
  animation = "scale-up",
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useOffthreadVideoConfig();

  // Animação de entrada do texto
  const enterProg = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.7 },
  });

  // Animação da mídia por trás (ken-burns sutil)
  const mediaScale = interpolate(frame, [0, durationInFrames], [1.0, 1.15]);

  // Estilos de animação do texto
  const textAnimStyle = getTextAnimation(animation, enterProg, frame, enterFrame, fps);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Container do texto-máscara */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...textAnimStyle,
        }}
      >
        <div
          style={{
            fontSize,
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            letterSpacing: LETTER_SPACING * 2,
            lineHeight: 0.9,
            textAlign: "center",
            textTransform: "uppercase",
            color: "transparent",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            backgroundSize: "cover",
            backgroundPosition: "center",
            // A mídia como background do texto
            ...(mediaType === "image"
              ? { backgroundImage: `url(${mediaSrc})` }
              : {}),
          }}
        >
          {/* Para vídeo, usamos SVG clipPath */}
          {text}
        </div>
      </div>

      {/* Versão com vídeo: usa SVG clip-path */}
      {mediaType === "video" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...textAnimStyle,
          }}
        >
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <clipPath id="text-clip">
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontFamily={FONT_FAMILY}
                  fontWeight="900"
                  letterSpacing={LETTER_SPACING * 2}
                >
                  {text}
                </text>
              </clipPath>
            </defs>
          </svg>
          <div style={{
            width: "100%",
            height: "100%",
            clipPath: "url(#text-clip)",
            WebkitClipPath: "url(#text-clip)",
          }}>
            <OffthreadVideo
              src={mediaSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${mediaScale})`,
              }}
              muted
            />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

function getTextAnimation(
  animation: string,
  enterProg: number,
  frame: number,
  enterFrame: number,
  fps: number,
): React.CSSProperties {
  switch (animation) {
    case "scale-up": {
      const scale = interpolate(enterProg, [0, 1], [0.3, 1]);
      const opacity = interpolate(enterProg, [0, 1], [0, 1]);
      return { transform: `scale(${scale})`, opacity };
    }
    case "slide-up": {
      const y = interpolate(enterProg, [0, 1], [200, 0]);
      const opacity = interpolate(enterProg, [0, 1], [0, 1]);
      return { transform: `translateY(${y}px)`, opacity };
    }
    case "fade-in": {
      return { opacity: enterProg };
    }
    case "zoom-through": {
      // Texto começa grande e faz zoom out, depois estabiliza
      const scale = interpolate(enterProg, [0, 1], [3, 1]);
      const opacity = interpolate(enterProg, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
      return { transform: `scale(${scale})`, opacity };
    }
    default:
      return {};
  }
}
