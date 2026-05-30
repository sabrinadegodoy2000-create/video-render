import { FONT_FAMILY } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg, SafeVideo } from "./SafeMedia";

export interface CardData {
  img: string;
  type?: "image" | "video";
  label?: string;
}

export interface CardsRevealProps {
  cards: CardData[];
  enterFrame?: number;
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
  borderRadius?: number;
  backgroundColor?: string;
  labelColor?: string;
}

export const CardsReveal: React.FC<CardsRevealProps> = ({
  cards,
  enterFrame = 0,
  cardWidth = 480,
  cardHeight = 640,
  gap = 50,
  borderRadius = 16,
  backgroundColor = "white",
  labelColor = "white",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalWidth = cards.length * cardWidth + (cards.length - 1) * gap;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap,
          width: totalWidth,
        }}
      >
        {cards.map((card, i) => {
          const delay = enterFrame + i * 6;

          const prog = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, stiffness: 120, mass: 0.8 },
          });

          const y = interpolate(prog, [0, 1], [80, 0]);
          const opacity = interpolate(prog, [0, 1], [0, 1]);
          const scale = interpolate(prog, [0, 1], [0.85, 1]);

          // Hover-like float after entrance
          const floatY = interpolate(
            frame - delay,
            [20, 40, 60, 80],
            [0, -6, 0, -6],
            { extrapolateLeft: "clamp", extrapolateRight: "extend" }
          );

          // Image ken-burns inside card
          const imgScale = interpolate(
            frame,
            [delay, delay + 120],
            [1.0, 1.15],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius,
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 12px rgba(0,0,0,0.08)",
                transform: `translateY(${y + floatY}px) scale(${scale})`,
                opacity,
              }}
            >
              {card.type === "video" ? (
                <SafeVideo
                  src={card.img}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${imgScale})`,
                  }}
                />
              ) : (
                <SafeImg
                  src={card.img}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${imgScale})`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
