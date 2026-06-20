import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export type InstagramBarProps = {
  handle: string;       // @ da conta
  appearAtSec?: number; // segundo em que aparece (uma única vez)
};

const FONT = "'Neue Haas Grotesk Display Pro', 'Helvetica Neue', Arial, sans-serif";

// Ícone do Instagram desenhado em SVG (degradê oficial) — sem PNG
const InstagramIcon: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#feda75" />
        <stop offset="0.25" stopColor="#fa7e1e" />
        <stop offset="0.5" stopColor="#d62976" />
        <stop offset="0.75" stopColor="#962fbf" />
        <stop offset="1" stopColor="#4f5bd5" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#ig-grad)" />
    <rect x="14" y="14" width="36" height="36" rx="11" fill="none" stroke="#fff" strokeWidth="4" />
    <circle cx="32" cy="32" r="9" fill="none" stroke="#fff" strokeWidth="4" />
    <circle cx="44.5" cy="19.5" r="2.9" fill="#fff" />
  </svg>
);

export const InstagramBar: React.FC<InstagramBarProps> = ({ handle, appearAtSec = 15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // aparece UMA vez: t=0 no momento de aparecer; some depois de ~5s e nunca mais volta
  const t = frame / fps - appearAtSec;
  const slideIn = interpolate(t, [0, 0.5], [0, 1], clamp);
  const slideOut = interpolate(t, [4.5, 5.0], [1, 0], clamp);
  const visible = slideIn * slideOut;
  const offsetY = interpolate(t, [0, 0.5, 4.5, 5.0], [120, 0, 0, 120], clamp);

  const BAR_H = 116;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 110,
        opacity: visible,
        transform: `translateX(-50%) translateY(${offsetY}px)`,
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          height: BAR_H,
          padding: "0 40px 0 22px",
          borderRadius: 30,
          background: "#ffffff",
          boxShadow: "0 12px 34px rgba(0,0,0,0.30)",
        }}
      >
        <InstagramIcon size={BAR_H - 44} />
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#0f0f0f", whiteSpace: "nowrap" }}>
          {handle}
        </span>
      </div>
    </div>
  );
};
