import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CardsReveal } from "./components/CardsReveal";

const FPS = 30;
const SCENE_DUR = 5 * FPS;

const scene1 = [
  { img: staticFile("samples/img1.jpg"), label: "HAMILTON" },
  { img: staticFile("samples/img2.jpg"), label: "LECLERC" },
  { img: staticFile("samples/img3.jpg"), label: "VERSTAPPEN" },
];

const scene2 = [
  { img: staticFile("samples/img4.jpg") },
  { img: staticFile("samples/img5.jpg") },
  { img: staticFile("samples/img6.jpg") },
];

export const CardsShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      {/* Com labels */}
      <Sequence from={0} durationInFrames={SCENE_DUR}>
        <CardsReveal cards={scene1} enterFrame={8} />
        <Sequence from={8}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.5} />
        </Sequence>
      </Sequence>

      {/* Sem labels */}
      <Sequence from={SCENE_DUR} durationInFrames={SCENE_DUR}>
        <CardsReveal cards={scene2} enterFrame={8} borderRadius={24} />
        <Sequence from={8}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.5} />
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};

export const CARDS_SHOWCASE_DURATION = 2 * SCENE_DUR;
