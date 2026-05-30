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

export interface MediaRiseTitleProps {
  /** Mídia (imagem ou vídeo) */
  mediaSrc: string;
  mediaType?: "image" | "video";
  /** Título que aparece no topo */
  title: string;
  /** Cor do título */
  titleColor?: string;
  /** Cor de fundo */
  backgroundColor?: string;
  /** Tamanho da fonte do título */
  titleFontSize?: number;
  /** Frame de entrada */
  enterFrame?: number;
  /** Border radius superior da mídia */
  mediaBorderRadius?: number;
  /** Percentual da tela que a mídia ocupa (0.0 a 1.0) */
  mediaHeightRatio?: number;
}

export const MediaRiseTitle: React.FC<MediaRiseTitleProps> = ({
  mediaSrc,
  mediaType = "image",
  title,
  titleColor = "#111",
  backgroundColor = "white",
  titleFontSize = 72,
  enterFrame = 0,
  mediaBorderRadius = 28,
  mediaHeightRatio = 0.9,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();

  const mediaHeight = videoHeight * mediaHeightRatio;
  const titleAreaHeight = videoHeight - mediaHeight;

  // 1. Mídia sobe de baixo
  const mediaProg = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 16, stiffness: 70, mass: 0.9 },
  });
  const mediaY = interpolate(mediaProg, [0, 1], [videoHeight, 0]);
  const mediaOpacity = interpolate(mediaProg, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 2. Título aparece (com delay)
  const titleProg = spring({
    frame: frame - enterFrame - 10,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.6 },
  });
  const titleY = interpolate(titleProg, [0, 1], [-30, 0]);
  const titleOpacity = interpolate(titleProg, [0, 1], [0, 1]);
  const titleScale = interpolate(titleProg, [0, 1], [0.9, 1]);

  const adjustedTitleSize = fitFontSize(title, titleFontSize, videoWidth - 120);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Área do título (topo) */}
      <div
        style={{
          width: videoWidth,
          height: titleAreaHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: adjustedTitleSize,
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            letterSpacing: LETTER_SPACING,
            color: titleColor,
            textAlign: "center",
            lineHeight: 1.05,
            textTransform: "uppercase",
            transform: `translateY(${titleY}px) scale(${titleScale})`,
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      </div>

      {/* Área da mídia (baixo, sobe de baixo) */}
      <div
        style={{
          width: videoWidth,
          height: mediaHeight,
          flexShrink: 0,
          transform: `translateY(${mediaY}px)`,
          opacity: mediaOpacity,
          overflow: "hidden",
          borderTopLeftRadius: mediaBorderRadius,
          borderTopRightRadius: mediaBorderRadius,
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
    </AbsoluteFill>
  );
};
