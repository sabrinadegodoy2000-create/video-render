import React, { useState, useCallback } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Img,
  OffthreadVideo,
  Loop,
} from "remotion";
import { Segment } from "../types";

interface Props {
  segment: Segment;
  durationFrames: number;
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$|%)/i;

/** Renderiza um segmento de imagem ou vídeo com animações */
export const SegmentClip: React.FC<Props> = ({ segment, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = frame / durationFrames; // 0 → 1

  // Portrait detection: apenas para imagens (via onLoad, sem requisições async).
  // Vídeos são sempre 1920×1080 após normalização no backend — portrait não se aplica.
  const [isPortrait, setIsPortrait] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState(9 / 16);

  // Força tipo correto baseado na extensão do arquivo (última linha de defesa)
  const effectiveType =
    segment.type === "image" &&
    segment.src &&
    VIDEO_EXT_RE.test(decodeURIComponent(segment.src))
      ? "video"
      : segment.type;

  // Duração do vídeo em frames — vem direto do segment (sem getVideoMetadata).
  // Usada para loopar clipes mais curtos que a cena (evita freeze no último frame).
  const videoDurationFrames =
    effectiveType === "video" && segment.durationSec && segment.durationSec > 0
      ? Math.max(1, Math.floor(segment.durationSec * fps))
      : null;

  /**
   * Helper: renderiza o <OffthreadVideo>, envolvido em <Loop> quando o clipe é mais curto
   * que a duração da cena. Evita o freeze no último frame.
   */
  const renderVideo = (style: React.CSSProperties) => {
    const video = (
      <OffthreadVideo src={segment.src!} style={style} volume={0} muted />
    );
    if (
      videoDurationFrames &&
      videoDurationFrames > 0 &&
      videoDurationFrames < durationFrames
    ) {
      return <Loop durationInFrames={videoDurationFrames}>{video}</Loop>;
    }
    return video;
  };

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio < 0.75) {
      setIsPortrait(true);
      setNaturalRatio(ratio);
    }
  }, []);

  // Fallback: sem src, renderiza fundo preto
  if (!segment.src) {
    return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  }

  // Flip + blur (anti-copyright)
  const flipBlurStyle: React.CSSProperties = segment.flipBlur
    ? { transform: "scaleX(-1)", filter: "blur(4px)" }
    : {};

  // Animações
  const animationStyle = getAnimationStyle(
    segment.animation || "ken-burns",
    progress,
    frame,
    fps
  );

  // --- Modo retrato: apenas imagens (vídeos são sempre landscape após normalização) ---
  if (isPortrait && effectiveType !== "video") {
    const maxH = height * 0.85;
    const cardH = maxH;
    const cardW = cardH * naturalRatio;

    const floatY = interpolate(
      Math.sin(progress * Math.PI * 2),
      [-1, 1],
      [-6, 6]
    );

    const mediaStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      ...flipBlurStyle,
    };

    return (
      <AbsoluteFill
        style={{
          backgroundColor: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: cardW,
            height: cardH,
            borderRadius: 20,
            overflow: "hidden",
            transform: `translateY(${floatY}px) perspective(800px) rotateX(1deg)`,
            boxShadow: "0 25px 60px rgba(0,0,0,0.25), 0 10px 20px rgba(0,0,0,0.15)",
          }}
        >
          <Img src={segment.src} style={mediaStyle} onLoad={handleImageLoad} />
        </div>
      </AbsoluteFill>
    );
  }

  // --- Modo padrão: preenche tela inteira ---
  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  };

  const isIsometric = (segment.animation || "ken-burns") === "isometric";

  // Isométrico: aplica o transform 3D num wrapper externo para que box-shadow seja visível
  if (isIsometric) {
    const mediaStyle: React.CSSProperties = { ...baseStyle, ...flipBlurStyle };
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", ...animationStyle }}>
          {effectiveType === "video"
            ? renderVideo(mediaStyle)
            : <Img src={segment.src} style={mediaStyle} onLoad={handleImageLoad} />}
        </div>
      </AbsoluteFill>
    );
  }

  const combinedStyle: React.CSSProperties = {
    ...baseStyle,
    ...flipBlurStyle,
    ...animationStyle,
  };

  if (effectiveType === "video") {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {renderVideo(combinedStyle)}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={segment.src}
        style={combinedStyle}
        onLoad={handleImageLoad}
      />
    </AbsoluteFill>
  );
};

function getAnimationStyle(
  animation: string,
  progress: number,
  frame: number,
  fps: number
): React.CSSProperties {
  switch (animation) {
    case "ken-burns": {
      const scale = interpolate(progress, [0, 1], [1.0, 1.15]);
      const tx = interpolate(progress, [0, 1], [0, -2]);
      const ty = interpolate(progress, [0, 1], [0, -1]);
      return {
        transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
      };
    }
    case "zoom-in": {
      const scale = interpolate(progress, [0, 1], [1.0, 1.25]);
      return { transform: `scale(${scale})` };
    }
    case "zoom-out": {
      const scale = interpolate(progress, [0, 1], [1.2, 1.0]);
      return { transform: `scale(${scale})` };
    }
    case "pan-left": {
      const tx = interpolate(progress, [0, 1], [5, -5]);
      return { transform: `scale(1.1) translateX(${tx}%)` };
    }
    case "pan-right": {
      const tx = interpolate(progress, [0, 1], [-5, 5]);
      return { transform: `scale(1.1) translateX(${tx}%)` };
    }
    case "isometric": {
      // Settle de perspectiva 3D → plano em 1.8s com easing suave
      const SETTLE = Math.round(fps * 1.8);
      const t = Math.min(frame / Math.max(1, SETTLE), 1);
      const eased = Easing.bezier(0.25, 0.46, 0.45, 0.94)(t);
      const rx = interpolate(eased, [0, 1], [22, 0]);
      const ry = interpolate(eased, [0, 1], [22, 0]);
      const rz = interpolate(eased, [0, 1], [-5, 0]);
      const sc = interpolate(eased, [0, 1], [1.2, 1.0]);
      const shadowA = interpolate(eased, [0, 1], [0.6, 0]);
      return {
        transform: `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`,
        transformOrigin: "center center",
        boxShadow: `20px 40px 80px rgba(0,0,0,${shadowA.toFixed(2)})`,
      };
    }
    case "none":
    default:
      return {};
  }
}
