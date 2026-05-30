import React from "react";
import { AbsoluteFill } from "remotion";
import { InstaFeed } from "./InstaFeed";

export const InstaFeedShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <InstaFeed
        cards={[
          {
            src: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800",
            type: "image",
          },
          {
            src: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800",
            type: "image",
          },
          {
            src: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800",
            type: "image",
          },
        ]}
        holdFrames={50}
        enterFrame={5}
      />
    </AbsoluteFill>
  );
};
