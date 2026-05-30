import { FONT_FAMILY, LETTER_SPACING, fitFontSize } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export interface WordCascadeProps {
  words: string[];
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  /** Frames que cada palavra fica visível antes de sair */
  holdFrames?: number;
  /** Frames da animação de saída */
  exitFrames?: number;
  enterFrame?: number;
}

export const WordCascade: React.FC<WordCascadeProps> = ({
  words,
  fontSize = 200,
  color = "#111",
  backgroundColor = "white",
  holdFrames = 25,
  exitFrames = 12,
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Duração total de cada palavra: enter + hold + exit
  const wordDuration = holdFrames + exitFrames;

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
      {words.map((word, i) => {
        const wordStart = enterFrame + i * wordDuration;
        const wordEnd = wordStart + holdFrames;

        // Entrada: spring de baixo pra centro
        const enterProg = spring({
          frame: frame - wordStart,
          fps,
          config: { damping: 14, stiffness: 130, mass: 0.6 },
        });

        // Saída: acelera pra baixo
        const exitProg = interpolate(
          frame,
          [wordEnd, wordEnd + exitFrames],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Posição Y: entra de baixo, fica no centro, sai pra baixo
        const enterY = interpolate(enterProg, [0, 1], [300, 0]);
        const exitY = interpolate(exitProg, [0, 1], [0, -400]);
        const y = enterY + exitY;

        // Opacidade
        const enterOpacity = interpolate(enterProg, [0, 1], [0, 1]);
        const exitOpacity = interpolate(exitProg, [0, 0.6], [1, 0], {
          extrapolateRight: "clamp",
        });
        const opacity = enterOpacity * exitOpacity;

        // Scale sutil na saída
        const exitScale = interpolate(exitProg, [0, 1], [1, 0.85]);

        // Só renderiza se estiver no range visível
        if (frame < wordStart - 5 || frame > wordEnd + exitFrames + 5) {
          return null;
        }

        return (
          <AbsoluteFill
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: fitFontSize(word, fontSize, 1920 * 0.85),
                fontFamily: FONT_FAMILY,
                fontWeight: 900,
                letterSpacing: LETTER_SPACING,
                color,
                textTransform: "uppercase",
                transform: `translateY(${y}px) scale(${exitScale})`,
                opacity,
              }}
            >
              {word}
            </span>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
