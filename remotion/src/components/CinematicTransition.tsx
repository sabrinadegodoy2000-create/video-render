import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

export type TransitionType =
  | "crossfade"
  | "cinematic-bars"
  | "zoom-through"
  | "iris-wipe"
  | "glitch"
  | "blur-dissolve"
  | "slide-over"
  | "whip-pan";

interface Props {
  /** Tipo de transição */
  type: TransitionType;
  /** Duração em frames */
  durationFrames: number;
  /** Conteúdo da cena que está saindo */
  outgoing: React.ReactNode;
  /** Conteúdo da cena que está entrando */
  incoming: React.ReactNode;
}

/** Transição cinematográfica entre duas cenas */
export const CinematicTransition: React.FC<Props> = ({
  type,
  durationFrames,
  outgoing,
  incoming,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = frame / durationFrames; // 0 → 1

  switch (type) {
    case "crossfade":
      return <Crossfade progress={progress} outgoing={outgoing} incoming={incoming} />;
    case "cinematic-bars":
      return (
        <CinematicBars
          progress={progress}
          frame={frame}
          fps={fps}
          durationFrames={durationFrames}
          outgoing={outgoing}
          incoming={incoming}
        />
      );
    case "zoom-through":
      return <ZoomThrough progress={progress} frame={frame} fps={fps} outgoing={outgoing} incoming={incoming} />;
    case "iris-wipe":
      return <IrisWipe progress={progress} outgoing={outgoing} incoming={incoming} />;
    case "glitch":
      return <GlitchTransition progress={progress} frame={frame} outgoing={outgoing} incoming={incoming} />;
    case "blur-dissolve":
      return <BlurDissolve progress={progress} outgoing={outgoing} incoming={incoming} />;
    case "slide-over":
      return <SlideOver progress={progress} frame={frame} fps={fps} outgoing={outgoing} incoming={incoming} />;
    case "whip-pan":
      return <WhipPan progress={progress} frame={frame} fps={fps} outgoing={outgoing} incoming={incoming} />;
    default:
      return <Crossfade progress={progress} outgoing={outgoing} incoming={incoming} />;
  }
};

// ─── Crossfade ────────────────────────────────────────────────────────────────
const Crossfade: React.FC<{
  progress: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, outgoing, incoming }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ opacity: 1 - progress }}>{outgoing}</AbsoluteFill>
    <AbsoluteFill style={{ opacity: progress }}>{incoming}</AbsoluteFill>
  </AbsoluteFill>
);

// ─── Cinematic Bars ───────────────────────────────────────────────────────────
// Barras pretas fecham → abrem revelando a próxima cena
const CinematicBars: React.FC<{
  progress: number;
  frame: number;
  fps: number;
  durationFrames: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, frame, fps, durationFrames, outgoing, incoming }) => {
  // Fase 1 (0→0.5): barras fecham sobre a cena atual
  // Fase 2 (0.5→1): barras abrem revelando a nova cena
  const barHeight = interpolate(
    progress,
    [0, 0.45, 0.55, 1],
    [0, 55, 55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const showIncoming = progress > 0.5;

  return (
    <AbsoluteFill>
      {/* Cena de fundo */}
      <AbsoluteFill>{showIncoming ? incoming : outgoing}</AbsoluteFill>

      {/* Barra superior */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${barHeight}%`,
          backgroundColor: "#000",
          zIndex: 10,
        }}
      />
      {/* Barra inferior */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${barHeight}%`,
          backgroundColor: "#000",
          zIndex: 10,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Zoom Through ─────────────────────────────────────────────────────────────
// Cena atual faz zoom in rápido + blur → nova cena aparece com zoom out
const ZoomThrough: React.FC<{
  progress: number;
  frame: number;
  fps: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, frame, fps, outgoing, incoming }) => {
  const outScale = interpolate(progress, [0, 0.5], [1, 2.5], {
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const outBlur = interpolate(progress, [0, 0.5], [0, 15], {
    extrapolateRight: "clamp",
  });
  const outOpacity = interpolate(progress, [0.3, 0.52], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const inScale = interpolate(progress, [0.5, 1], [0.5, 1], {
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const inBlur = interpolate(progress, [0.5, 0.7], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inOpacity = interpolate(progress, [0.48, 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${outScale})`,
          filter: `blur(${outBlur}px)`,
          opacity: outOpacity,
        }}
      >
        {outgoing}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${inScale})`,
          filter: `blur(${inBlur}px)`,
          opacity: inOpacity,
        }}
      >
        {incoming}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Iris Wipe ────────────────────────────────────────────────────────────────
// Círculo expandindo do centro revelando a nova cena
const IrisWipe: React.FC<{
  progress: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, outgoing, incoming }) => {
  // Círculo cresce de 0% a 150% (para cobrir os cantos)
  const radius = interpolate(progress, [0, 1], [0, 150], {
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill>{outgoing}</AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: `circle(${radius}% at 50% 50%)`,
        }}
      >
        {incoming}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Glitch ───────────────────────────────────────────────────────────────────
// Efeito de glitch digital entre cenas
const GlitchTransition: React.FC<{
  progress: number;
  frame: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, frame, outgoing, incoming }) => {
  const showIncoming = progress > 0.5;
  const glitchIntensity = interpolate(
    progress,
    [0, 0.3, 0.5, 0.7, 1],
    [0, 1, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Pseudo-random offsets baseados no frame
  const offsetX = Math.sin(frame * 17.3) * 30 * glitchIntensity;
  const offsetY = Math.cos(frame * 23.7) * 10 * glitchIntensity;
  const skew = Math.sin(frame * 11.1) * 5 * glitchIntensity;

  // RGB split
  const rgbOffset = 8 * glitchIntensity;

  // Barras de scanline
  const scanlineHeight = Math.abs(Math.sin(frame * 7.3)) * 200 * glitchIntensity;
  const scanlineY = (frame * 13) % 1080;

  return (
    <AbsoluteFill>
      <AbsoluteFill>{showIncoming ? incoming : outgoing}</AbsoluteFill>

      {/* RGB split layer */}
      {glitchIntensity > 0.1 && (
        <>
          <AbsoluteFill
            style={{
              opacity: 0.4 * glitchIntensity,
              transform: `translate(${rgbOffset}px, 0)`,
              mixBlendMode: "screen",
              filter: "hue-rotate(120deg)",
            }}
          >
            {showIncoming ? incoming : outgoing}
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              opacity: 0.3 * glitchIntensity,
              transform: `translate(${-rgbOffset}px, ${offsetY}px) skewX(${skew}deg)`,
              mixBlendMode: "screen",
              filter: "hue-rotate(240deg)",
            }}
          >
            {showIncoming ? incoming : outgoing}
          </AbsoluteFill>
        </>
      )}

      {/* Scanline */}
      {glitchIntensity > 0.3 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scanlineY,
            height: scanlineHeight,
            backgroundColor: "rgba(255,255,255,0.08)",
            zIndex: 20,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ─── Blur Dissolve ────────────────────────────────────────────────────────────
// Cena atual fica blur e dissolve na próxima
const BlurDissolve: React.FC<{
  progress: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, outgoing, incoming }) => {
  const outBlur = interpolate(progress, [0, 0.6], [0, 20], {
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const outOpacity = interpolate(progress, [0.2, 0.7], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const inBlur = interpolate(progress, [0.4, 1], [15, 0], {
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const inOpacity = interpolate(progress, [0.3, 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{ filter: `blur(${outBlur}px)`, opacity: outOpacity }}
      >
        {outgoing}
      </AbsoluteFill>
      <AbsoluteFill
        style={{ filter: `blur(${inBlur}px)`, opacity: inOpacity }}
      >
        {incoming}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Slide Over ───────────────────────────────────────────────────────────────
// Nova cena desliza por cima da atual com sombra
const SlideOver: React.FC<{
  progress: number;
  frame: number;
  fps: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, frame, fps, outgoing, incoming }) => {
  const slideX = interpolate(progress, [0, 1], [100, 0], {
    easing: Easing.out(Easing.cubic),
  });

  // Cena antiga escurece levemente
  const outDarken = interpolate(progress, [0, 1], [0, 0.5]);

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        {outgoing}
        <AbsoluteFill
          style={{ backgroundColor: `rgba(0,0,0,${outDarken})` }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translateX(${slideX}%)`,
          boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
        }}
      >
        {incoming}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Whip Pan ─────────────────────────────────────────────────────────────────
// Simula câmera movendo rápido lateralmente com motion blur
const WhipPan: React.FC<{
  progress: number;
  frame: number;
  fps: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}> = ({ progress, frame, fps, outgoing, incoming }) => {
  // Cena atual sai pela esquerda com blur
  const outX = interpolate(progress, [0, 0.5], [0, -120], {
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const outBlur = interpolate(progress, [0, 0.3, 0.5], [0, 0, 30], {
    extrapolateRight: "clamp",
  });

  // Nova cena entra pela direita com blur
  const inX = interpolate(progress, [0.5, 1], [120, 0], {
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const inBlur = interpolate(progress, [0.5, 0.7, 1], [30, 0, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translateX(${outX}%)`,
          filter: `blur(${outBlur}px)`,
        }}
      >
        {outgoing}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translateX(${inX}%)`,
          filter: `blur(${inBlur}px)`,
        }}
      >
        {incoming}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
