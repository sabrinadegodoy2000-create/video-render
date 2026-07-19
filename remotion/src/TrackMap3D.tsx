import { useCurrentFrame, interpolate, Easing, Img } from "remotion";

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
  stacked?: boolean;   // true = info EM CIMA + pista EMBAIXO (pra faixas verticais estreitas)
  accentColor?: string; // cor da linha de corrida + selo + brilho (default = vermelho Ferrari)
  headingFont?: string;   // fonte do nome do GP (default = Anton)
  headingWeight?: number; // peso do headingFont (default = 400, o único peso do Anton)
  bodyFont?: string;      // fonte do selo "PROSSIMO GP" + circuito (default = Neue Haas Grotesk)
  textColor?: string;      // cor do nome do GP (default = branco — pensado pra painel escuro)
  mutedTextColor?: string; // cor do circuito (default = cinza claro)
  panelBg?: string;        // fundo do modo NÃO empilhado (default = radial escuro; "transparent" herda o painel)
  showGlow?: boolean;      // brilho radial de destaque por cima (default = true)
};

const HEAVY = "'Anton', 'Arial Narrow', sans-serif";
const BODY = "'Neue Haas Grotesk Display Pro', Arial, sans-serif";
const RED = "#D40000";

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const TrackMap3D: React.FC<TrackMap3DProps> = ({
  width, height, gp, trackPath, stacked = false, accentColor = RED,
  headingFont = HEAVY, headingWeight, bodyFont = BODY,
  textColor = "#fff", mutedTextColor = "#b9b9c2", panelBg, showGlow = true,
}) => {
  const frame = useCurrentFrame();
  const scale = (stacked ? width / 380 : height / 325); // base de proporção
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // animação de desenho do traçado
  const draw = interpolate(frame, [10, 55], [0, 1], { ...clamp, easing: Easing.inOut(Easing.ease) });
  // leve giro de entrada
  const spin = interpolate(frame, [0, 60], [-14, 0], { ...clamp, easing: Easing.out(Easing.ease) });

  // entrada dos textos
  const inHead = interpolate(frame, [4, 22], [0, 1], clamp);

  // extrusão fake: várias cópias empilhadas pra dar "altura"
  const layers = 9;

  // inclinação 3D: no modo lado-a-lado (janela larga e baixa) uma inclinação forte
  // "achata" demais o traçado dentro da caixa, sobrando espaço vazio ao redor —
  // mais suave aqui pra ele preencher melhor. Modo empilhado (Mondo Ferrari) intocado.
  const tiltDeg = stacked ? 58 : 38;

  const trackSvg = (trackBox: number) => (
    <div style={{ width: trackBox, height: trackBox, transform: `rotateX(${tiltDeg}deg) rotateZ(${spin}deg)`, transformStyle: "preserve-3d" }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
        {/* extrusão: cópias empilhadas pra baixo, escurecendo (cinza neutro — não amarrado a nenhuma cor de marca) */}
        {Array.from({ length: layers }).map((_, i) => {
          const t = i / (layers - 1);
          const shade = Math.round(40 + 30 * (1 - t));
          return (
            <path key={i} d={trackPath} pathLength={1} fill="none"
              stroke={`rgb(${shade},${shade},${shade})`}
              strokeWidth={5.2} strokeLinecap="round" strokeLinejoin="round"
              transform={`translate(0 ${(layers - 1 - i) * 0.55})`} />
          );
        })}
        {/* superfície (asfalto) */}
        <path d={trackPath} pathLength={1} fill="none" stroke="#2a2a30" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        {/* linha de corrida (animada) */}
        <path d={trackPath} pathLength={1} fill="none" stroke={accentColor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={1} strokeDashoffset={1 - draw}
          style={{ filter: `drop-shadow(0 0 ${3 * scale}px ${accentColor})` }} />
        {/* brilho branco fino por cima */}
        <path d={trackPath} pathLength={1} fill="none" stroke="#fff" strokeWidth={0.7} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={1} strokeDashoffset={1 - draw} opacity={0.85} />
      </svg>
    </div>
  );

  // recebe sua própria escala (s) — no modo lado-a-lado ela é maior que a escala
  // geral do componente, pra a coluna de texto não sobrar pequena/vazia
  const renderInfoBlock = (s: number) => (
    <div style={{ opacity: inHead, transform: `translateY(${(1 - inHead) * 10}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 * s, marginBottom: 8 * s }}>
        <div style={{ width: 6 * s, height: 18 * s, background: accentColor }} />
        <span style={{ fontFamily: bodyFont, fontWeight: 800, fontSize: 12 * s, letterSpacing: 2.5, color: accentColor, textTransform: "uppercase" }}>{gp.label ?? "PROSSIMO GP"}</span>
        {gp.flagSrc ? (
          <Img src={gp.flagSrc} style={{ width: 30 * s, borderRadius: 3 * s, border: "1px solid rgba(255,255,255,0.5)", flexShrink: 0 }} />
        ) : null}
      </div>
      <div style={{ fontFamily: headingFont, fontWeight: headingWeight, fontSize: 30 * s, color: textColor, lineHeight: 0.94, textTransform: "uppercase" }}>{gp.name}</div>
      <div style={{ fontFamily: bodyFont, fontWeight: 600, fontSize: 14 * s, color: mutedTextColor, marginTop: 6 * s }}>{gp.circuit}</div>
    </div>
  );

  if (stacked) {
    // faixa vertical estreita: label/nome/circuito em cima, pista 3D embaixo (largura toda)
    const infoH = Math.round(height * 0.36);
    const trackH = height - infoH;
    const trackBox = Math.min(width * 0.88, trackH * 0.92);
    return (
      <div style={{ width, height, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* sem fundo próprio — herda o painel contínuo da faixa; só um leve brilho por cima (opcional) */}
        {showGlow ? (
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 60% at 50% 25%, ${hexToRgba(accentColor, 0.16)}, transparent 60%)` }} />
        ) : null}
        <div style={{ height: infoH, flexShrink: 0, padding: `${18 * scale}px ${20 * scale}px 0`, display: "flex", alignItems: "center", position: "relative", zIndex: 2 }}>
          {renderInfoBlock(scale)}
        </div>
        <div style={{ height: trackH, position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", perspective: `${900 * scale}px` }}>
          {trackSvg(trackBox)}
        </div>
      </div>
    );
  }

  const leftW = width * 0.46;
  // com a inclinação mais suave (tiltDeg) o traçado ocupa mais da caixa antes —
  // aumenta um pouco o preenchimento pra aproveitar o espaço extra que sobrou
  const trackBox = Math.min(width - leftW, height) * 1.08;
  // texto da coluna esquerda: a "scale" geral (baseada na altura) fica pequena
  // demais numa janela larga e baixa — aumenta só a info, sobrando bem menos vazio
  const infoScale = scale * 1.5;

  const defaultPanelBg = "radial-gradient(120% 100% at 50% 0%, #1c1c22 0%, #0b0b0e 70%)";

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", background: panelBg ?? defaultPanelBg, display: "flex" }}>
      {/* brilho de destaque (opcional) */}
      {showGlow ? (
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 70% at 75% 55%, ${hexToRgba(accentColor, 0.22)}, transparent 60%)` }} />
      ) : null}

      {/* ── ESQUERDA: info ─────────────────────────────── */}
      <div style={{ width: leftW, flexShrink: 0, padding: `${22 * scale}px ${12 * scale}px ${22 * scale}px ${22 * scale}px`, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 2 }}>
        {renderInfoBlock(infoScale)}
      </div>

      {/* ── DIREITA: pista 3D (tilt + extrusão) ─────────── */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", perspective: `${900 * scale}px` }}>
        {trackSvg(trackBox)}
      </div>
    </div>
  );
};
