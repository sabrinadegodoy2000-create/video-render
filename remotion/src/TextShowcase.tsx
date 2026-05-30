import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { AnimatedText } from "./components/AnimatedText";
import { getSfxFile } from "./components/SoundEffect";

/** Composição demo que mostra os 5 estilos de texto animado */
export const TextShowcase: React.FC = () => {
  const FPS = 30;
  const SCENE_DURATION = 4 * FPS; // 4 segundos por cena

  const scenes = [
    {
      style: "word-by-word" as const,
      text: "Hamilton conquista sua primeira vitória pela Ferrari",
      bg: "white",
      color: "#0f0f0f",
    },
    {
      style: "typewriter" as const,
      text: "A nova era da Scuderia começa agora",
      bg: "white",
      color: "#1a1a1a",
    },
    {
      style: "fade-up" as const,
      text: "GP da China 2026 — Resultado Histórico",
      bg: "white",
      color: "#c41e1e",
    },
    {
      style: "slide-reveal" as const,
      text: "Verstappen responde e lidera o campeonato",
      bg: "white",
      color: "#1a237e",
    },
    {
      style: "scale-pop" as const,
      text: "BREAKING NEWS",
      bg: "#c41e1e",
      color: "white",
      fontSize: 96,
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * SCENE_DURATION} durationInFrames={SCENE_DURATION}>
          <AnimatedText
            text={scene.text}
            animationStyle={scene.style}
            backgroundColor={scene.bg}
            color={scene.color}
            fontSize={scene.fontSize || 64}
            position="center"
            enterFrame={8}
          />
          {getSfxFile(scene.style) && (
            <Sequence from={8}>
              <Audio src={staticFile(getSfxFile(scene.style)!)} volume={0.5} />
            </Sequence>
          )}
          {/* Label do estilo no canto */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 30,
              fontSize: 18,
              color: "#999",
              fontFamily: "monospace",
              backgroundColor: "rgba(0,0,0,0.6)",
              padding: "4px 12px",
              borderRadius: 4,
            }}
          >
            {scene.style}
          </div>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
