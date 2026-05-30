import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import { NarrationOverlay, NarrationStyle } from "./components/NarrationOverlay";

const FPS = 30;
const SCENE_DUR = 6 * FPS; // 6s por estilo

const scenes: {
  style: NarrationStyle;
  text: string;
  highlightWords?: string[];
  position?: "top" | "center" | "bottom";
  img: string;
  label: string;
}[] = [
  {
    style: "subtitle-box",
    text: "Hamilton cruza a linha de chegada em primeiro e celebra com a equipe Ferrari",
    position: "bottom",
    img: "samples/img1.jpg",
    label: "subtitle-box — Caixa com blur, word-by-word",
  },
  {
    style: "cinematic-caption",
    text: "A nova era\ncomeça agora",
    position: "center",
    img: "samples/img2.jpg",
    label: "cinematic-caption — Estilo trailer de cinema",
  },
  {
    style: "highlight-word",
    text: "Verstappen assume a liderança do campeonato após vitória dominante na China",
    highlightWords: ["Verstappen", "liderança", "China"],
    position: "bottom",
    img: "samples/img3.jpg",
    label: "highlight-word — Palavras-chave destacadas",
  },
  {
    style: "karaoke",
    text: "A Scuderia Ferrari conquista o doblete histórico no Grande Prêmio da Austrália",
    position: "bottom",
    img: "samples/img4.jpg",
    label: "karaoke — Palavras acendem sequencialmente",
  },
  {
    style: "split-screen",
    text: "O paddock inteiro se levantou para aplaudir a chegada de Hamilton. Uma nova página na história da Fórmula 1 foi escrita neste domingo.",
    position: "center",
    img: "samples/img5.jpg",
    label: "split-screen — Painel lateral com texto",
  },
];

export const NarrationShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * SCENE_DUR} durationInFrames={SCENE_DUR}>
          <AbsoluteFill>
            {/* Imagem de fundo */}
            <Img
              src={staticFile(scene.img)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Gradiente sutil para legibilidade */}
            {scene.style !== "split-screen" && (
              <AbsoluteFill
                style={{
                  background: scene.position === "top"
                    ? "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%)"
                    : "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)",
                }}
              />
            )}
            {/* Narração */}
            <NarrationOverlay
              style={scene.style}
              text={scene.text}
              highlightWords={scene.highlightWords}
              highlightColor="#dc2626"
              position={scene.position || "bottom"}
              enterFrame={10}
              exitFrame={SCENE_DUR - 20}
              fontSize={38}
            />
            {/* Label */}
            <div style={{
              position: "absolute", top: 24, right: 30,
              fontSize: 17, color: "white", fontFamily: "monospace",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "6px 14px", borderRadius: 6,
            }}>
              {scene.label}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const NARRATION_SHOWCASE_DURATION = scenes.length * SCENE_DUR;
