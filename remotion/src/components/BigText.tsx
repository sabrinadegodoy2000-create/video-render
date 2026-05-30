import { FONT_FAMILY, LETTER_SPACING, fitFontSize } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export interface BigTextProps {
  /** Texto grande */
  text: string;
  /** Cor do texto */
  color?: string;
  /** Tamanho da fonte (px) */
  fontSize?: number;
  /** Animação de entrada */
  animation?: "scale-up" | "slide-up" | "fade-in" | "zoom-through" | "pop";
  /** Frame de entrada */
  enterFrame?: number;
  /** Sombra no texto para destacar do fundo */
  shadow?: boolean;
}

export const BigText: React.FC<BigTextProps> = ({
  text,
  color = "white",
  fontSize = 350,
  animation = "scale-up",
  enterFrame = 0,
  shadow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProg = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 16, stiffness: 90, mass: 0.6 },
  });

  const animStyle = getAnimation(animation, enterProg, frame, enterFrame, fps);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...animStyle,
      }}
    >
      <div
        style={{
          fontSize: fitFontSize(text, fontSize, 1920 * 0.9),
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          letterSpacing: LETTER_SPACING * 2,
          lineHeight: 0.9,
          textAlign: "center",
          textTransform: "uppercase",
          color,
          textShadow: shadow
            ? "0 4px 30px rgba(0,0,0,0.6), 0 0 80px rgba(0,0,0,0.3)"
            : "none",
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

function getAnimation(
  animation: string,
  prog: number,
  frame: number,
  enterFrame: number,
  fps: number,
): React.CSSProperties {
  switch (animation) {
    case "scale-up": {
      const scale = interpolate(prog, [0, 1], [0.3, 1]);
      const opacity = interpolate(prog, [0, 1], [0, 1]);
      return { transform: `scale(${scale})`, opacity };
    }
    case "slide-up": {
      const y = interpolate(prog, [0, 1], [200, 0]);
      const opacity = interpolate(prog, [0, 1], [0, 1]);
      return { transform: `translateY(${y}px)`, opacity };
    }
    case "fade-in": {
      return { opacity: prog };
    }
    case "zoom-through": {
      const scale = interpolate(prog, [0, 1], [3, 1]);
      const opacity = interpolate(prog, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
      return { transform: `scale(${scale})`, opacity };
    }
    case "pop": {
      const s = spring({
        frame: frame - enterFrame,
        fps,
        config: { damping: 8, stiffness: 200, mass: 0.4 },
      });
      const scale = interpolate(s, [0, 1], [0, 1]);
      return { transform: `scale(${scale})`, opacity: interpolate(s, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }) };
    }
    default:
      return {};
  }
}
