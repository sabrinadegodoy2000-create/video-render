import React from "react";
import { AbsoluteFill } from "remotion";
import { MediaRiseTitle } from "./MediaRiseTitle";

export const MediaRiseTitleShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <MediaRiseTitle
        mediaSrc="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200"
        mediaType="image"
        title="VELOCIDADE MÁXIMA"
        titleFontSize={82}
        mediaHeightRatio={0.8}
        enterFrame={5}
      />
    </AbsoluteFill>
  );
};
