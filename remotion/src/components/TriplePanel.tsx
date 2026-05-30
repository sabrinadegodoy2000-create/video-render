import { FONT_FAMILY, LETTER_SPACING, fitFontSize } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg, SafeVideo } from "./SafeMedia";

export interface PanelData {
  src: string;
  type?: "image" | "video";
  word: string;
}

export interface TriplePanelProps {
  panels: [PanelData, PanelData, PanelData];
  fontSize?: number;
  color?: string;
  enterFrame?: number;
  /** Delay entre cada painel aparecer */
  stagger?: number;
  /** Delay do texto após o painel aparecer */
  textDelay?: number;
}

export const TriplePanel: React.FC<TriplePanelProps> = ({
  panels,
  fontSize = 160,
  color = "white",
  enterFrame = 0,
  stagger = 8,
  textDelay = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
        }}
      >
        {panels.map((panel, i) => {
          const panelStart = enterFrame + i * stagger;

          // Painel entra (slide de baixo + fade)
          const panelProg = spring({
            frame: frame - panelStart,
            fps,
            config: { damping: 14, stiffness: 100, mass: 0.8 },
          });
          const panelY = interpolate(panelProg, [0, 1], [120, 0]);
          const panelOpacity = interpolate(panelProg, [0, 1], [0, 1]);

          // Ken burns sutil na mídia
          const mediaScale = interpolate(
            frame,
            [panelStart, panelStart + 150],
            [1.0, 1.1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Texto aparece depois do painel
          const textStart = panelStart + textDelay;
          const textProg = spring({
            frame: frame - textStart,
            fps,
            config: { damping: 12, stiffness: 150, mass: 0.5 },
          });
          const textY = interpolate(textProg, [0, 1], [50, 0]);
          const textOpacity = interpolate(textProg, [0, 1], [0, 1]);
          const textScale = interpolate(textProg, [0, 1], [0.8, 1]);

          return (
            <div
              key={i}
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                transform: `translateY(${panelY}px)`,
                opacity: panelOpacity,
              }}
            >
              {/* Mídia */}
              {(panel.type || "image") === "image" ? (
                <SafeImg
                  src={panel.src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${mediaScale})`,
                  }}
                />
              ) : (
                <SafeVideo
                  src={panel.src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${mediaScale})`,
                  }}
                />
              )}

              {/* Overlay escuro */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.35)",
                }}
              />

            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
