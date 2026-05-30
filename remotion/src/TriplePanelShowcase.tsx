import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TriplePanel } from "./components/TriplePanel";

const FPS = 30;
const SCENE_DUR = 5 * FPS;

export const TriplePanelShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={SCENE_DUR}>
        <TriplePanel
          panels={[
            { src: staticFile("samples/img1.jpg"), word: "go" },
            { src: staticFile("samples/img2.jpg"), word: "viral" },
            { src: staticFile("samples/img3.jpg"), word: "too" },
          ]}
          fontSize={160}
          enterFrame={5}
          stagger={8}
          textDelay={14}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/impact.mp3")} volume={0.5} />
        </Sequence>
      </Sequence>

      <Sequence from={SCENE_DUR} durationInFrames={SCENE_DUR}>
        <TriplePanel
          panels={[
            { src: staticFile("samples/img4.jpg"), word: "fast" },
            { src: staticFile("samples/img5.jpg"), word: "bold" },
            { src: staticFile("samples/img6.jpg"), word: "now" },
          ]}
          fontSize={180}
          enterFrame={5}
          stagger={6}
          textDelay={12}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.5} />
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};

export const TRIPLE_PANEL_SHOWCASE_DURATION = 2 * SCENE_DUR;
