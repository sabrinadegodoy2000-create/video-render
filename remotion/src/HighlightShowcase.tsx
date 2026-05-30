import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { HighlightZoom } from "./components/HighlightZoom";

const FPS = 30;
const SCENE_DUR = 5 * FPS;

export const HighlightShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      <Sequence from={0} durationInFrames={SCENE_DUR}>
        <HighlightZoom
          text="Hamilton conquista sua primeira vitória pela Ferrari"
          fontSize={80}
          enterFrame={5}
          zoomDelay={18}
          highlightDelay={35}
          framesPerLine={45}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/clique.mp3")} volume={0.7} />
        </Sequence>
      </Sequence>

      <Sequence from={SCENE_DUR} durationInFrames={SCENE_DUR}>
        <HighlightZoom
          text="BREAKING NEWS"
          fontSize={140}
          highlightColor="#ff3b3b"
          color="#000"
          enterFrame={5}
          zoomDelay={12}
          highlightDelay={25}
          framesPerLine={20}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/clique.mp3")} volume={0.7} />
        </Sequence>
      </Sequence>

      <Sequence from={SCENE_DUR * 2} durationInFrames={SCENE_DUR}>
        <HighlightZoom
          text="A nova era da Scuderia começa agora"
          fontSize={90}
          highlightColor="#35e0ff"
          enterFrame={5}
          zoomDelay={15}
          highlightDelay={30}
          framesPerLine={40}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/clique.mp3")} volume={0.7} />
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};

export const HIGHLIGHT_SHOWCASE_DURATION = 3 * SCENE_DUR;
