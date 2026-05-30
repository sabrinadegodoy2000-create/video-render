import { FONT_FAMILY, LETTER_SPACING, fitFontSize } from "../theme";
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";

export interface HighlightZoomProps {
  text: string;
  fontSize?: number;
  color?: string;
  highlightColor?: string;
  backgroundColor?: string;
  enterFrame?: number;
  zoomDelay?: number;
  highlightDelay?: number;
  /** Frames para grifar cada linha */
  framesPerLine?: number;
  /** Toca clique.mp3 ao aparecer (ativar só no pipeline, não no showcase) */
  playSfx?: boolean;
}

/**
 * Quebra o texto em linhas estimadas com base no fontSize e maxWidth.
 * Não é pixel-perfect mas funciona bem para fontes bold grandes.
 */
function estimateLines(text: string, fontSize: number, maxWidthPx: number): string[] {
  // Estimativa: cada caractere ocupa ~0.6 * fontSize em fonte bold
  const charWidth = fontSize * 0.55;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = testLine.length * charWidth;
    if (testWidth > maxWidthPx && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export const HighlightZoom: React.FC<HighlightZoomProps> = ({
  text,
  fontSize = 101,
  color = "#111",
  highlightColor = "#ffe135",
  backgroundColor = "white",
  enterFrame = 0,
  zoomDelay = 15,
  highlightDelay = 30,
  framesPerLine = 20,
  playSfx = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth } = useVideoConfig();

  const maxTextWidth = videoWidth * 0.65;
  // Garante que nenhuma palavra sozinha exceda a largura — reduz fontSize se necessário
  const longestWord = text.split(" ").reduce((a, b) => (a.length > b.length ? a : b), "");
  const adjustedFontSize = fitFontSize(longestWord, fontSize, maxTextWidth);
  const lines = useMemo(() => estimateLines(text, adjustedFontSize, maxTextWidth), [text, adjustedFontSize, maxTextWidth]);

  // 1. Texto aparece
  const enterProg = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 16, stiffness: 100, mass: 0.6 },
  });
  const textOpacity = interpolate(enterProg, [0, 1], [0, 1]);
  const textY = interpolate(enterProg, [0, 1], [40, 0]);

  // 2. Zoom
  const zoomStart = enterFrame + zoomDelay;
  const zoomProg = spring({
    frame: frame - zoomStart,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });
  const scale = interpolate(zoomProg, [0, 1], [1, 1.2]);
  const panX = interpolate(zoomProg, [0, 1], [0, -12], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {playSfx && (
        <Sequence from={enterFrame} durationInFrames={30}>
          <Audio src={staticFile("sfx/clique.mp3")} startFrom={0} volume={0.7} />
        </Sequence>
      )}
      <div
        style={{
          transform: `translateY(${textY}px) translateX(${panX}%) scale(${scale})`,
          transformOrigin: "left center",
          opacity: textOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        {lines.map((line, lineIdx) => {
          // Cada linha começa depois da anterior terminar
          const lineStart = enterFrame + highlightDelay + lineIdx * framesPerLine;
          const hlProg = interpolate(
            frame,
            [lineStart, lineStart + framesPerLine],
            [0, 100],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div key={lineIdx} style={{ position: "relative", display: "inline-block" }}>
              {/* Highlight por trás */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${hlProg}%`,
                  backgroundColor: highlightColor,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
              {/* Texto */}
              <span
                style={{
                  position: "relative",
                  fontSize: adjustedFontSize,
                  fontFamily: FONT_FAMILY,
                  fontWeight: 800,
                  letterSpacing: LETTER_SPACING,
                  color,
                  padding: "6px 12px",
                  whiteSpace: "nowrap",
                }}
              >
                {line}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
