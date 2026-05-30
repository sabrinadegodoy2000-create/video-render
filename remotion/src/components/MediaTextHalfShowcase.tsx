import React from "react";
import { AbsoluteFill } from "remotion";
import { MediaTextHalf } from "./MediaTextHalf";

export const MediaTextHalfShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <MediaTextHalf
        mediaSrc="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200"
        mediaType="image"
        title="O Futuro da Tecnologia"
        paragraphs={[
          "A inovação está transformando a maneira como vivemos, trabalhamos e nos conectamos com o mundo ao nosso redor.",
          "Empresas líderes estão investindo bilhões em pesquisa e desenvolvimento para criar soluções que antes pareciam impossíveis.",
          "O próximo grande avanço pode estar mais perto do que imaginamos, e ele vai mudar tudo que conhecemos.",
        ]}
        titleFontSize={64}
        paragraphFontSize={28}
        enterFrame={5}
      />
    </AbsoluteFill>
  );
};
