import { useCurrentFrame, useVideoConfig, Img, OffthreadVideo, interpolate, Sequence, Loop, staticFile } from "remotion";

export type WideSegment = {
  src: string;
  type: "photo" | "video";
  durationSec: number;
  startSec?: number; // ponto de início do vídeo (avança a cada repetição no loop)
};

export type FloatingPhoneProps = {
  portraitVideoSrc: string;
  logoSrc: string;
  wideSegments: WideSegment[];
  durationSec: number;
  portraitClipSec?: number; // se definido, o 9:16 repete em loop a cada N segundos
};

export const FLOATING_PHONE_DURATION = 150; // fallback 5s @ 30fps

const BORDER_RADIUS = 24;
const STROKE_WIDTH = 2;
const NEON_COLOR = "#ff2020";
const TAIL_LENGTH = 320;
const CYCLE_SEC = 2;

const SUB_CYCLE_SEC = 40; // reaparece a cada 40s; a animação dura ~7,4s e fica oculto o resto
const CROSSFADE_FRAMES = 12; // transição suave entre mídias do 16:9 (~0,4s)

// Sininho (estado "Iscritto") — PNG fornecido. white=true deixa branco (pra aparecer no botão vermelho)
const BellIcon: React.FC<{ size?: number; white?: boolean }> = ({ size = 30, white = false }) => (
  <Img
    src={staticFile("bell.png")}
    style={{ width: size, height: size, objectFit: "contain", filter: white ? "brightness(0) invert(1)" : "none" }}
  />
);

// Ícone do play estilo YouTube (quadradinho branco + triângulo vermelho)
const YtPlayBox: React.FC<{ red?: string }> = ({ red = "#ff0000" }) => (
  <svg width="44" height="31" viewBox="0 0 44 31" style={{ flexShrink: 0 }}>
    <rect width="44" height="31" rx="7" fill="#ffffff" />
    <path d="M18 9 L31 15.5 L18 22 Z" fill={red} />
  </svg>
);

// Botão de inscrição animado: aparece "Iscriviti" e vira "Iscritto" a cada 5s
const SubscribeButton: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const cycle = SUB_CYCLE_SEC * fps;
  const t = (frame % cycle) / fps; // segundos dentro do ciclo
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  const appear = interpolate(t, [0, 0.35], [0, 1], clamp);
  const disappear = interpolate(t, [7.0, 7.4], [1, 0], clamp);
  const visible = appear * disappear;
  const scaleIn = interpolate(appear, [0, 1], [0.7, 1]);

  const subscribed = t >= 3.5; // ~3s em "Iscriviti", depois ~3s+ em "Iscritto"
  // pequeno "pop" no momento da troca pra Iscritto
  const pop = interpolate(t, [3.5, 3.62, 3.78], [1, 0.92, 1], clamp);

  const FONT = "'Neue Haas Grotesk Display Pro', 'Helvetica Neue', Arial, sans-serif";

  return (
    <div style={{ position: "absolute", top: 44, right: 48, opacity: visible, transform: `scale(${scaleIn})`, transformOrigin: "top right", zIndex: 30 }}>
      <div
        style={{
          transform: `scale(${pop})`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "15px 42px",
          borderRadius: 10,
          background: "#ff0000",
          boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
        }}
      >
        {subscribed ? <BellIcon size={32} white /> : <YtPlayBox red="#ff0000" />}
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, letterSpacing: 0.3, color: "#ffffff", whiteSpace: "nowrap", textTransform: "uppercase" }}>
          {subscribed ? "Iscritto" : "Iscriviti"}
        </span>
      </div>
    </div>
  );
};

export const FloatingPhoneShowcase: React.FC<FloatingPhoneProps> = ({
  portraitVideoSrc,
  logoSrc,
  wideSegments,
  durationSec,
  portraitClipSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.round(durationSec * fps);

  // ── Layout cíclico (tela cheia ↔ PiP) ───────────────────────────
  // A cada 1 minuto o vídeo principal fica em TELA CHEIA por PHASE1_SEC (15s)
  // e PiP no canto o resto do minuto. (O 1º minuto começa já em tela cheia.)
  const PHASE1_SEC = 15;   // quanto tempo fica em tela cheia (também a abertura 0–15s)
  const FS_CYCLE_SEC = 60; // a cada 1 minuto
  const PIP_TRANS = 0.6;   // tempo do "encolher"/"crescer"
  const phase1Frames = Math.round(PHASE1_SEC * fps);
  const cyc = (frame / fps) % FS_CYCLE_SEC;
  const pip = interpolate(
    cyc,
    [PHASE1_SEC, PHASE1_SEC + PIP_TRANS, FS_CYCLE_SEC - PIP_TRANS, FS_CYCLE_SEC],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // PiP (16:9) no canto inferior direito
  const PIP_W = 560;
  const PIP_H = 315;
  const PIP_MARGIN = 48;
  const PIP_RADIUS = 18;
  const pipX = 1920 - PIP_W - PIP_MARGIN;
  const pipY = 1080 - PIP_H - PIP_MARGIN;

  // Geometria do vídeo principal: tela cheia → PiP
  const mainLeft = interpolate(pip, [0, 1], [0, pipX]);
  const mainTop = interpolate(pip, [0, 1], [0, pipY]);
  const mainW = interpolate(pip, [0, 1], [1920, PIP_W]);
  const mainH = interpolate(pip, [0, 1], [1080, PIP_H]);
  const mainRadius = interpolate(pip, [0, 1], [0, PIP_RADIUS]);

  // Neon — só aparece quando o principal vira PiP
  const neonPad = 24;
  const perimeter = 2 * (mainW + mainH);
  const cycleFrames = fps * CYCLE_SEC;
  const progress = (frame % cycleFrames) / cycleFrames;
  const headOffset = -(perimeter * progress);

  const logoSize = 110;
  const logoMargin = 28;

  // Zoom suave aplicado só em fotos
  const wideImgScale = interpolate(frame, [0, totalFrames], [1.0, 1.08], { extrapolateRight: "clamp" });

  return (
    <div style={{ width: 1920, height: 1080, background: "#000000", position: "relative" }}>
      {/* Logo — canto superior esquerdo (sempre por cima, inclusive do 16:9 em tela cheia) */}
      <Img
        src={logoSrc}
        style={{
          position: "absolute",
          left: logoMargin,
          top: logoMargin,
          width: logoSize,
          height: logoSize,
          objectFit: "contain",
          zIndex: 20,
        }}
      />

      {/* 16:9 — imagens/vídeos em TELA CHEIA (fundo; revelado na fase 2 atrás do PiP) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          overflow: "hidden",
          background: "#000000",
        }}
      >
        {wideSegments.map((seg, i) => {
          const startFrame =
            phase1Frames +
            wideSegments
              .slice(0, i)
              .reduce((acc, s) => acc + Math.round(s.durationSec * fps), 0);
          // Estende a duração no crossfade pra a foto anterior "segurar" enquanto a próxima entra
          const durationInFrames = Math.round(seg.durationSec * fps) + CROSSFADE_FRAMES;
          // A próxima entra por cima com fade-in (a 1ª já começa opaca, sem preto no início)
          const opacity =
            i === 0
              ? 1
              : interpolate(frame, [startFrame, startFrame + CROSSFADE_FRAMES], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });

          return (
            <Sequence key={i} from={startFrame} durationInFrames={durationInFrames} layout="none">
              <div style={{ position: "absolute", inset: 0, opacity }}>
                {seg.type === "photo" ? (
                  <>
                    {/* Fundo borrado */}
                    <Img
                      src={seg.src}
                      style={{
                        position: "absolute",
                        inset: -40,
                        width: "calc(100% + 80px)",
                        height: "calc(100% + 80px)",
                        objectFit: "cover",
                        filter: "blur(24px) brightness(0.5)",
                      }}
                    />
                    {/* Imagem com zoom suave */}
                    <Img
                      src={seg.src}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: `scale(${wideImgScale})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </>
                ) : (
                  <>
                    {/* Fundo borrado */}
                    <OffthreadVideo
                      src={seg.src}
                      trimBefore={Math.round((seg.startSec || 0) * fps)}
                      muted
                      style={{
                        position: "absolute",
                        inset: -40,
                        width: "calc(100% + 80px)",
                        height: "calc(100% + 80px)",
                        objectFit: "cover",
                        filter: "blur(24px) brightness(0.5)",
                      }}
                    />
                    {/* Vídeo original */}
                    <OffthreadVideo
                      src={seg.src}
                      trimBefore={Math.round((seg.startSec || 0) * fps)}
                      muted
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </>
                )}
              </div>
            </Sequence>
          );
        })}
      </div>

      {/* Vídeo principal — tela cheia (fase 1) → PiP no canto inferior direito (fase 2) */}
      <div
        style={{
          position: "absolute",
          left: mainLeft,
          top: mainTop,
          width: mainW,
          height: mainH,
          borderRadius: mainRadius,
          overflow: "hidden",
          background: "#000000",
          zIndex: 5,
        }}
      >
        {/\.(jpe?g|png|webp|gif|bmp|avif)(\?|$)/i.test(portraitVideoSrc) ? (
          <Img src={portraitVideoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : portraitClipSec ? (
          <Loop durationInFrames={Math.max(1, Math.round(portraitClipSec * fps))} style={{ width: "100%", height: "100%" }}>
            <OffthreadVideo
              src={portraitVideoSrc}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Loop>
        ) : (
          <OffthreadVideo
            src={portraitVideoSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>

      {/* SVG neon — borda do PiP (aparece só quando o principal vira PiP) */}
      <svg
        style={{
          position: "absolute",
          left: mainLeft - neonPad,
          top: mainTop - neonPad,
          overflow: "visible",
          pointerEvents: "none",
          opacity: pip,
          zIndex: 6,
        }}
        width={mainW + neonPad * 2}
        height={mainH + neonPad * 2}
      >
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={neonPad} y={neonPad} width={mainW} height={mainH} rx={mainRadius} ry={mainRadius}
          fill="none" stroke={NEON_COLOR} strokeWidth={STROKE_WIDTH} opacity={0.08} />
        <rect x={neonPad} y={neonPad} width={mainW} height={mainH} rx={mainRadius} ry={mainRadius}
          fill="none" stroke={NEON_COLOR} strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${TAIL_LENGTH} ${perimeter - TAIL_LENGTH}`}
          strokeDashoffset={headOffset} strokeLinecap="round" filter="url(#neon-glow)" />
        <rect x={neonPad} y={neonPad} width={mainW} height={mainH} rx={mainRadius} ry={mainRadius}
          fill="none" stroke="#ffffff" strokeWidth={STROKE_WIDTH * 0.4}
          strokeDasharray={`${TAIL_LENGTH * 0.15} ${perimeter - TAIL_LENGTH * 0.15}`}
          strokeDashoffset={headOffset} strokeLinecap="round" />
      </svg>

      {/* Botão de inscrição animado — canto superior direito */}
      <SubscribeButton frame={frame} fps={fps} />
    </div>
  );
};
