import React from "react";
import { AbsoluteFill } from "remotion";
import { NeonRise } from "./NeonRise";

export const NeonRiseShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <NeonRise
        mediaSrc="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800"
        mediaType="image"
        neonColor="#ff0000"
        backgroundColor="white"
        enterFrame={5}
      />
    </AbsoluteFill>
  );
};
