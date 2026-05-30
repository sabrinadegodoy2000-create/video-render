import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg, SafeVideo } from "./SafeMedia";

export interface CardSpreadProps {
  cards: { src: string; type?: "image" | "video" }[];
  enterFrame?: number;
}

/**
 * CardSpread — 3 cards em formato 9:16.
 * O card central aparece primeiro, depois dois saem de trás dele
 * deslizando para esquerda e direita.
 */
export const CardSpread: React.FC<CardSpreadProps> = ({
  cards = [],
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame() - enterFrame;
  const { fps } = useVideoConfig();

  if (frame < 0) return null;

  const CARD_W = 480;
  const CARD_H = 853; // ~9:16
  const CARD_RADIUS = 24;

  // Card central: aparece com scale spring
  const centerScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Cards laterais: saem de trás depois de ~20 frames
  const sideDelay = 20;
  const sideFrame = Math.max(0, frame - sideDelay);

  const sideProgress = spring({
    frame: sideFrame,
    fps,
    config: { damping: 14, stiffness: 60 },
  });

  // Posição X dos cards laterais (saem do centro pra fora)
  const SIDE_OFFSET = 500;
  const leftX = interpolate(sideProgress, [0, 1], [0, -SIDE_OFFSET]);
  const rightX = interpolate(sideProgress, [0, 1], [0, SIDE_OFFSET]);

  // Leve rotação nos cards laterais
  const leftRotate = interpolate(sideProgress, [0, 1], [0, -6]);
  const rightRotate = interpolate(sideProgress, [0, 1], [0, 6]);

  // Escala dos cards laterais (um pouco menores)
  const sideScale = interpolate(sideProgress, [0, 1], [0.85, 0.9]);

  // Opacidade dos cards laterais
  const sideOpacity = interpolate(sideProgress, [0, 1], [0, 1]);

  const cardStyle = (src: string): React.CSSProperties => ({
    width: CARD_W,
    height: CARD_H,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    position: "absolute" as const,
    boxShadow: "0 20px 50px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.15)",
  });

  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  const src0 = cards[0]?.src || "";
  const src1 = cards[1]?.src || cards[0]?.src || "";
  const src2 = cards[2]?.src || cards[0]?.src || "";
  const type0 = cards[0]?.type || "image";
  const type1 = cards[1]?.type || cards[0]?.type || "image";
  const type2 = cards[2]?.type || cards[0]?.type || "image";

  const MediaEl: React.FC<{ src: string; mtype: string; style: React.CSSProperties }> = ({ src, mtype, style }) =>
    mtype === "video" ? <SafeVideo src={src} style={style} /> : <SafeImg src={src} style={style} />;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Card esquerdo (atrás) */}
      <div
        style={{
          ...cardStyle(src1),
          transform: `translateX(${leftX}px) rotate(${leftRotate}deg) scale(${sideScale})`,
          opacity: sideOpacity,
          zIndex: 1,
        }}
      >
        {src1 && <MediaEl src={src1} mtype={type1} style={imgStyle} />}
      </div>

      {/* Card direito (atrás) */}
      <div
        style={{
          ...cardStyle(src2),
          transform: `translateX(${rightX}px) rotate(${rightRotate}deg) scale(${sideScale})`,
          opacity: sideOpacity,
          zIndex: 1,
        }}
      >
        {src2 && <MediaEl src={src2} mtype={type2} style={imgStyle} />}
      </div>

      {/* Card central (frente) */}
      <div
        style={{
          ...cardStyle(src0),
          transform: `scale(${centerScale})`,
          zIndex: 2,
        }}
      >
        {src0 && <MediaEl src={src0} mtype={type0} style={imgStyle} />}
      </div>
    </AbsoluteFill>
  );
};
