import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { SegmentClip } from "./components/SegmentClip";

/**
 * Showcase para testar imagens verticais (9:16) com efeito flutuante.
 * Usa img1.jpg como exemplo — o componente detecta o aspect ratio automaticamente.
 */
export const PortraitShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <SegmentClip
        segment={{
          type: "image",
          src: staticFile("samples/vertical_test.jpg"),
          durationSec: 5,
          animation: "ken-burns",
        }}
        durationFrames={150}
      />
    </AbsoluteFill>
  );
};
