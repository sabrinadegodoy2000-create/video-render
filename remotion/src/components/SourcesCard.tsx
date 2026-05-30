import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  Img,
} from "remotion";
import "../fonts.css";

export type SourcesCardLang = "pt" | "it";

export interface SourcesCardProps {
  lang?: SourcesCardLang;
  logos?: string[]; // nomes dos arquivos, ex: ["g1-logo.png", "uol-logo.png"]
}

const TEXT = {
  pt: "O conteúdo apresentado neste vídeo é baseado em fontes profissionais e de credibilidade comprovada, como",
  it: "Il contenuto presentato in questo video è basato su fonti professionali e di comprovata credibilità, come",
};

const ALL_LOGOS: Record<SourcesCardLang, string[]> = {
  pt: ["g1-logo.png", "uol-logo.png", "metropoles.jpg", "cnn-brasil.png"],
  it: ["logo-auto-sport.png", "motorsport-.jpg", "the-race.png", "sky-sports-logo.png"],
};

export const SOURCES_CARD_DURATION = 150; // 5s a 30fps

export const SourcesCard: React.FC<SourcesCardProps> = ({
  lang = "pt",
  logos,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const activeLogos = logos ?? ALL_LOGOS[lang];

  // Entrada: fade + slide up do bloco inteiro
  const enterProg = spring({ frame, fps, config: { damping: 22, stiffness: 80, mass: 0.7 } });
  const blockY = interpolate(enterProg, [0, 1], [60, 0]);
  const blockOpacity = interpolate(enterProg, [0, 1], [0, 1]);

  // Saída: fade out nos últimos 20 frames
  const exitStart = durationInFrames - 20;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logos entram em stagger
  const logoEnterFrame = 12;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          transform: `translateY(${blockY}px)`,
          opacity: blockOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 72,
          maxWidth: 1500,
          padding: "0 60px",
        }}
      >
        {/* Texto */}
        <p
          style={{
            fontFamily: "'Neue Haas Grotesk Display Pro', sans-serif",
            fontSize: 44,
            fontWeight: 500,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {TEXT[lang]}
        </p>

        {/* Logos */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          {activeLogos.map((file, i) => {
            const logoProg = spring({
              frame: frame - logoEnterFrame - i * 6,
              fps,
              config: { damping: 20, stiffness: 90, mass: 0.6 },
            });
            const logoY = interpolate(logoProg, [0, 1], [30, 0]);
            const logoOpacity = interpolate(logoProg, [0, 1], [0, 1]);

            return (
              <div
                key={file}
                style={{
                  transform: `translateY(${logoY}px)`,
                  opacity: logoOpacity,
                }}
              >
                <Img
                  src={staticFile(`logos-imprensa/${file}`)}
                  style={{
                    height: 160,
                    maxWidth: 380,
                    objectFit: "contain",
                    filter: "grayscale(20%)",
                    borderRadius: 8,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
