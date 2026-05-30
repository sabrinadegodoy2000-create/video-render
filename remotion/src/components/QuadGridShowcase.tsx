import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { QuadGrid } from "./QuadGrid";

export const QuadGridShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <QuadGrid
        media={[
          { src: staticFile("samples/img1.jpg") },
          { src: staticFile("samples/img2.jpg") },
          { src: staticFile("samples/img3.jpg") },
          { src: staticFile("samples/img4.jpg") },
        ]}
        enterFrame={0}
        gap={4}
      />
    </AbsoluteFill>
  );
};
