import { AbsoluteFill } from "remotion";
import { SplitExpandReveal } from "./components/SplitExpandReveal";

export const SplitExpandRevealShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <SplitExpandReveal
        mediaSrc="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"
        mediaType="image"
        title="Up Next..."
        topics={["B-roll", "Multiple cameras", "Quote"]}
        enterFrame={0}
      />
    </AbsoluteFill>
  );
};
