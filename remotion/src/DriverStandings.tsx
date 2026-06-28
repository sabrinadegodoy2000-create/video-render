import { Img, useCurrentFrame, useVideoConfig } from "remotion";

export type Standing = {
  pos: number;
  name: string;
  points: number;
  teamColor: string;       // cor da equipe (preenche a linha)
  teamLogoSrc?: string;    // logo da equipe/montadora
  logoScale?: number;      // ajuste fino do tamanho do logo (1 = padrão)
  team?: string;           // constructorId (ex: "ferrari") — resolve cor/logo automaticamente
};

export type DriverStandingsProps = {
  width: number;   // largura do painel (px)
  height: number;  // altura do painel (px)
  title?: string;
  standings: Standing[];
  f1LogoSrc?: string;
  visibleRows?: number;   // quantas linhas aparecem por vez
  holdSec?: number;       // segundos parado (no topo e no fim)
  perRowSec?: number;     // velocidade do scroll (segundos por linha)
};

const HEAVY = "'Anton', 'Arial Narrow', sans-serif"; // condensada pesada, estilo F1

function darken(hex: string, amt = 0.74) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const d = (v: number) => Math.round(v * (1 - amt));
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`;
}

const Row: React.FC<{ s: Standing; rowH: number }> = ({ s, rowH }) => {
  const posW = rowH * 0.78;
  const logoW = rowH * 0.92;
  const ptsW = rowH * 1.25;
  return (
    <div
      style={{
        position: "relative",
        height: rowH,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: `linear-gradient(100deg, ${s.teamColor} 0%, ${s.teamColor} 40%, ${darken(s.teamColor)} 82%)`,
        borderTop: "2px solid rgba(0,0,0,0.5)",
      }}
    >
      {/* posição */}
      <div style={{ width: posW, height: "100%", flexShrink: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: HEAVY, fontSize: rowH * 0.52, color: "#fff", lineHeight: 1 }}>{s.pos}</span>
      </div>

      {/* logo da montadora */}
      <div style={{ width: logoW, height: "100%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {s.teamLogoSrc ? (
          <Img src={s.teamLogoSrc} style={{ width: `${Math.min(98, 64 * (s.logoScale ?? 1))}%`, height: `${Math.min(98, 64 * (s.logoScale ?? 1))}%`, objectFit: "contain" }} />
        ) : (
          <div style={{ width: "44%", height: "44%", borderRadius: 5, background: "rgba(255,255,255,0.85)" }} />
        )}
      </div>

      {/* nome */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 14, paddingRight: 6 }}>
        <span style={{ fontFamily: HEAVY, fontSize: rowH * 0.44, color: "#fff", letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap", textShadow: "0 2px 6px rgba(0,0,0,0.55)" }}>
          {s.name}
        </span>
      </div>

      {/* pontos */}
      <div style={{ width: ptsW, height: "100%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
        <span style={{ fontFamily: HEAVY, fontSize: rowH * 0.52, color: "#fff", lineHeight: 1 }}>{s.points}</span>
      </div>
    </div>
  );
};

export const DriverStandings: React.FC<DriverStandingsProps> = ({
  width,
  height,
  title = "CLASSIFICA PILOTI",
  standings,
  f1LogoSrc,
  visibleRows = 3,
  holdSec = 5,
  perRowSec = 1.4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerH = Math.round(height * 0.2);
  const rowsAreaH = height - headerH;
  const rowH = rowsAreaH / visibleRows;
  const listH = standings.length * rowH;

  // Ciclo: 5s parado no topo → rola até o fim → 5s parado no fim → volta pro início
  const maxScroll = Math.max(0, listH - rowsAreaH);
  const scrollDur = Math.max(0.1, (maxScroll / rowH) * perRowSec);
  const cycleLen = holdSec + scrollDur + holdSec;
  const t = (frame / fps) % cycleLen;
  let scroll = 0;
  if (t <= holdSec) scroll = 0;                                       // pausa no topo
  else if (t < holdSec + scrollDur) scroll = -maxScroll * ((t - holdSec) / scrollDur); // rolando
  else scroll = -maxScroll;                                           // pausa no fim

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: "#0a0a0c", overflow: "hidden" }}>
      {/* cabeçalho fixo */}
      <div style={{ height: headerH, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: `0 ${Math.round(width * 0.03)}px`, background: "linear-gradient(90deg, #1a1a1d, #2a0606)", borderBottom: "3px solid #D40000" }}>
        {f1LogoSrc ? <Img src={f1LogoSrc} style={{ height: headerH * 0.66, objectFit: "contain" }} /> : null}
        <span style={{ fontFamily: HEAVY, fontSize: headerH * 0.46, color: "#fff", letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{title}</span>
      </div>

      {/* área que rola */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${scroll}px)` }}>
          {standings.map((s, i) => (
            <Row key={i} s={s} rowH={rowH} />
          ))}
        </div>
      </div>
    </div>
  );
};
