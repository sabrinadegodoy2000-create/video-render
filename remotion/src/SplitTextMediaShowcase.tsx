import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SplitTextMedia } from "./components/SplitTextMedia";

const FPS = 30;
const SCENE_DUR = 5 * FPS;

export const SplitTextMediaShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      <Sequence from={0} durationInFrames={SCENE_DUR}>
        <SplitTextMedia
          mediaSrc={staticFile("samples/img1.jpg")}
          leftText="but it doesn't"
          rightText="have to be"
          fontSize={68}
          enterFrame={5}
          textDelay={18}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/pop.mp3")} volume={0.4} />
        </Sequence>
      </Sequence>

      <Sequence from={SCENE_DUR} durationInFrames={SCENE_DUR}>
        <SplitTextMedia
          mediaSrc={staticFile("samples/img2.jpg")}
          leftText="Hamilton conquista"
          rightText="sua primeira vitória"
          fontSize={60}
          enterFrame={5}
          textDelay={15}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.4} />
        </Sequence>
      </Sequence>

      <Sequence from={SCENE_DUR * 2} durationInFrames={SCENE_DUR}>
        <SplitTextMedia
          mediaSrc={staticFile("samples/img3.jpg")}
          leftText="3 passos para"
          rightText="vídeos virais"
          fontSize={72}
          color="#c41e1e"
          enterFrame={5}
          textDelay={20}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/impact.mp3")} volume={0.4} />
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};

export const SPLIT_TEXT_MEDIA_SHOWCASE_DURATION = 3 * SCENE_DUR;
