import { FONT_FAMILY, LETTER_SPACING } from "../theme";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export type LowerThirdStyle =
  | "sports-bar"
  | "news-ticker"
  | "minimal-slide"
  | "f1-style"
  | "gradient-bar";

export interface LowerThirdProps {
  /** Estilo visual */
  style?: LowerThirdStyle;
  /** Texto principal (título) */
  title: string;
  /** Texto secundário (subtítulo) */
  subtitle?: string;
  /** Cor primária */
  primaryColor?: string;
  /** Cor secundária / accent */
  accentColor?: string;
  /** Frame de entrada */
  enterFrame?: number;
  /** Frame de saída */
  exitFrame?: number;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  style = "sports-bar",
  title,
  subtitle,
  primaryColor = "#dc2626",
  accentColor = "#ffffff",
  enterFrame = 0,
  exitFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const actualExit = exitFrame ?? durationInFrames - 20;

  switch (style) {
    case "sports-bar":
      return (
        <SportsBar
          title={title} subtitle={subtitle}
          primaryColor={primaryColor} accentColor={accentColor}
          enterFrame={enterFrame} exitFrame={actualExit}
          frame={frame} fps={fps}
        />
      );
    case "news-ticker":
      return (
        <NewsTicker
          title={title} subtitle={subtitle}
          primaryColor={primaryColor} accentColor={accentColor}
          enterFrame={enterFrame} exitFrame={actualExit}
          frame={frame} fps={fps}
        />
      );
    case "minimal-slide":
      return (
        <MinimalSlide
          title={title} subtitle={subtitle}
          primaryColor={primaryColor} accentColor={accentColor}
          enterFrame={enterFrame} exitFrame={actualExit}
          frame={frame} fps={fps}
        />
      );
    case "f1-style":
      return (
        <F1Style
          title={title} subtitle={subtitle}
          primaryColor={primaryColor} accentColor={accentColor}
          enterFrame={enterFrame} exitFrame={actualExit}
          frame={frame} fps={fps}
        />
      );
    case "gradient-bar":
      return (
        <GradientBar
          title={title} subtitle={subtitle}
          primaryColor={primaryColor} accentColor={accentColor}
          enterFrame={enterFrame} exitFrame={actualExit}
          frame={frame} fps={fps}
        />
      );
    default:
      return null;
  }
};

interface StyleInternalProps {
  title: string;
  subtitle?: string;
  primaryColor: string;
  accentColor: string;
  enterFrame: number;
  exitFrame: number;
  frame: number;
  fps: number;
}

// ─── Sports Bar ───────────────────────────────────────────────────────────────
// Barra sólida com accent strip lateral, estilo ESPN/SporTV
const SportsBar: React.FC<StyleInternalProps> = ({
  title, subtitle, primaryColor, accentColor, enterFrame, exitFrame, frame, fps,
}) => {
  const enterProg = spring({ frame: frame - enterFrame, fps, config: { damping: 18, stiffness: 120, mass: 0.6 } });
  const exitProg = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 12], [0, 100], { extrapolateRight: "clamp" })
    : 0;

  const slideX = interpolate(enterProg, [0, 1], [-100, 0]);
  const accentWidth = interpolate(enterProg, [0, 1], [0, 6]);

  return (
    <div style={{
      position: "absolute", bottom: 80, left: 60,
      transform: `translateX(${slideX + exitProg}%)`,
      display: "flex", alignItems: "stretch",
    }}>
      {/* Accent strip */}
      <div style={{
        width: accentWidth,
        backgroundColor: accentColor,
        borderRadius: "3px 0 0 3px",
      }} />
      {/* Main bar */}
      <div style={{
        backgroundColor: primaryColor,
        padding: "28px 60px 28px 36px",
        borderRadius: "0 6px 6px 0",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{
          fontSize: 52, fontWeight: 800, color: "white",
          fontFamily: FONT_FAMILY,
          textTransform: "uppercase", letterSpacing: LETTER_SPACING,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.85)",
            fontFamily: FONT_FAMILY,
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── News Ticker ──────────────────────────────────────────────────────────────
// Barra de notícia com label + conteúdo, estilo GloboNews
const NewsTicker: React.FC<StyleInternalProps> = ({
  title, subtitle, primaryColor, accentColor, enterFrame, exitFrame, frame, fps,
}) => {
  const enterProg = spring({ frame: frame - enterFrame, fps, config: { damping: 20, stiffness: 100, mass: 0.5 } });
  const exitProg = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 10], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  const scaleY = interpolate(enterProg, [0, 1], [0, 1]);

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      transform: `scaleY(${scaleY * exitProg})`,
      transformOrigin: "bottom",
      display: "flex", alignItems: "stretch",
    }}>
      {/* Label */}
      <div style={{
        backgroundColor: primaryColor,
        padding: "22px 36px",
        display: "flex", alignItems: "center",
      }}>
        <span style={{
          fontSize: 32, fontWeight: 800, color: "white",
          fontFamily: FONT_FAMILY,
          textTransform: "uppercase", letterSpacing: LETTER_SPACING,
        }}>
          {subtitle || "AGORA"}
        </span>
      </div>
      {/* Content */}
      <div style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: "22px 40px",
        display: "flex", alignItems: "center",
      }}>
        <span style={{
          fontSize: 36, fontWeight: 600, color: "white",
          fontFamily: FONT_FAMILY,
        }}>
          {title}
        </span>
      </div>
    </div>
  );
};

// ─── Minimal Slide ────────────────────────────────────────────────────────────
// Estilo clean/minimalista com linha fina
const MinimalSlide: React.FC<StyleInternalProps> = ({
  title, subtitle, primaryColor, accentColor, enterFrame, exitFrame, frame, fps,
}) => {
  const enterProg = spring({ frame: frame - enterFrame, fps, config: { damping: 22, stiffness: 90, mass: 0.7 } });
  const exitProg = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 15], [0, -50], { extrapolateRight: "clamp" })
    : 0;

  const lineWidth = interpolate(enterProg, [0, 1], [0, 100]);
  const textOpacity = interpolate(enterProg, [0.3, 1], [0, 1], { extrapolateLeft: "clamp" });
  const textY = interpolate(enterProg, [0.3, 1], [20, 0], { extrapolateLeft: "clamp" });

  return (
    <div style={{
      position: "absolute", bottom: 100, left: 80,
      transform: `translateY(${exitProg}px)`,
      opacity: frame >= exitFrame ? interpolate(frame, [exitFrame, exitFrame + 15], [1, 0], { extrapolateRight: "clamp" }) : 1,
    }}>
      {/* Linha accent */}
      <div style={{
        width: `${lineWidth}%`,
        maxWidth: 400,
        height: 3,
        backgroundColor: primaryColor,
        marginBottom: 12,
      }} />
      <div style={{
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
      }}>
        <div style={{
          fontSize: 52, fontWeight: 700, color: "white",
          fontFamily: FONT_FAMILY,
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 30, fontWeight: 400, color: "rgba(255,255,255,0.8)",
            fontFamily: FONT_FAMILY,
            marginTop: 8,
            textShadow: "0 1px 4px rgba(0,0,0,0.7)",
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── F1 Style ─────────────────────────────────────────────────────────────────
// Inspirado nos gráficos oficiais da F1, com shape angular
const F1Style: React.FC<StyleInternalProps> = ({
  title, subtitle, primaryColor, accentColor, enterFrame, exitFrame, frame, fps,
}) => {
  const enterProg = spring({ frame: frame - enterFrame, fps, config: { damping: 15, stiffness: 130, mass: 0.5 } });
  const exitProg = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 8], [0, 110], { extrapolateRight: "clamp" })
    : 0;

  const slideX = interpolate(enterProg, [0, 1], [-110, 0]);

  return (
    <div style={{
      position: "absolute", bottom: 80, left: 0,
      transform: `translateX(${slideX + exitProg}%)`,
      display: "flex", alignItems: "flex-end",
    }}>
      {/* Shape angular principal */}
      <div style={{
        backgroundColor: primaryColor,
        padding: "26px 60px 26px 70px",
        clipPath: "polygon(0 0, 100% 0, calc(100% - 24px) 100%, 0 100%)",
        minWidth: 350,
      }}>
        <div style={{
          fontSize: 50, fontWeight: 900, color: "white",
          fontFamily: FONT_FAMILY,
          textTransform: "uppercase", letterSpacing: LETTER_SPACING,
        }}>
          {title}
        </div>
      </div>
      {/* Tag secundária */}
      {subtitle && (
        <div style={{
          backgroundColor: "rgba(0,0,0,0.9)",
          padding: "16px 36px 16px 22px",
          clipPath: "polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)",
          marginLeft: -24,
        }}>
          <div style={{
            fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.9)",
            fontFamily: FONT_FAMILY,
          }}>
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Gradient Bar ─────────────────────────────────────────────────────────────
// Barra com gradiente moderno
const GradientBar: React.FC<StyleInternalProps> = ({
  title, subtitle, primaryColor, accentColor, enterFrame, exitFrame, frame, fps,
}) => {
  const enterProg = spring({ frame: frame - enterFrame, fps, config: { damping: 16, stiffness: 110, mass: 0.5 } });
  const exitProg = frame >= exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 12], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  const width = interpolate(enterProg, [0, 1], [0, 100]);

  return (
    <div style={{
      position: "absolute", bottom: 80, left: 60, right: 60,
      opacity: exitProg,
    }}>
      <div style={{
        width: `${width}%`,
        maxWidth: 700,
        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc, rgba(0,0,0,0.85))`,
        borderRadius: 10,
        padding: "28px 48px",
        backdropFilter: "blur(10px)",
        border: `1px solid ${primaryColor}66`,
      }}>
        <div style={{
          fontSize: 48, fontWeight: 800, color: "white",
          fontFamily: FONT_FAMILY,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 28, fontWeight: 400, color: "rgba(255,255,255,0.75)",
            fontFamily: FONT_FAMILY,
            marginTop: 8,
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
