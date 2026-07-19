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
  accentColor?: string;   // cor do tracinho + texto do selo (default = vermelho Ferrari)
  headingFont?: string;   // fonte de posição/nome/pontos (default = Anton)
  headingWeight?: number; // peso do headingFont (default = 400, o único peso do Anton)
  bodyFont?: string;      // fonte do selo "CLASSIFICA PILOTI" (default = Neue Haas Grotesk)
  showHeader?: boolean;   // mostra o selo "CLASSIFICA PILOTI" no topo (default = true)
  showLogo?: boolean;     // mostra o logo da montadora em cada linha (default = true)
  visibleRows?: number;   // quantas linhas aparecem por vez
  holdSec?: number;       // segundos parado (no topo e no fim)
  perRowSec?: number;     // velocidade do scroll (segundos por linha)
};

const HEAVY = "'Anton', 'Arial Narrow', sans-serif"; // condensada pesada, estilo F1
const BODY = "'Neue Haas Grotesk Display Pro', Arial, sans-serif";
const RED = "#D40000";

function darken(hex: string, amt = 0.74) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const d = (v: number) => Math.round(v * (1 - amt));
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`;
}

const Row: React.FC<{ s: Standing; rowH: number; headingFont: string; headingWeight?: number; showLogo: boolean }> = ({ s, rowH, headingFont, headingWeight, showLogo }) => {
  // largura das colunas FIXA (não proporcional a rowH) — senão, com poucas linhas
  // visíveis numa faixa alta, essas colunas incham e sobra quase nada pro nome.
  const posW = 54;
  const logoW = 58;
  const ptsW = 74;
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
        <span style={{ fontFamily: headingFont, fontWeight: headingWeight, fontSize: 28, color: "#fff", lineHeight: 1 }}>{s.pos}</span>
      </div>

      {/* logo da montadora (opcional) */}
      {showLogo ? (
        <div style={{ width: logoW, height: "100%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {s.teamLogoSrc ? (
            <Img src={s.teamLogoSrc} style={{ width: `${Math.min(80, 50 * (s.logoScale ?? 1))}%`, height: `${Math.min(80, 50 * (s.logoScale ?? 1))}%`, objectFit: "contain" }} />
          ) : (
            <div style={{ width: "44%", height: "44%", borderRadius: 5, background: "rgba(255,255,255,0.85)" }} />
          )}
        </div>
      ) : null}

      {/* nome — fica com o espaço que sobra (a maior parte da linha) */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 12, paddingRight: 6, overflow: "hidden" }}>
        <span style={{ display: "block", fontFamily: headingFont, fontWeight: headingWeight, fontSize: 23, color: "#fff", letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 6px rgba(0,0,0,0.55)" }}>
          {s.name}
        </span>
      </div>

      {/* pontos */}
      <div style={{ width: ptsW, height: "100%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
        <span style={{ fontFamily: headingFont, fontWeight: headingWeight, fontSize: 26, color: "#fff", lineHeight: 1 }}>{s.points}</span>
      </div>
    </div>
  );
};

export const DriverStandings: React.FC<DriverStandingsProps> = ({
  width,
  height,
  title = "CLASSIFICA PILOTI",
  standings,
  accentColor = RED,
  headingFont = HEAVY,
  headingWeight,
  bodyFont = BODY,
  showHeader = true,
  showLogo = true,
  visibleRows = 4,
  holdSec = 5,
  perRowSec = 1.4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerH = showHeader ? 46 : 0; // selo fixo e enxuto — some se showHeader=false
  const rowsAreaH = height - headerH;
  const MAX_ROW_H = 84; // trava a altura da linha — senão, com poucas linhas numa faixa
  // alta, cada linha vira gigante (era o motivo do "nome cortado pra 1 letra")
  const rowH = Math.min(MAX_ROW_H, rowsAreaH / visibleRows);
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
    <div style={{ width, height, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* selo (eyebrow) — mesmo estilo do "PROSSIMO GP": sem caixa/fundo próprio, herda o painel */}
      {showHeader ? (
        <div style={{ height: headerH, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: `0 ${Math.round(width * 0.055)}px`, minWidth: 0 }}>
          <div style={{ width: 6, height: 18, background: accentColor, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontFamily: bodyFont, fontWeight: 800, fontSize: 15, letterSpacing: 2.2, color: accentColor, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </span>
        </div>
      ) : null}

      {/* área que rola */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${scroll}px)` }}>
          {standings.map((s, i) => (
            <Row key={i} s={s} rowH={rowH} headingFont={headingFont} headingWeight={headingWeight} showLogo={showLogo} />
          ))}
        </div>
      </div>
    </div>
  );
};
