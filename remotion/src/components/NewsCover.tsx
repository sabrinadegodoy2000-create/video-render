import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg } from "./SafeMedia";
import { FONT_FAMILY } from "../theme";

export interface NewsCoverProps {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  imageSrc?: string;
  source?: string;
  accentColor?: string;
  enterFrame?: number;
}

function estimateLines(text: string, fontSize: number, maxWidthPx: number): string[] {
  const charWidth = fontSize * 0.52;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length * charWidth > maxWidthPx && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export const NewsCover: React.FC<NewsCoverProps> = ({
  title = "Título da Notícia Vai Aqui e Pode Ser Bem Longo",
  subtitle = "Descrição secundária com mais detalhes sobre o acontecimento",
  author = "Por Redação",
  date = "06/04/2026 · 12h20",
  imageSrc,
  source = "ge",
  accentColor = "#e30613",
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: videoWidth } = useVideoConfig();

  const f = Math.max(0, frame - enterFrame);
  const totalFrames = durationInFrames - enterFrame;

  // ── Zoom lento na tela toda (ken-burns suave) ──
  const scale = interpolate(f, [0, totalFrames], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Entrada dos elementos (stagger) ──
  const fadeIn = (delay: number) =>
    spring({ frame: f - delay, fps, config: { damping: 18, stiffness: 80 } });

  const titleOpacity    = fadeIn(4);
  const titleY          = interpolate(fadeIn(4), [0, 1], [24, 0]);
  const subtitleOpacity = fadeIn(10);
  const subtitleY       = interpolate(fadeIn(10), [0, 1], [16, 0]);
  const metaOpacity     = fadeIn(16);
  const imageOpacity    = fadeIn(6);
  const imageY          = interpolate(fadeIn(6), [0, 1], [30, 0]);

  // ── Linhas do título + highlight ──
  const TITLE_FONT_SIZE = 54;
  const FRAMES_PER_LINE = 18;
  const HIGHLIGHT_START = enterFrame + 20; // começa após título aparecer

  // largura disponível para o texto: 76% da tela - padding - paddingLeft do título
  const boxWidth = videoWidth * 0.76;
  const contentWidth = boxWidth - 60 * 2 - 16; // padding 60px cada lado + paddingLeft 16
  const titleLines = useMemo(
    () => estimateLines(title, TITLE_FONT_SIZE, contentWidth),
    [title, contentWidth]
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#fff" }}>
      {/* Zoom wrapper */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* ── Layout principal ── */}
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
          }}
        >
          <div
            style={{
              width: "76%",
              height: "78%",
              display: "flex",
              flexDirection: "column",
              padding: "44px 60px 40px",
              backgroundColor: "#fff",
              fontFamily: FONT_FAMILY,
              boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {/* ── Título com highlight linha a linha ── */}
            <div
              style={{
                opacity: titleOpacity,
                transform: `translateY(${titleY}px)`,
                margin: "0 0 20px 0",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {titleLines.map((line, lineIdx) => {
                const lineStart = HIGHLIGHT_START + lineIdx * FRAMES_PER_LINE;
                const hlProg = interpolate(
                  frame,
                  [lineStart, lineStart + FRAMES_PER_LINE],
                  [0, 100],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );

                return (
                  <div key={lineIdx} style={{ position: "relative", display: "inline-block", alignSelf: "flex-start" }}>
                    {/* Highlight por trás */}
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${hlProg}%`,
                        backgroundColor: accentColor,
                        borderRadius: 2,
                      }}
                    />
                    {/* Texto */}
                    <span
                      style={{
                        position: "relative",
                        fontSize: TITLE_FONT_SIZE,
                        fontFamily: FONT_FAMILY,
                        fontWeight: 900,
                        lineHeight: 1.18,
                        color: "#111",
                        letterSpacing: -0.5,
                        padding: "2px 8px 2px 16px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Subtítulo ── */}
            {subtitle && (
              <p
                style={{
                  opacity: subtitleOpacity,
                  transform: `translateY(${subtitleY}px)`,
                  fontSize: 26,
                  color: "#444",
                  margin: "0 0 24px 0",
                  lineHeight: 1.45,
                  fontFamily: FONT_FAMILY,
                  paddingLeft: 16,
                }}
              >
                {subtitle}
              </p>
            )}

            {/* ── Autor + data ── */}
            <div
              style={{
                opacity: metaOpacity,
                display: "flex",
                alignItems: "center",
                gap: 16,
                paddingLeft: 16,
                marginBottom: imageSrc ? 28 : 0,
              }}
            >
              <span style={{ fontSize: 18, color: "#777", fontFamily: FONT_FAMILY }}>
                {author}
              </span>
              {date && (
                <>
                  <span style={{ color: "#ccc", fontSize: 16 }}>—</span>
                  <span style={{ fontSize: 18, color: "#999", fontFamily: FONT_FAMILY }}>
                    {date}
                  </span>
                </>
              )}
            </div>

            {/* ── Imagem de destaque ── */}
            {imageSrc && (
              <div
                style={{
                  opacity: imageOpacity,
                  transform: `translateY(${imageY}px)`,
                  flex: 1,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginTop: 8,
                  minHeight: 0,
                }}
              >
                <SafeImg
                  src={imageSrc}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
