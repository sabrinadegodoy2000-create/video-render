import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg, SafeVideo } from "./SafeMedia";

export interface QuadGridMedia {
  src: string;
  type?: "image" | "video";
}

export interface QuadGridProps {
  media: QuadGridMedia[];   // até 4 itens
  enterFrame?: number;
  gap?: number;
}

// Cada quadrante entra deslizando do seu canto
const ORIGINS: Array<{ x: number; y: number }> = [
  { x: -1, y: -1 }, // top-left  → vem de cima-esquerda
  { x:  1, y: -1 }, // top-right → vem de cima-direita
  { x: -1, y:  1 }, // bot-left  → vem de baixo-esquerda
  { x:  1, y:  1 }, // bot-right → vem de baixo-direita
];

export const QuadGrid: React.FC<QuadGridProps> = ({
  media = [],
  enterFrame = 0,
  gap = 4,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cellW = (width  - gap * 3) / 2;
  const cellH = (height - gap * 3) / 2;

  // Ken-burns suave em cada célula
  const kbScale = interpolate(frame, [0, 180], [1.0, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `1fr 1fr`,
          gridTemplateRows: `1fr 1fr`,
          gap,
          padding: gap,
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {[0, 1, 2, 3].map((i) => {
          const item   = media[i];
          const origin = ORIGINS[i];
          const delay  = enterFrame + i * 4;

          const prog = spring({
            frame: frame - delay,
            fps,
            config: { damping: 16, stiffness: 130, mass: 0.7 },
          });

          const slideX = interpolate(prog, [0, 1], [origin.x * cellW * 0.35, 0]);
          const slideY = interpolate(prog, [0, 1], [origin.y * cellH * 0.35, 0]);
          const opacity = interpolate(prog, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                overflow: "hidden",
                borderRadius: 3,
                transform: `translate(${slideX}px, ${slideY}px)`,
                opacity,
                backgroundColor: "#111",
              }}
            >
              {item?.src ? (
                item.type === "video" ? (
                  <SafeVideo
                    src={item.src}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: `scale(${kbScale})`,
                    }}
                  />
                ) : (
                  <SafeImg
                    src={item.src}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: `scale(${kbScale})`,
                    }}
                  />
                )
              ) : (
                // Slot vazio — placeholder preto
                <div style={{ width: "100%", height: "100%", backgroundColor: "#111" }} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
