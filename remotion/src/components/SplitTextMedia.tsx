import { FONT_FAMILY, fitFontSize } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg, SafeVideo } from "./SafeMedia";

export interface SplitTextMediaProps {
  /** Mídia central (9:16) */
  mediaSrc: string;
  mediaType?: "image" | "video";
  /** Texto do lado esquerdo */
  leftText: string;
  /** Texto do lado direito */
  rightText: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  enterFrame?: number;
  /** Delay do texto após a mídia aparecer */
  textDelay?: number;
}

export const SplitTextMedia: React.FC<SplitTextMediaProps> = ({
  mediaSrc,
  mediaType = "image",
  leftText,
  rightText,
  fontSize = 105,
  color = "#111",
  backgroundColor = "white",
  enterFrame = 0,
  textDelay = 15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Mídia aparece (scale up)
  const mediaProg = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.7 },
  });
  const mediaScale = interpolate(mediaProg, [0, 1], [0.8, 1]);
  const mediaOpacity = interpolate(mediaProg, [0, 1], [0, 1]);

  // 2. Texto esquerdo aparece (slide da esquerda)
  const textStart = enterFrame + textDelay;
  const leftProg = spring({
    frame: frame - textStart,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });
  const leftX = interpolate(leftProg, [0, 1], [-60, 0]);
  const leftOpacity = interpolate(leftProg, [0, 1], [0, 1]);

  // 3. Texto direito aparece (slide da direita, leve delay extra)
  const rightProg = spring({
    frame: frame - textStart - 4,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });
  const rightX = interpolate(rightProg, [0, 1], [60, 0]);
  const rightOpacity = interpolate(rightProg, [0, 1], [0, 1]);

  // Dimensões 9:16 proporcional ao vídeo 1080p
  const mediaHeight = 850;
  const mediaWidth = mediaHeight * (9 / 16) + 60;

  // Calcula fontSize que caiba na área lateral (cada lado tem ~metade menos a mídia)
  const sideWidth = (1920 - mediaWidth - 50 * 2 - 60 * 2) / 2; // ~580px cada lado
  // minSize elevado (60px, antes era 28 — ilegível) + ratio 0.52 (weight 600 ocupa menos que 800)
  const leftFontSize = fitFontSize(leftText, fontSize, sideWidth, 0.52, 60);
  const rightFontSize = fitFontSize(rightText, fontSize, sideWidth, 0.52, 60);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Container principal com os 3 elementos lado a lado */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 50,
          width: "100%",
          padding: "0 60px",
        }}
      >
        {/* Texto esquerdo */}
        <div
          style={{
            flex: 1,
            textAlign: "right",
            transform: `translateX(${leftX}px)`,
            opacity: leftOpacity,
          }}
        >
          <span
            style={{
              fontSize: leftFontSize,
              fontFamily: FONT_FAMILY,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color,
              lineHeight: 1.15,
              wordBreak: "break-word" as const,
            }}
          >
            {leftText}
          </span>
        </div>

        {/* Mídia central 9:16 */}
        <div
          style={{
            width: mediaWidth,
            height: mediaHeight,
            borderRadius: 16,
            overflow: "hidden",
            flexShrink: 0,
            transform: `scale(${mediaScale})`,
            opacity: mediaOpacity,
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          }}
        >
          {mediaType === "image" ? (
            <SafeImg
              src={mediaSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <SafeVideo
              src={mediaSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </div>

        {/* Texto direito */}
        <div
          style={{
            flex: 1,
            textAlign: "left",
            transform: `translateX(${rightX}px)`,
            opacity: rightOpacity,
          }}
        >
          <span
            style={{
              fontSize: rightFontSize,
              fontFamily: FONT_FAMILY,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color,
              lineHeight: 1.15,
              wordBreak: "break-word" as const,
            }}
          >
            {rightText}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
