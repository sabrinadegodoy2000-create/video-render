import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface Props {
  type: "fade" | "slide-left" | "slide-right" | "wipe" | "zoom" | "blur";
  durationFrames: number;
  direction: "in" | "out";
}

/** Efeito de transição entre blocos */
export const TransitionEffect: React.FC<Props> = ({
  type,
  durationFrames,
  direction,
}) => {
  const frame = useCurrentFrame();
  const progress = frame / durationFrames; // 0 → 1

  // Para "out": progresso vai de transparente → opaco (cobrindo a cena)
  // Para "in": progresso vai de opaco → transparente (revelando a cena)
  const effectProgress = direction === "out" ? progress : 1 - progress;

  switch (type) {
    case "fade":
      return (
        <AbsoluteFill
          style={{
            backgroundColor: "black",
            opacity: interpolate(effectProgress, [0, 1], [0, 1]),
          }}
        />
      );

    case "slide-left":
      return (
        <AbsoluteFill
          style={{
            backgroundColor: "black",
            transform: `translateX(${interpolate(effectProgress, [0, 1], [100, 0])}%)`,
          }}
        />
      );

    case "slide-right":
      return (
        <AbsoluteFill
          style={{
            backgroundColor: "black",
            transform: `translateX(${interpolate(effectProgress, [0, 1], [-100, 0])}%)`,
          }}
        />
      );

    case "wipe":
      return (
        <AbsoluteFill
          style={{
            backgroundColor: "black",
            clipPath: `inset(0 ${interpolate(effectProgress, [0, 1], [100, 0])}% 0 0)`,
          }}
        />
      );

    case "zoom": {
      const scale = interpolate(effectProgress, [0, 1], [1, 1.5]);
      const opacity = interpolate(effectProgress, [0, 1], [0, 1]);
      return (
        <AbsoluteFill
          style={{
            backgroundColor: "black",
            opacity,
            transform: `scale(${scale})`,
          }}
        />
      );
    }

    case "blur": {
      const blurAmount = interpolate(effectProgress, [0, 1], [0, 20]);
      return (
        <AbsoluteFill
          style={{
            backdropFilter: `blur(${blurAmount}px)`,
            WebkitBackdropFilter: `blur(${blurAmount}px)`,
          }}
        />
      );
    }

    default:
      return null;
  }
};
