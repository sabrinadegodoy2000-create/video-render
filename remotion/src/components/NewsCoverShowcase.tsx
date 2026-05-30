import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { NewsCover } from "./NewsCover";

export const NewsCoverShowcase: React.FC = () => (
  <AbsoluteFill>
    <NewsCover
      title='Diretor de futebol do São Paulo critica sumiço de Arboleda: "É uma falta de respeito"'
      subtitle="Jogador equatoriano não se apresentou para jogo contra o Cruzeiro e não responde ligações do Tricolor"
      author="Por Bruno Giufrida"
      date="06/04/2026 · 12h20"
      imageSrc={staticFile("samples/img1.jpg")}
      source="ge"
      accentColor="#e30613"
    />
  </AbsoluteFill>
);
