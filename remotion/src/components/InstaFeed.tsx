import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg, SafeVideo } from "./SafeMedia";

export interface InstaFeedCard {
  src: string;
  type?: "image" | "video";
}

export interface InstaFeedProps {
  cards: InstaFeedCard[];
  /** Frames que cada card fica visível no centro */
  holdFrames?: number;
  /** Frames da animação de entrada/saída */
  animFrames?: number;
  backgroundColor?: string;
  enterFrame?: number;
}

export const InstaFeed: React.FC<InstaFeedProps> = ({
  cards,
  holdFrames = 50,
  animFrames = 18,
  backgroundColor = "white",
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dimensões do card (3:4)
  const postWidth = 520;
  const postHeight = postWidth * (4 / 3);

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
      {cards.map((card, i) => {
        const cardStart = enterFrame + i * (holdFrames + animFrames);
        const localFrame = frame - cardStart;

        // Entrada: slide da direita para o centro
        const enterProg = spring({
          frame: localFrame,
          fps,
          config: { damping: 16, stiffness: 100, mass: 0.7 },
        });

        // Saída: slide para cima
        const exitStart = animFrames + holdFrames;
        const exitProg = interpolate(
          localFrame,
          [exitStart, exitStart + animFrames],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Posições
        const enterX = interpolate(enterProg, [0, 1], [1200, 0]);
        const exitY = interpolate(exitProg, [0, 1], [0, -900]);
        const exitScale = interpolate(exitProg, [0, 1], [1, 0.85]);
        const exitOpacity = interpolate(exitProg, [0, 0.8], [1, 0], {
          extrapolateRight: "clamp",
        });
        const enterOpacity = interpolate(enterProg, [0, 0.3], [0, 1], {
          extrapolateRight: "clamp",
        });
        const opacity = enterOpacity * exitOpacity;

        if (localFrame < -5 || localFrame > exitStart + animFrames + 5) {
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
            <div
              style={{
                transform: `translateX(${enterX}px) translateY(${exitY}px) scale(${exitScale})`,
                opacity,
                width: postWidth,
                height: postHeight,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
              }}
            >
              {card.type === "video" ? (
                <SafeVideo
                  src={card.src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                  }}
                />
              ) : (
                <SafeImg
                  src={card.src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                  }}
                />
              )}
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
