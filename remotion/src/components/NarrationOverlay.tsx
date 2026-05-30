import { FONT_FAMILY, LETTER_SPACING } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export type NarrationStyle =
  | "subtitle-box"
  | "cinematic-caption"
  | "highlight-word"
  | "karaoke"
  | "split-screen";

export interface NarrationOverlayProps {
  /** Estilo da narração */
  style?: NarrationStyle;
  /** Texto completo da narração */
  text: string;
  /** Palavras-chave para destacar (highlight-word) */
  highlightWords?: string[];
  /** Cor do destaque */
  highlightColor?: string;
  /** Posição: top, center, bottom */
  position?: "top" | "center" | "bottom";
  /** Frame de entrada */
  enterFrame?: number;
  /** Frame de saída */
  exitFrame?: number;
  /** Tamanho da fonte */
  fontSize?: number;
}

export const NarrationOverlay: React.FC<NarrationOverlayProps> = ({
  style = "subtitle-box",
  text,
  highlightWords = [],
  highlightColor = "#dc2626",
  position = "bottom",
  enterFrame = 0,
  exitFrame,
  fontSize = 36,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const actualExit = exitFrame ?? durationInFrames - 15;

  const commonProps = {
    text, highlightWords, highlightColor, position,
    enterFrame, exitFrame: actualExit, fontSize,
    frame, fps,
  };

  switch (style) {
    case "subtitle-box":
      return <SubtitleBox {...commonProps} />;
    case "cinematic-caption":
      return <CinematicCaption {...commonProps} />;
    case "highlight-word":
      return <HighlightWord {...commonProps} />;
    case "karaoke":
      return <Karaoke {...commonProps} />;
    case "split-screen":
      return <SplitScreenText {...commonProps} />;
    default:
      return null;
  }
};

interface InternalProps {
  text: string;
  highlightWords: string[];
  highlightColor: string;
  position: "top" | "center" | "bottom";
  enterFrame: number;
  exitFrame: number;
  fontSize: number;
  frame: number;
  fps: number;
}

const posStyle = (position: string): React.CSSProperties => ({
  position: "absolute",
  left: 0, right: 0,
  ...(position === "top" ? { top: 60 } : position === "center" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: 60 }),
  display: "flex",
  justifyContent: "center",
  padding: "0 40px",
});

// ─── Subtitle Box ─────────────────────────────────────────────────────────────
// Caixa semi-transparente clássica com texto word-by-word
const SubtitleBox: React.FC<InternalProps> = ({
  text, enterFrame, exitFrame, fontSize, frame, fps, position,
}) => {
  const words = text.split(" ");
  const DELAY = 2;

  const boxEnter = spring({
    frame: frame - enterFrame, fps,
    config: { damping: 20, stiffness: 100, mass: 0.5 },
  });
  const boxExit = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 10], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  const boxScale = interpolate(boxEnter, [0, 1], [0.95, 1]);
  const boxOpacity = boxEnter * boxExit;

  return (
    <div style={posStyle(position)}>
      <div style={{
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        borderRadius: 12,
        padding: "20px 36px",
        maxWidth: "80%",
        opacity: boxOpacity,
        transform: `scale(${boxScale})`,
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: "0 10px", lineHeight: 1.4,
        }}>
          {words.map((word, i) => {
            const wordEnter = enterFrame + 8 + i * DELAY;
            const prog = spring({
              frame: frame - wordEnter, fps,
              config: { damping: 18, stiffness: 140, mass: 0.4 },
            });
            return (
              <span key={i} style={{
                fontSize, fontWeight: 600, color: "white",
                fontFamily: FONT_FAMILY, letterSpacing: LETTER_SPACING,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [15, 0])}px)`,
                display: "inline-block",
              }}>
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Cinematic Caption ────────────────────────────────────────────────────────
// Texto grande centralizado com sombra pesada, estilo trailer de cinema
const CinematicCaption: React.FC<InternalProps> = ({
  text, enterFrame, exitFrame, fontSize, frame, fps, position,
}) => {
  const lines = text.split("\n").length > 1 ? text.split("\n") : [text];
  const LINE_DELAY = 15; // frames entre linhas

  const exitOpacity = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 12], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  return (
    <div style={{
      ...posStyle("center"),
      opacity: exitOpacity,
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    }}>
      {lines.map((line, i) => {
        const lineEnter = enterFrame + i * LINE_DELAY;
        const prog = spring({
          frame: frame - lineEnter, fps,
          config: { damping: 14, stiffness: 60, mass: 1 },
        });
        const opacity = interpolate(prog, [0, 1], [0, 1]);
        const y = interpolate(prog, [0, 1], [40, 0]);
        const letterSpacing = interpolate(prog, [0, 1], [12, LETTER_SPACING]);

        return (
          <div key={i} style={{
            fontSize: fontSize * 1.2,
            fontWeight: 900,
            color: "white",
            fontFamily: FONT_FAMILY, letterSpacing: LETTER_SPACING,
            textTransform: "uppercase",
            textAlign: "center",
            textShadow: "0 4px 20px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.4)",
            opacity,
            transform: `translateY(${y}px)`,
          }}>
            {line}
          </div>
        );
      })}
    </div>
  );
};

// ─── Highlight Word ───────────────────────────────────────────────────────────
// Texto aparece todo, palavras-chave são destacadas com cor/bg animado
const HighlightWord: React.FC<InternalProps> = ({
  text, highlightWords, highlightColor, enterFrame, exitFrame, fontSize, frame, fps, position,
}) => {
  const words = text.split(" ");
  const DELAY = 2;

  const containerProg = spring({
    frame: frame - enterFrame, fps,
    config: { damping: 20, stiffness: 90, mass: 0.6 },
  });
  const exitOpacity = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 12], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  const highlightSet = new Set(highlightWords.map(w => w.toLowerCase()));

  return (
    <div style={{ ...posStyle(position), opacity: exitOpacity }}>
      <div style={{
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        borderRadius: 12,
        padding: "22px 40px",
        maxWidth: "80%",
        opacity: containerProg,
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: "4px 10px", lineHeight: 1.5,
        }}>
          {words.map((word, i) => {
            const wordEnter = enterFrame + 10 + i * DELAY;
            const prog = spring({
              frame: frame - wordEnter, fps,
              config: { damping: 16, stiffness: 130, mass: 0.4 },
            });
            const isHighlight = highlightSet.has(word.toLowerCase().replace(/[.,!?]/g, ""));

            // Animação de destaque com delay extra
            const hlProg = isHighlight ? spring({
              frame: frame - (wordEnter + 8), fps,
              config: { damping: 12, stiffness: 150, mass: 0.3 },
            }) : 0;

            const bgColor = isHighlight
              ? `${highlightColor}${Math.round(interpolate(hlProg, [0, 1], [0, 0.9]) * 255).toString(16).padStart(2, "0")}`
              : "transparent";
            const scale = isHighlight ? interpolate(hlProg, [0, 0.5, 1], [1, 1.15, 1.05]) : 1;

            return (
              <span key={i} style={{
                fontSize, fontWeight: isHighlight ? 800 : 600,
                color: "white",
                fontFamily: FONT_FAMILY, letterSpacing: LETTER_SPACING,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [12, 0])}px) scale(${scale})`,
                display: "inline-block",
                backgroundColor: bgColor,
                padding: isHighlight ? "2px 8px" : "0",
                borderRadius: 4,
                transition: "background-color 0.1s",
              }}>
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Karaoke ──────────────────────────────────────────────────────────────────
// Texto visível desde o início, palavras "acendem" sequencialmente
const Karaoke: React.FC<InternalProps> = ({
  text, highlightColor, enterFrame, exitFrame, fontSize, frame, fps, position,
}) => {
  const words = text.split(" ");
  const totalDur = exitFrame - enterFrame;
  const perWord = totalDur / words.length;

  const exitOpacity = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 10], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  return (
    <div style={{ ...posStyle(position), opacity: exitOpacity }}>
      <div style={{
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderRadius: 10,
        padding: "20px 36px",
        maxWidth: "85%",
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: "4px 10px", lineHeight: 1.5,
        }}>
          {words.map((word, i) => {
            const wordTime = enterFrame + i * perWord;
            const isActive = frame >= wordTime;
            const justActivated = frame >= wordTime && frame < wordTime + 6;

            const scale = justActivated ? interpolate(
              frame, [wordTime, wordTime + 6], [1.15, 1],
              { extrapolateRight: "clamp" }
            ) : 1;

            return (
              <span key={i} style={{
                fontSize, fontWeight: 700,
                color: isActive ? highlightColor : "rgba(255,255,255,0.35)",
                fontFamily: FONT_FAMILY, letterSpacing: LETTER_SPACING,
                display: "inline-block",
                transform: `scale(${scale})`,
                textShadow: isActive ? `0 0 20px ${highlightColor}44` : "none",
              }}>
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Split Screen Text ────────────────────────────────────────────────────────
// Texto aparece em painel lateral semi-transparente
const SplitScreenText: React.FC<InternalProps> = ({
  text, enterFrame, exitFrame, fontSize, frame, fps,
}) => {
  const enterProg = spring({
    frame: frame - enterFrame, fps,
    config: { damping: 18, stiffness: 100, mass: 0.6 },
  });
  const exitProg = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 12], [0, 100], { extrapolateRight: "clamp" })
    : 0;

  const panelX = interpolate(enterProg, [0, 1], [-100, 0]);
  const words = text.split(" ");
  const DELAY = 3;

  return (
    <div style={{
      position: "absolute",
      top: 0, bottom: 0, left: 0,
      width: "40%",
      transform: `translateX(${panelX + exitProg}%)`,
      background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,0,0,0.65))",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      padding: "60px 50px",
      borderRight: "3px solid rgba(255,255,255,0.1)",
    }}>
      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: "4px 10px", lineHeight: 1.5,
      }}>
        {words.map((word, i) => {
          const wordEnter = enterFrame + 12 + i * DELAY;
          const prog = spring({
            frame: frame - wordEnter, fps,
            config: { damping: 16, stiffness: 120, mass: 0.4 },
          });
          return (
            <span key={i} style={{
              fontSize: fontSize * 0.9, fontWeight: 600,
              color: "white",
              fontFamily: FONT_FAMILY, letterSpacing: LETTER_SPACING,
              opacity: interpolate(prog, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
              display: "inline-block",
            }}>
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
