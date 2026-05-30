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

export interface MediaTextHalfProps {
  /** Mídia (imagem ou vídeo) */
  mediaSrc: string;
  mediaType?: "image" | "video";
  /** Título grande no lado direito */
  title: string;
  /** Até 3 parágrafos de texto */
  paragraphs: string[];
  /** Cor do título */
  titleColor?: string;
  /** Cor dos parágrafos */
  textColor?: string;
  /** Cor de fundo */
  backgroundColor?: string;
  /** Tamanho da fonte do título */
  titleFontSize?: number;
  /** Tamanho da fonte dos parágrafos */
  paragraphFontSize?: number;
  /** Frame de entrada */
  enterFrame?: number;
  /** Border radius da mídia (lado direito) */
  mediaBorderRadius?: number;
}

export const MediaTextHalf: React.FC<MediaTextHalfProps> = ({
  mediaSrc,
  mediaType = "image",
  title,
  paragraphs = [],
  titleColor = "#111",
  textColor = "#444",
  backgroundColor = "white",
  titleFontSize = 64,
  paragraphFontSize = 38,
  enterFrame = 0,
  mediaBorderRadius = 24,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();

  // 1. Mídia desliza da esquerda
  const mediaProg = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 16, stiffness: 80, mass: 0.8 },
  });
  const mediaX = interpolate(mediaProg, [0, 1], [-videoWidth * 0.5, 0]);
  const mediaOpacity = interpolate(mediaProg, [0, 1], [0, 1]);

  // 2. Título aparece (com delay)
  const titleProg = spring({
    frame: frame - enterFrame - 12,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.6 },
  });
  const titleY = interpolate(titleProg, [0, 1], [40, 0]);
  const titleOpacity = interpolate(titleProg, [0, 1], [0, 1]);

  // 3. Parágrafos aparecem escalonados
  const paragraphProgs = paragraphs.map((_, i) =>
    spring({
      frame: frame - enterFrame - 20 - i * 8,
      fps,
      config: { damping: 14, stiffness: 90, mass: 0.7 },
    })
  );

  const halfWidth = videoWidth * 0.5;
  const adjustedTitleSize = fitFontSize(title, titleFontSize, halfWidth - 120);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* Lado esquerdo — Mídia 50% */}
      <div
        style={{
          width: halfWidth,
          height: videoHeight,
          overflow: "hidden",
          transform: `translateX(${mediaX}px)`,
          opacity: mediaOpacity,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderTopRightRadius: mediaBorderRadius,
            borderBottomRightRadius: mediaBorderRadius,
            overflow: "hidden",
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
      </div>

      {/* Lado direito — Texto 50% */}
      <div
        style={{
          width: halfWidth,
          height: videoHeight,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 60px 60px 50px",
          boxSizing: "border-box",
        }}
      >
        {/* Título */}
        <div
          style={{
            fontSize: adjustedTitleSize,
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            letterSpacing: LETTER_SPACING,
            color: titleColor,
            lineHeight: 1.05,
            marginBottom: 30,
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>

        {/* Parágrafos */}
        {paragraphs.slice(0, 3).map((para, i) => {
          const prog = paragraphProgs[i] || 0;
          const pY = interpolate(prog, [0, 1], [30, 0]);
          const pOpacity = interpolate(prog, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                fontSize: paragraphFontSize,
                fontFamily: FONT_FAMILY,
                fontWeight: 400,
                letterSpacing: -0.5,
                color: textColor,
                lineHeight: 1.5,
                marginBottom: 18,
                transform: `translateY(${pY}px)`,
                opacity: pOpacity,
              }}
            >
              {para}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
