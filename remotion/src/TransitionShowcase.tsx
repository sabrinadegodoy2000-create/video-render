import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from "remotion";
import {
  CinematicTransition,
  TransitionType,
} from "./components/CinematicTransition";
import { getSfxFile } from "./components/SoundEffect";

const FPS = 30;
const SCENE_DUR = 3 * FPS;       // 3s cada cena visível
const TRANSITION_DUR = 1 * FPS;  // 1s cada transição

/** Imagem simples com ken-burns sutil */
const SceneImage: React.FC<{ src: string; label?: string }> = ({ src, label }) => (
  <AbsoluteFill>
    <Img
      src={src}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    {label && (
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 40,
          fontSize: 22,
          color: "white",
          fontFamily: "monospace",
          backgroundColor: "rgba(0,0,0,0.65)",
          padding: "6px 16px",
          borderRadius: 6,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    )}
  </AbsoluteFill>
);

const images = [
  staticFile("samples/img1.jpg"),
  staticFile("samples/img2.jpg"),
  staticFile("samples/img3.jpg"),
  staticFile("samples/img4.jpg"),
  staticFile("samples/img5.jpg"),
  staticFile("samples/img6.jpg"),
  staticFile("samples/img1.jpg"),
  staticFile("samples/img2.jpg"),
  staticFile("samples/img3.jpg"),
];

const transitions: TransitionType[] = [
  "crossfade",
  "cinematic-bars",
  "zoom-through",
  "iris-wipe",
  "glitch",
  "blur-dissolve",
  "slide-over",
  "whip-pan",
];

/** Composição que demonstra todas as transições cinematográficas */
export const TransitionShowcase: React.FC = () => {
  const elements: React.ReactNode[] = [];
  let currentFrame = 0;

  for (let i = 0; i < transitions.length; i++) {
    const imgA = images[i % images.length];
    const imgB = images[(i + 1) % images.length];
    const transType = transitions[i];

    // Cena A (imagem parada por SCENE_DUR)
    elements.push(
      <Sequence key={`scene-${i}`} from={currentFrame} durationInFrames={SCENE_DUR}>
        <SceneImage src={imgA} />
      </Sequence>
    );
    currentFrame += SCENE_DUR;

    // Transição entre A e B
    const sfx = getSfxFile(transType);
    elements.push(
      <Sequence
        key={`trans-${i}`}
        from={currentFrame}
        durationInFrames={TRANSITION_DUR}
      >
        <CinematicTransition
          type={transType}
          durationFrames={TRANSITION_DUR}
          outgoing={<SceneImage src={imgA} />}
          incoming={<SceneImage src={imgB} label={transType} />}
        />
        {sfx && <Audio src={staticFile(sfx)} volume={0.5} />}
      </Sequence>
    );
    currentFrame += TRANSITION_DUR;
  }

  // Última cena
  elements.push(
    <Sequence key="scene-last" from={currentFrame} durationInFrames={SCENE_DUR}>
      <SceneImage src={images[transitions.length % images.length]} />
    </Sequence>
  );

  return <AbsoluteFill style={{ backgroundColor: "#000" }}>{elements}</AbsoluteFill>;
};

/** Duração total em frames */
export const TRANSITION_SHOWCASE_DURATION =
  transitions.length * (SCENE_DUR + TRANSITION_DUR) + SCENE_DUR;
