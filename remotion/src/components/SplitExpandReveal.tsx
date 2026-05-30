import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useOffthreadVideoConfig,
  interpolate,
  spring,
  OffthreadVideo,
} from "remotion";
import { SafeImg } from "./SafeMedia";

export interface SplitExpandRevealProps {
  mediaSrc: string;
  mediaType?: "image" | "video";
  title?: string;
  topics?: string[];
  enterFrame?: number;
}

export const SplitExpandReveal: React.FC<SplitExpandRevealProps> = ({
  mediaSrc,
  mediaType = "image",
  title = "Up Next...",
  topics = [],
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame() - enterFrame;
  const { fps, width, height } = useOffthreadVideoConfig();

  if (frame < 0) return null;

  // Phase timings (in frames) — total effect expected ~6s
  const TEXT_START = Math.round(fps * 0.8);   // texto aparece em 0.8s
  const EXPAND_START = Math.round(fps * 3.5); // expande em 3.5s
  const EXPAND_END = Math.round(fps * 5.0);   // expansão completa em 5.0s

  // --- Fase 3: expansão da imagem ---
  const expandProgress = spring({
    frame: Math.max(0, frame - EXPAND_START),
    fps,
    config: { damping: 18, stiffness: 60 },
  });

  // Largura da imagem: vai de 50% para 100%
  const mediaWidth = interpolate(expandProgress, [0, 1], [width * 0.5, width]);
  // Posição X da imagem: vai de 50% para 0%
  const mediaLeft = interpolate(expandProgress, [0, 1], [width * 0.5, 0]);

  // --- Fase 2: texto ---
  const textOpacity = interpolate(
    frame,
    [TEXT_START, TEXT_START + Math.round(fps * 0.4), EXPAND_START - Math.round(fps * 0.3), EXPAND_START],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const FONT_FAMILY = "'Helvetica Now Display', 'Helvetica', Arial, sans-serif";

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", overflow: "hidden" }}>

      {/* Mídia — começa no lado direito e expande */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: mediaLeft,
          width: mediaWidth,
          height,
          overflow: "hidden",
        }}
      >
        {mediaType === "video" ? (
          <OffthreadVideo
            src={mediaSrc}
            volume={0}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        ) : (
          <SafeImg
            src={mediaSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        )}
      </div>

      {/* Texto lado esquerdo */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: width * 0.48,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 80,
          paddingRight: 40,
          opacity: textOpacity,
        }}
      >
        {/* Título */}
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 128,
            fontWeight: 700,
            color: "#111",
            marginBottom: 32,
            lineHeight: 1.1,
            textShadow: "0 2px 8px rgba(0,0,0,0.12)",
            transform: `translateY(${interpolate(textOpacity, [0, 1], [-20, 0])}px)`,
          }}
        >
          {title}
        </div>

        {/* Tópicos com stagger */}
        {topics.map((topic, i) => {
          const topicDelay = TEXT_START + Math.round(fps * 0.15 * (i + 1));
          const topicOpacity = interpolate(
            frame,
            [topicDelay, topicDelay + Math.round(fps * 0.3), EXPAND_START, EXPAND_START + Math.round(fps * 0.2)],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const topicY = interpolate(topicOpacity, [0, 1], [-15, 0]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 18,
                opacity: topicOpacity,
                transform: `translateY(${topicY}px)`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#111",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 64,
                  color: "#333",
                  textShadow: "0 1px 4px rgba(0,0,0,0.10)",
                  fontWeight: 400,
                }}
              >
                {topic}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
