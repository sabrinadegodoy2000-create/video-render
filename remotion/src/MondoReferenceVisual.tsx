import { Img, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Standing } from "./DriverStandings";

const FONT = "'Inter', Arial, sans-serif";
const PILOTS_SECONDS = 8.041667;
const LOGO_SECONDS = 5.034667;
const HOLD_SECONDS = 30;

export const MondoReferenceSide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pilotFrames = Math.round(PILOTS_SECONDS * fps);
  const logoFrames = Math.round(LOGO_SECONDS * fps);
  const cycleFrames = pilotFrames + HOLD_SECONDS * fps;
  const cycleFrame = frame % cycleFrames;
  const frozen = cycleFrame >= pilotFrames;
  const neonOffset = -100 * ((frame / fps) % 6) / 6;

  return (
    <div style={{ position: "absolute", left: 1450, top: 0, width: 470, height: 1080, boxSizing: "border-box", overflow: "hidden", background: "#000", borderLeft: "6px solid #000", borderRight: "6px solid #000", borderTop: "3px solid #000", borderBottom: "3px solid #000", opacity: 1 }}>
      <Loop durationInFrames={cycleFrames}>
        <Sequence from={0} durationInFrames={pilotFrames} layout="none">
          <OffthreadVideo src={staticFile("mondo-reference-pilots.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
        <Sequence from={pilotFrames} durationInFrames={cycleFrames - pilotFrames} layout="none">
          <Img src={staticFile("mondo-reference-pilots-final.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
        <Sequence from={0} durationInFrames={logoFrames} layout="none">
          <OffthreadVideo src={staticFile("mondo-reference-logo.webm")} muted style={logoStyle} />
        </Sequence>
        <Sequence from={logoFrames} durationInFrames={cycleFrames - logoFrames} layout="none">
          <Img src={staticFile("mondo-reference-logo-final.png")} style={logoStyle} />
        </Sequence>
      </Loop>
      {frozen && <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <DriverTag name="LECLERC" left={7} frame={frame} fps={fps} phase={0} />
        <DriverTag name="HAMILTON" right={7} frame={frame} fps={fps} phase={Math.PI} />
      </div>}
      <svg viewBox="0 0 470 1080" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <rect x="4" y="4" width="462" height="1072" pathLength="100" fill="none" stroke="#ff2038" strokeWidth="9" strokeLinecap="round" strokeDasharray="8 92" strokeDashoffset={neonOffset} style={{ filter: "drop-shadow(0 0 7px #ff102a) drop-shadow(0 0 15px #ff102a)" }} />
        <rect x="4" y="4" width="462" height="1072" pathLength="100" fill="none" stroke="#fff1ed" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 92" strokeDashoffset={neonOffset} />
      </svg>
    </div>
  );
};

const logoStyle: React.CSSProperties = {
  position: "absolute", left: 0, top: 18, width: 430, height: 167, objectFit: "cover",
  maskImage: `url(${staticFile("mondo-reference-logo-final.png")})`,
  maskSize: "100% 100%", maskRepeat: "no-repeat",
};

const DriverTag: React.FC<{ name: string; left?: number; right?: number; frame: number; fps: number; phase: number }> = ({ name, left, right, frame, fps, phase }) => {
  const y = -3.5 + 3.5 * Math.cos(2 * Math.PI * frame / (fps * 4) + phase);
  const shine = ((frame / (fps * 4.5) + phase / (2 * Math.PI)) % 1) * 260 - 70;
  return <div style={{ position: "absolute", top: 214, left, right, width: 205, height: 51, display: "flex", alignItems: "center", gap: 5, padding: "0 7px", overflow: "hidden", color: "#fff", background: "linear-gradient(115deg,#626976 0%,#414855 54%,#252c38 100%)", border: "1px solid #a7aeb8", borderRadius: 7, boxShadow: "0 4px 0 #1b202b,0 12px 22px rgba(0,0,0,.6),inset 0 2px 1px rgba(255,255,255,.38)", transform: `perspective(500px) rotateX(5deg) translateY(${y}px)`, font: `800 19px/1 ${FONT}`, textShadow: "0 1px 3px rgba(0,0,0,.65)", whiteSpace: "nowrap" }}>
    <div style={{ position: "absolute", top: -15, left: shine, width: 40, height: 80, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.46),transparent)", transform: "skewX(-24deg)" }} />
    <Img src={staticFile("ferrari-f1-logo.png")} style={{ width: 46, height: 46, objectFit: "cover", flexShrink: 0, filter: "drop-shadow(0 1px 2px #000)" }} />
    <span style={{ position: "relative" }}>{name}</span>
  </div>;
};

export const MondoReferenceStandings: React.FC<{ standings: Standing[] }> = ({ standings }) => (
  <div style={{ position: "absolute", left: 24, top: 28, width: 226, padding: "12px 10px 10px", zIndex: 2, color: "#fff", background: "linear-gradient(180deg,rgba(12,15,21,.96),rgba(12,15,21,.84))", border: "1px solid rgba(255,255,255,.14)", borderRadius: 3, boxShadow: "0 12px 38px rgba(0,0,0,.45)", fontFamily: FONT, fontWeight: 800 }}>
    <Img src={staticFile("logo-f1-aqui.png")} style={{ display: "block", width: 190, height: 100, margin: "0 auto 5px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "1px 4px 12px", fontSize: 15, letterSpacing: 1.2 }}><span>CLASSIFICA PILOTI</span><small style={{ color: "#aeb5c0", fontSize: 11 }}>PT</small></div>
    {standings.slice(0, 10).map((s) => {
      const logo = s.teamLogoSrc || "";
      const ferrari = logo.includes("ferrari-f1-logo");
      const redbull = logo.includes("redbull-f1-logo");
      const mercedes = logo.includes("logo-mercedes");
      return <div key={`${s.pos}-${s.name}`} style={{ display: "grid", gridTemplateColumns: "28px 5px 31px 1fr 38px", alignItems: "center", gap: 7, height: 53, borderTop: "1px solid rgba(255,255,255,.12)" }}>
        <span style={{ textAlign: "center", fontSize: 23, fontVariantNumeric: "tabular-nums" }}>{s.pos}</span>
        <i style={{ height: 32, background: s.teamColor || "#aaa", borderRadius: 2 }} />
        {logo ? <Img src={logo} style={redbull ? { width: 60, height: 45, marginLeft: -15, objectFit: "contain" } : { width: 28, height: 26, objectFit: ferrari ? "cover" : "contain", transform: ferrari ? "scale(1.2)" : undefined, filter: mercedes ? "brightness(0) invert(1)" : undefined }} /> : <span />}
        <span style={{ fontSize: 20, letterSpacing: .3, color: ferrari ? "#ff4b46" : "#fff" }}>{s.name.slice(0, 3).toUpperCase()}</span>
        <span style={{ color: "#dbe0e8", textAlign: "right", fontSize: 17, fontVariantNumeric: "tabular-nums" }}>{s.points}</span>
      </div>;
    })}
  </div>
);

export const MondoReferenceFooter: React.FC<{ headline: string; subheadline: string; opacity: number }> = ({ headline, subheadline, opacity }) => (
  <div style={{ position: "absolute", left: 0, top: 930, width: 1450, height: 150, display: "flex", padding: "12px 24px", background: "linear-gradient(105deg,#250305 0%,#111114 43%,#181013 72%,#140404 100%)" }}>
    <div style={{ width: 900, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", opacity }}>
      <div style={{ maxWidth: 900, marginBottom: 5, fontFamily: FONT, fontWeight: 900, fontSize: 40, lineHeight: .92, letterSpacing: -1.6, textTransform: "uppercase", color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,.45)" }}>{headline}</div>
      <div style={{ maxWidth: 900, fontFamily: FONT, fontWeight: 700, fontSize: 19, lineHeight: 1.05, textTransform: "uppercase", color: "#e8e7e8" }}>{subheadline}</div>
    </div>
    <Img src={staticFile("mondo-reference-car.png")} style={{ position: "absolute", right: 10, bottom: 0, width: 580, height: "auto", filter: "drop-shadow(0 7px 9px rgba(0,0,0,.75))" }} />
  </div>
);
