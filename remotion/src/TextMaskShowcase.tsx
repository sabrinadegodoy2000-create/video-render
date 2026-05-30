import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from "remotion";
import { BigText } from "./components/BigText";
import { getSfxFile } from "./components/SoundEffect";

const FPS = 30;
const SCENE_DUR = 4 * FPS;

const scenes: {
  text: string;
  img: string;
  animation: "scale-up" | "slide-up" | "fade-in" | "zoom-through" | "pop";
  fontSize?: number;
}[] = [
  { text: "2026", img: "samples/img1.jpg", animation: "scale-up", fontSize: 400 },
  { text: "FERRARI", img: "samples/img2.jpg", animation: "slide-up", fontSize: 280 },
  { text: "GP\nCHINA", img: "samples/img3.jpg", animation: "fade-in", fontSize: 300 },
  { text: "F1", img: "samples/img4.jpg", animation: "zoom-through", fontSize: 500 },
  { text: "HAMILTON", img: "samples/img5.jpg", animation: "pop", fontSize: 220 },
];

export const TextMaskShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * SCENE_DUR} durationInFrames={SCENE_DUR}>
          <AbsoluteFill>
            <Img
              src={staticFile(scene.img)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <BigText
              text={scene.text}
              fontSize={scene.fontSize || 300}
              animation={scene.animation}
              enterFrame={5}
            />
            {getSfxFile(scene.animation) && (
              <Sequence from={5}>
                <Audio src={staticFile(getSfxFile(scene.animation)!)} volume={0.5} />
              </Sequence>
            )}
            <div style={{
              position: "absolute", bottom: 30, right: 40,
              fontSize: 18, color: "rgba(255,255,255,0.5)", fontFamily: "monospace",
              backgroundColor: "rgba(0,0,0,0.5)", padding: "4px 12px", borderRadius: 4,
            }}>
              {scene.animation}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const TEXT_MASK_SHOWCASE_DURATION = scenes.length * SCENE_DUR;
