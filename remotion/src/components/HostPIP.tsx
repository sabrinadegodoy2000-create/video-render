import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SafeVideo } from "./SafeMedia";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface HostPIPProps {
  videoSrc: string;
  borderColor?: string;
  /** A que segundo do vídeo do host iniciar a reprodução nesta aparição */
  pipVideoStartSec?: number;
  enterFrame?: number;
}

// ── Componente de canto (L-bracket animado) ───────────────────────────────────

interface CornerProps {
  pos: "tl" | "tr" | "bl" | "br";
  len: number;       // comprimento atual do bracket (animado)
  color: string;
  pulse: number;
  bw: number;        // espessura da linha
}

const CornerBracket: React.FC<CornerProps> = ({ pos, len, color, pulse, bw }) => {
  const isRight  = pos === "tr" || pos === "br";
  const isBottom = pos === "bl" || pos === "br";
  const BK = 28; // tamanho máximo do bracket

  const glow = `0 0 6px ${color}, 0 0 16px ${color}`;

  return (
    <div style={{
      position: "absolute",
      top:    isBottom ? undefined : 0,
      bottom: isBottom ? 0        : undefined,
      left:   isRight  ? undefined : 0,
      right:  isRight  ? 0        : undefined,
      width:  BK,
      height: BK,
    }}>
      {/* Linha horizontal */}
      <div style={{
        position: "absolute",
        top:    isBottom ? undefined : 0,
        bottom: isBottom ? 0        : undefined,
        left:   isRight  ? undefined : 0,
        right:  isRight  ? 0        : undefined,
        width:  len,
        height: bw,
        background: color,
        boxShadow: glow,
        opacity: pulse,
        borderRadius: 1,
      }} />
      {/* Linha vertical */}
      <div style={{
        position: "absolute",
        top:    isBottom ? undefined : 0,
        bottom: isBottom ? 0        : undefined,
        left:   isRight  ? undefined : 0,
        right:  isRight  ? 0        : undefined,
        width:  bw,
        height: len,
        background: color,
        boxShadow: glow,
        opacity: pulse,
        borderRadius: 1,
      }} />
    </div>
  );
};

// ── HostPIP ───────────────────────────────────────────────────────────────────

export const HostPIP: React.FC<HostPIPProps> = ({
  videoSrc,
  borderColor = "#ef4444",
  pipVideoStartSec = 0,
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const SLIDE  = 15; // frames de slide (~0.5s a 30fps)
  const MARGIN = 24; // margem da borda da tela

  // ── Slide in (da direita) ─────────────────────────────────────────────────
  const slideIn = interpolate(
    frame,
    [enterFrame, enterFrame + SLIDE],
    [115, 0],
    {
      extrapolateLeft:  "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
    }
  );

  // ── Slide out (para a direita) ────────────────────────────────────────────
  const EXIT = durationInFrames - SLIDE;
  const slideOut = interpolate(
    frame,
    [EXIT, durationInFrames],
    [0, 115],
    {
      extrapolateLeft:  "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * t, // ease-in cubic
    }
  );

  const translateX = frame < EXIT ? slideIn : slideOut;

  // ── Brackets ─────────────────────────────────────────────────────────────
  const bIn = interpolate(frame, [enterFrame, enterFrame + SLIDE + 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const bOut = interpolate(frame, [EXIT - 6, EXIT], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const bracketP = Math.min(bIn, bOut);
  const BK_MAX   = 28;
  const bracketLen = BK_MAX * bracketP;

  // Pulso sutil na borda
  const pulse = 0.75 + 0.25 * Math.sin(frame * 0.13);

  // ── Dimensões do PiP ─────────────────────────────────────────────────────
  const pipHeight = Math.round(height * 0.60); // 60% da altura
  const pipWidth  = Math.round(pipHeight * 9 / 16); // proporção 9:16

  // ── Opacidade geral (fade curtíssimo na entrada) ──────────────────────────
  const opacity = interpolate(frame, [enterFrame, enterFrame + 6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <div style={{
        position:  "absolute",
        bottom:    MARGIN,
        right:     MARGIN,
        width:     pipWidth,
        height:    pipHeight,
        transform: `translateX(${translateX}%)`,
        borderRadius: 6,
        overflow:  "hidden",
        boxShadow: `0 0 0 2px ${borderColor}, 0 10px 40px rgba(0,0,0,0.7)`,
      }}>
        {/* Vídeo do host — sem som (narração é a única trilha) */}
        <SafeVideo
          src={videoSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          startFrom={Math.round(pipVideoStartSec * fps)}
          volume={0}
          muted
        />

        {/* Corner brackets por cima do vídeo */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <CornerBracket pos="tl" len={bracketLen} color={borderColor} pulse={pulse} bw={3} />
          <CornerBracket pos="tr" len={bracketLen} color={borderColor} pulse={pulse} bw={3} />
          <CornerBracket pos="bl" len={bracketLen} color={borderColor} pulse={pulse} bw={3} />
          <CornerBracket pos="br" len={bracketLen} color={borderColor} pulse={pulse} bw={3} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
