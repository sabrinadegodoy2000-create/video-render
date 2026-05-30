import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { CardSpread } from "./CardSpread";

export const CardSpreadShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <CardSpread
        cards={[
          { src: staticFile("samples/img1.jpg") },
          { src: staticFile("samples/img2.jpg") },
          { src: staticFile("samples/img3.jpg") },
        ]}
      />
    </AbsoluteFill>
  );
};
