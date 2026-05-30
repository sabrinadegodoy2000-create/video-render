import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Block } from "./types";
import { SegmentClip } from "./components/SegmentClip";
import { TransitionEffect } from "./components/TransitionEffect";

export interface VideoCompositionProps {
  blocks: Block[];
  audioSrc: string;
  bgMusicSrc?: string;
  bgMusicVolume?: number;
  totalDurationSec: number;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  blocks,
  audioSrc,
  bgMusicSrc,
  bgMusicVolume = 0.08,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Renderiza cada bloco como uma Sequence posicionada no tempo */}
      {blocks.map((block, blockIndex) => {
        const blockStartFrame = Math.round(block.startTime * fps);
        const blockDurationSec = block.endTime - block.startTime;
        const blockDurationFrames = Math.round(blockDurationSec * fps);

        // Dentro do bloco, renderiza cada segmento sequencialmente
        let segOffset = 0;
        const segmentElements = block.segments.map((seg, segIdx) => {
          const segFrames = Math.round(seg.durationSec * fps);
          const el = (
            <Sequence
              key={`${block.id}-seg-${segIdx}`}
              from={segOffset}
              durationInFrames={segFrames}
            >
              <SegmentClip segment={seg} durationFrames={segFrames} />
            </Sequence>
          );
          segOffset += segFrames;
          return el;
        });

        // Transição com o próximo bloco
        const nextBlock = blocks[blockIndex + 1];
        const transType = block.transition || "fade";
        const transDur = block.transitionDuration || 0.5;
        const transFrames = Math.round(transDur * fps);

        return (
          <Sequence
            key={block.id}
            from={blockStartFrame}
            durationInFrames={blockDurationFrames}
          >
            <AbsoluteFill>
              {segmentElements}
              {/* Transição de saída no final do bloco */}
              {nextBlock && transType !== "none" && (
                <Sequence
                  from={blockDurationFrames - transFrames}
                  durationInFrames={transFrames}
                >
                  <TransitionEffect
                    type={transType}
                    durationFrames={transFrames}
                    direction="out"
                  />
                </Sequence>
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Áudio principal (narração) */}
      {audioSrc && <Audio src={audioSrc} volume={1} />}

      {/* Música de fundo */}
      {bgMusicSrc && (
        <Audio src={bgMusicSrc} volume={bgMusicVolume} loop />
      )}
    </AbsoluteFill>
  );
};
