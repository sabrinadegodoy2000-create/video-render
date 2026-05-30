import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from "remotion";
import { LowerThird, LowerThirdStyle } from "./components/LowerThird";

const FPS = 30;
const SCENE_DUR = 5 * FPS; // 5s por estilo

const scenes: {
  style: LowerThirdStyle;
  title: string;
  subtitle?: string;
  primaryColor: string;
  img: string;
}[] = [
  {
    style: "sports-bar",
    title: "HAMILTON VENCE NA FERRARI",
    subtitle: "Primeira vitória com a Scuderia desde a mudança",
    primaryColor: "#dc2626",
    img: "samples/img1.jpg",
  },
  {
    style: "news-ticker",
    title: "Verstappen lidera o campeonato com 25 pontos de vantagem sobre Leclerc",
    subtitle: "ÚLTIMA HORA",
    primaryColor: "#1e40af",
    img: "samples/img2.jpg",
  },
  {
    style: "minimal-slide",
    title: "GP da China 2026",
    subtitle: "Xangai International Circuit — Round 3",
    primaryColor: "#dc2626",
    img: "samples/img3.jpg",
  },
  {
    style: "f1-style",
    title: "LEWIS HAMILTON",
    subtitle: "Scuderia Ferrari · #44",
    primaryColor: "#dc2626",
    img: "samples/img4.jpg",
  },
  {
    style: "gradient-bar",
    title: "Resultado Classificação",
    subtitle: "HAM P1 · LEC P3 · VER P2 · NOR P4 · PIA P5",
    primaryColor: "#7c3aed",
    img: "samples/img5.jpg",
  },
];

export const LowerThirdShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * SCENE_DUR} durationInFrames={SCENE_DUR}>
          <AbsoluteFill>
            <Img
              src={staticFile(scene.img)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Overlay escuro sutil para destacar o lower third */}
            <AbsoluteFill
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
              }}
            />
            <LowerThird
              style={scene.style}
              title={scene.title}
              subtitle={scene.subtitle}
              primaryColor={scene.primaryColor}
              enterFrame={15}
              exitFrame={SCENE_DUR - 25}
            />
            <Sequence from={15}>
              <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.4} />
            </Sequence>
            {/* Label do estilo */}
            <div
              style={{
                position: "absolute",
                top: 30,
                right: 40,
                fontSize: 20,
                color: "white",
                fontFamily: "monospace",
                backgroundColor: "rgba(0,0,0,0.65)",
                padding: "6px 16px",
                borderRadius: 6,
              }}
            >
              {scene.style}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const LOWER_THIRD_SHOWCASE_DURATION = scenes.length * SCENE_DUR;
