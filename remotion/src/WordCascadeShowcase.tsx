import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { WordCascade } from "./components/WordCascade";

const FPS = 30;

export const WordCascadeShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      <Sequence from={0} durationInFrames={6 * FPS}>
        <WordCascade
          words={["FERRARI", "HAMILTON", "2026", "F1"]}
          fontSize={220}
          enterFrame={5}
          holdFrames={28}
          exitFrames={10}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/impact.mp3")} volume={0.5} />
        </Sequence>
      </Sequence>

      <Sequence from={6 * FPS} durationInFrames={5 * FPS}>
        <WordCascade
          words={["BREAKING", "NEWS", "NOW"]}
          fontSize={250}
          color="#c41e1e"
          enterFrame={5}
          holdFrames={30}
          exitFrames={12}
        />
        <Sequence from={5}>
          <Audio src={staticFile("sfx/impact.mp3")} volume={0.5} />
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};

export const WORD_CASCADE_SHOWCASE_DURATION = 11 * 30;
