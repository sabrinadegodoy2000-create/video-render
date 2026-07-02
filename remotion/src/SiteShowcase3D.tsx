import { Img, useCurrentFrame, useVideoConfig, interpolate, Easing, staticFile } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const siteShowcase3DSchema = z.object({
  imageSrc: z.string(),               // screenshot do site (nome do arquivo em /public ou URL)
  url: z.string(),                    // texto da barra de endereço
  side: z.enum(["left", "right"]),    // de qual lado o site entra girando
  accent: zColor(),                   // cor de destaque (brilho/realces)
  durationSec: z.number().min(2).max(60), // duração
});

export type SiteShowcase3DProps = z.infer<typeof siteShowcase3DSchema>;

const BODY = "'Neue Haas Grotesk Display Pro', 'Segoe UI', Arial, sans-serif";
const MONO = "'Consolas', ui-monospace, monospace";

export const SITE_SHOWCASE_DURATION = 12 * 30; // fallback (12s @30fps)

// aceita nome de arquivo solto (resolve via /public), URL ou data/blob
const resolveSrc = (s: string) =>
  /^(https?:|\/|blob:|data:)/.test(s) ? s : staticFile(s);

export const SiteShowcase3D: React.FC<SiteShowcase3DProps> = ({
  imageSrc = "site-print-1.png",
  url = "https://mondo-ferrari-f1.vercel.app/it",
  side = "left",
  accent = "#ff2d2d",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const clampR = { extrapolateRight: "clamp" as const };
  const clampB = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // ── Câmera 3D: entra inclinado de um lado → gira pra frente + zoom ──
  const introEnd = durationInFrames * 0.4;
  const dir = side === "left" ? -1 : 1;
  const rotY = interpolate(frame, [0, introEnd], [dir * 42, dir * 6], { ...clampR, easing: Easing.out(Easing.cubic) });
  const rotX = interpolate(frame, [0, introEnd], [11, 3], { ...clampR, easing: Easing.out(Easing.cubic) });
  const scale = interpolate(frame, [0, introEnd], [0.92, 1.16], { ...clampR, easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], clampR);

  // ── Digitação da URL na barra de endereço ───────────────────────
  const typeStart = Math.round(fps * 0.35);
  const typeDur = Math.round(fps * 1.7);
  const typedCount = Math.floor(
    interpolate(frame, [typeStart, typeStart + typeDur], [0, url.length], clampB)
  );
  const typedUrl = url.slice(0, Math.max(0, typedCount));
  const doneTyping = frame >= typeStart + typeDur;
  const cursorOn = !doneTyping && Math.floor((frame / fps) * 2.5) % 2 === 0; // pisca enquanto digita

  // respiração/deriva sutil depois que assenta (dá vida sem enjoar)
  const t = frame / fps;
  const driftY = Math.sin(t * 0.5) * 2.2;   // graus
  const floatPx = Math.sin(t * 0.8) * 9;    // px

  // ── Rolagem da página por dentro do mockup ──────────────────────
  const contentH = 820; // altura visível do screenshot dentro do mockup (px)
  const scrollP = interpolate(
    frame,
    [durationInFrames * 0.16, durationInFrames * 0.96],
    [0, 1],
    { ...clampB, easing: Easing.inOut(Easing.ease) }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(130% 90% at 50% 18%, #1a1d27 0%, #0c0e15 55%, #06070b 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* atmosfera: brilho de destaque + grade pontilhada sutil */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 50% at ${side === "left" ? 68 : 32}% 60%, ${accent}26, transparent 60%)` }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(80% 70% at 50% 50%, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 50% 50%, #000 30%, transparent 80%)",
        }}
      />

      {/* palco 3D */}
      <div style={{ perspective: 1400, perspectiveOrigin: "50% 44%", opacity }}>
        <div
          style={{
            transformStyle: "preserve-3d",
            transform: `translateY(${floatPx}px) scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY + driftY}deg)`,
            filter: "drop-shadow(0 60px 80px rgba(0,0,0,0.6))",
          }}
        >
          <Mockup imageSrc={resolveSrc(imageSrc)} displayUrl={typedUrl} cursorOn={cursorOn} typing={!doneTyping} contentH={contentH} scrollP={scrollP} accent={accent} />
        </div>
      </div>

      {/* vinheta */}
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 240px 60px rgba(0,0,0,0.7)", pointerEvents: "none" }} />
    </div>
  );
};

// ── Janela de navegador estilizada ──────────────────────────────────
const Mockup: React.FC<{ imageSrc: string; displayUrl: string; cursorOn: boolean; typing: boolean; contentH: number; scrollP: number; accent: string }> = ({
  imageSrc,
  displayUrl,
  cursorOn,
  typing,
  contentH,
  scrollP,
  accent,
}) => {
  const W = 1320;
  const barH = 56;
  const dot = (c: string) => (
    <div style={{ width: 14, height: 14, borderRadius: "50%", background: c }} />
  );
  return (
    <div
      style={{
        width: W,
        borderRadius: 16,
        overflow: "hidden",
        background: "#0f1117",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 0 80px ${accent}22`,
      }}
    >
      {/* barra superior */}
      <div
        style={{
          height: barH,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 18px",
          background: "linear-gradient(180deg, #20232e, #171a23)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 9 }}>
          {dot("#ff5f57")}
          {dot("#febc2e")}
          {dot("#28c840")}
        </div>
        <div
          style={{
            flex: 1,
            height: 30,
            borderRadius: 8,
            background: "#0c0e14",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "0 13px",
            color: "#9aa3b8",
            fontFamily: MONO,
            fontSize: 15,
          }}
        >
          {/* cadeado aparece quando termina de digitar (como num navegador real) */}
          <span style={{ fontSize: 13, opacity: typing ? 0.25 : 1, color: accent }}>{typing ? "🌐" : "🔒"}</span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", color: typing ? "#dfe4ef" : "#9aa3b8" }}>
            {displayUrl}
            {/* cursor piscando enquanto digita */}
            <span style={{ display: "inline-block", width: 2, height: 18, marginLeft: 1, transform: "translateY(3px)", background: cursorOn ? accent : "transparent" }} />
          </span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 18, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,0.35)" }} />
          ))}
        </div>
      </div>

      {/* área do site (rola por dentro) */}
      <div style={{ height: contentH, overflow: "hidden", position: "relative", background: "#fff" }}>
        <Img
          src={imageSrc}
          style={{
            width: "100%",
            display: "block",
            // translateY em % é relativo à própria altura da imagem →
            // rola exatamente até o fim de qualquer screenshot, sem saber a altura
            transform: `translateY(calc((-100% + ${contentH}px) * ${scrollP}))`,
          }}
        />
        {/* leve brilho/glare diagonal pra dar sensação de tela */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(115deg, rgba(255,255,255,0.12) 0%, transparent 22%, transparent 78%, rgba(255,255,255,0.06) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};
