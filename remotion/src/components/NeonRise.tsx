import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SafeImg, SafeVideo } from "./SafeMedia";

export interface NeonRiseProps {
  mediaSrc: string;
  mediaType?: "image" | "video";
  /** Cor do neon nas bordas */
  neonColor?: string;
  backgroundColor?: string;
  enterFrame?: number;
}

export const NeonRise: React.FC<NeonRiseProps> = ({
  mediaSrc,
  mediaType = "image",
  neonColor = "#ff0000",
  backgroundColor = "#000000",
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Sobe de baixo para o centro
  const riseProg = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.8 },
  });
  const riseY = interpolate(riseProg, [0, 1], [800, 0]);
  const riseOpacity = interpolate(riseProg, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 2. Após subir, começa a diminuir lentamente
  const shrinkStart = enterFrame + 25;
  const shrinkProg = interpolate(
    frame,
    [shrinkStart, shrinkStart + 60],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const scale = interpolate(shrinkProg, [0, 1], [1, 0.72]);

  // 3. Neon glow pulsa
  const glowIntensity = interpolate(
    Math.sin((frame - enterFrame) * 0.12),
    [-1, 1],
    [0.6, 1]
  );

  // 4. Ângulo do traço de neon girando na borda
  const angle = ((frame - enterFrame) * 4) % 360;

  const mediaWidth = 1920 * 0.85;
  const mediaHeight = mediaWidth * 0.56;
  const borderSize = 3; // espessura da borda neon
  const radius = 16;

  const shadow = [
    `0 0 8px ${neonColor}70`,
    `0 0 20px ${neonColor}${Math.round(glowIntensity * 40).toString(16).padStart(2, "0")}`,
  ].join(", ");

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
      <div
        style={{
          transform: `translateY(${riseY}px) scale(${scale})`,
          opacity: riseOpacity,
          position: "relative",
          width: mediaWidth,
          height: mediaHeight,
        }}
      >
        {/* Camada do neon animado — gradiente cônico girando */}
        <div
          style={{
            position: "absolute",
            inset: -borderSize,
            borderRadius: radius + borderSize,
            background: `conic-gradient(from ${angle}deg, transparent 0%, ${neonColor} 10%, ${neonColor}ee 20%, transparent 35%, transparent 50%, ${neonColor}80 60%, ${neonColor} 70%, transparent 85%, transparent 100%)`,
            boxShadow: shadow,
            opacity: glowIntensity,
          }}
        />

        {/* Camada interna (fundo) que "recorta" o gradiente, deixando só a borda */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            backgroundColor,
            zIndex: 1,
          }}
        />

        {/* Mídia por cima */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: radius,
            overflow: "hidden",
            zIndex: 2,
          }}
        >
          {mediaType === "video" ? (
            <SafeVideo
              src={mediaSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
              }}
            />
          ) : (
            <SafeImg
              src={mediaSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
