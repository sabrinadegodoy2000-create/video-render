import { FONT_FAMILY, fitFontSize } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export interface AnimatedTextProps {
  text: string;
  animationStyle?: "word-by-word" | "typewriter" | "fade-up" | "slide-reveal" | "scale-pop";
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  position?: "top" | "center" | "bottom";
  enterFrame?: number;
  exitFrame?: number;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  animationStyle = "word-by-word",
  color = "#1a1a1a",
  backgroundColor = "white",
  fontSize = 104,
  fontFamily = FONT_FAMILY,
  fontWeight = 600,
  position = "center",
  enterFrame = 0,
  exitFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const actualExitFrame = exitFrame ?? durationInFrames - 15;

  const positionStyle: React.CSSProperties =
    position === "top"
      ? { top: 80, left: 0, right: 0 }
      : position === "bottom"
        ? { bottom: 80, left: 0, right: 0 }
        : { top: 0, left: 0, right: 0, bottom: 0 };

  const exitOpacity =
    frame >= actualExitFrame
      ? interpolate(frame, [actualExitFrame, actualExitFrame + 15], [1, 0], { extrapolateRight: "clamp" })
      : 1;

  // letterSpacing proporcional (-0.02em) em vez de -4px fixo — evita letras "coladas" em tamanhos pequenos
  const styleBase = { fontFamily, letterSpacing: "-0.02em" };
  // Ajusta fontSize para caber na tela (90% da largura do vídeo), com piso de 56px (antes era 28 — muito pequeno)
  const adjustedFontSize = fitFontSize(text, fontSize, 1920 * 0.9 - 160, 0.52, 56);
  const props = { text, enterFrame, fps, frame, color, fontSize: adjustedFontSize, fontWeight, styleBase };

  const content = (() => {
    switch (animationStyle) {
      case "word-by-word": return <WordByWord {...props} />;
      case "typewriter": return <Typewriter {...props} />;
      case "fade-up": return <FadeUp {...props} />;
      case "slide-reveal": return <SlideReveal {...props} />;
      case "scale-pop": return <ScalePop {...props} />;
      default: return null;
    }
  })();

  return (
    <AbsoluteFill
      style={{
        ...positionStyle,
        display: "flex",
        alignItems: position === "center" ? "center" : undefined,
        justifyContent: "center",
        opacity: exitOpacity,
      }}
    >
      {backgroundColor && (
        <div
          style={{
            position: "absolute", inset: 0, backgroundColor,
            opacity: interpolate(frame, [enterFrame, enterFrame + 10], [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1, padding: "40px 80px", maxWidth: "90%" }}>
        {content}
      </div>
    </AbsoluteFill>
  );
};

interface StyleProps {
  text: string;
  enterFrame: number;
  fps: number;
  frame: number;
  color: string;
  fontSize: number;
  fontWeight: number;
  styleBase: { fontFamily: string; letterSpacing: number };
}

const WordByWord: React.FC<StyleProps> = ({
  text, enterFrame, fps, frame, color, fontSize, fontWeight, styleBase,
}) => {
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", lineHeight: 1.25 }}>
      {words.map((word, i) => {
        const prog = spring({ frame: frame - (enterFrame + i * 3), fps, config: { damping: 15, stiffness: 120, mass: 0.5 } });
        return (
          <span key={i} style={{
            fontSize, fontWeight, color, ...styleBase,
            opacity: interpolate(prog, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
            display: "inline-block",
          }}>{word}</span>
        );
      })}
    </div>
  );
};

const Typewriter: React.FC<StyleProps> = ({
  text, enterFrame, frame, color, fontSize, fontWeight, styleBase,
}) => {
  const elapsed = Math.max(0, frame - enterFrame);
  const visibleChars = Math.min(text.length, Math.floor(elapsed * 0.8));
  const showCursor = elapsed % 16 < 10;
  return (
    <div style={{ fontSize, fontWeight, color, ...styleBase, textAlign: "center", lineHeight: 1.3 }}>
      {text.slice(0, visibleChars)}
      {visibleChars < text.length && <span style={{ opacity: showCursor ? 1 : 0, color }}>|</span>}
    </div>
  );
};

const FadeUp: React.FC<StyleProps> = ({
  text, enterFrame, fps, frame, color, fontSize, fontWeight, styleBase,
}) => {
  const prog = spring({ frame: frame - enterFrame, fps, config: { damping: 18, stiffness: 80, mass: 0.8 } });
  return (
    <div style={{
      fontSize, fontWeight, color, ...styleBase,
      textAlign: "center", lineHeight: 1.3,
      opacity: interpolate(prog, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(prog, [0, 1], [60, 0])}px)`,
    }}>{text}</div>
  );
};

const SlideReveal: React.FC<StyleProps> = ({
  text, enterFrame, fps, frame, color, fontSize, fontWeight, styleBase,
}) => {
  const prog = spring({ frame: frame - enterFrame, fps, config: { damping: 20, stiffness: 100, mass: 0.6 } });
  return (
    <div style={{ overflow: "hidden" }}>
      <div style={{
        fontSize, fontWeight, color, ...styleBase,
        textAlign: "center", lineHeight: 1.3,
        clipPath: `inset(0 ${interpolate(prog, [0, 1], [100, 0])}% 0 0)`,
      }}>{text}</div>
    </div>
  );
};

const ScalePop: React.FC<StyleProps> = ({
  text, enterFrame, fps, frame, color, fontSize, fontWeight, styleBase,
}) => {
  const prog = spring({ frame: frame - enterFrame, fps, config: { damping: 10, stiffness: 150, mass: 0.4 } });
  return (
    <div style={{
      fontSize, fontWeight, color, ...styleBase,
      textAlign: "center", lineHeight: 1.3,
      opacity: interpolate(prog, [0, 1], [0, 1]),
      transform: `scale(${interpolate(prog, [0, 1], [0.3, 1])})`,
    }}>{text}</div>
  );
};
