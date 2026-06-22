import { useCurrentFrame, useVideoConfig, interpolate, Easing, Img } from "remotion";

export type GPInfo = {
  label?: string;     // ex: "PROSSIMO GP"
  name: string;       // ex: "Gran Premio di Spagna"
  circuit: string;    // ex: "Barcelona-Catalunya"
  flagSrc?: string;   // bandeira do país
};

export type TrackMap3DProps = {
  width: number;
  height: number;
  gp: GPInfo;
  trackPath: string;   // path SVG do traçado (viewBox 0 0 100 100), com pathLength="1"
};

const HEAVY = "'Anton', 'Arial Narrow', sans-serif";
const BODY = "'Neue Haas Grotesk Display Pro', Arial, sans-serif";
const RED = "#D40000";
const YELLOW = "#FFE000";

export const TrackMap3D: React.FC<TrackMap3DProps> = ({ width, height, gp, trackPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = height / 325; // base de proporção
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // animação de desenho do traçado
  const draw = interpolate(frame, [10, 55], [0, 1], { ...clamp, easing: Easing.inOut(Easing.ease) });
  // leve giro de entrada
  const spin = interpolate(frame, [0, 60], [-14, 0], { ...clamp, easing: Easing.out(Easing.ease) });

  // entrada dos textos
  const inHead = interpolate(frame, [4, 22], [0, 1], clamp);

  // extrusão fake: várias cópias empilhadas pra dar "altura"
  const layers = 9;

  const leftW = width * 0.46;
  const trackBox = Math.min(width - leftW, height) * 0.96;

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", background: "radial-gradient(120% 100% at 50% 0%, #1c1c22 0%, #0b0b0e 70%)", display: "flex" }}>
      {/* brilho vermelho */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 70% at 75% 55%, rgba(212,0,0,0.22), transparent 60%)" }} />

      {/* ── ESQUERDA: info ─────────────────────────────── */}
      <div style={{ width: leftW, flexShrink: 0, padding: `${22 * scale}px ${12 * scale}px ${22 * scale}px ${22 * scale}px`, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 2, opacity: inHead, transform: `translateY(${(1 - inHead) * 10}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 * scale, marginBottom: 8 * scale }}>
          <div style={{ width: 6 * scale, height: 18 * scale, background: RED }} />
          <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 12 * scale, letterSpacing: 2.5, color: YELLOW, textTransform: "uppercase" }}>{gp.label ?? "PROSSIMO GP"}</span>
          {gp.flagSrc ? (
            <Img src={gp.flagSrc} style={{ width: 30 * scale, borderRadius: 3 * scale, border: "1px solid rgba(255,255,255,0.5)", flexShrink: 0 }} />
          ) : null}
        </div>
        <div style={{ fontFamily: HEAVY, fontSize: 30 * scale, color: "#fff", lineHeight: 0.94, textTransform: "uppercase" }}>{gp.name}</div>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 14 * scale, color: "#b9b9c2", marginTop: 6 * scale }}>{gp.circuit}</div>
      </div>

      {/* ── DIREITA: pista 3D (tilt + extrusão) ─────────── */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", perspective: `${900 * scale}px` }}>
        <div style={{ width: trackBox, height: trackBox, transform: `rotateX(58deg) rotateZ(${spin}deg)`, transformStyle: "preserve-3d" }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
            {/* extrusão: cópias empilhadas pra baixo, escurecendo */}
            {Array.from({ length: layers }).map((_, i) => {
              const t = i / (layers - 1);
              const shade = Math.round(40 + 30 * (1 - t));
              return (
                <path key={i} d={trackPath} pathLength={1} fill="none"
                  stroke={`rgb(${shade},${Math.round(shade * 0.15)},${Math.round(shade * 0.15)})`}
                  strokeWidth={5.2} strokeLinecap="round" strokeLinejoin="round"
                  transform={`translate(0 ${(layers - 1 - i) * 0.55})`} />
              );
            })}
            {/* superfície (asfalto) */}
            <path d={trackPath} pathLength={1} fill="none" stroke="#2a2a30" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            {/* linha de corrida vermelha (animada) */}
            <path d={trackPath} pathLength={1} fill="none" stroke={RED} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={1} strokeDashoffset={1 - draw}
              style={{ filter: `drop-shadow(0 0 ${3 * scale}px ${RED})` }} />
            {/* brilho branco fino por cima */}
            <path d={trackPath} pathLength={1} fill="none" stroke="#fff" strokeWidth={0.7} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={1} strokeDashoffset={1 - draw} opacity={0.85} />
          </svg>
        </div>
      </div>

    </div>
  );
};
