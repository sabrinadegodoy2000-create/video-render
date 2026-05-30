import React from "react";
import { Audio, staticFile, useCurrentFrame } from "remotion";

/**
 * Mapa de efeitos sonoros disponíveis.
 * Cada animação/transição pode ter um SFX associado.
 */
const SFX_MAP: Record<string, string> = {
  // BigText / AnimatedText animations
  "scale-up": "sfx/rise.mp3",
  "slide-up": "sfx/whoosh.mp3",
  "fade-in": "sfx/sweep.mp3",
  "zoom-through": "sfx/rise.mp3",
  "pop": "sfx/pop.mp3",
  // AnimatedText styles
  "word-by-word": "sfx/pop.mp3",
  "typewriter": "sfx/pop.mp3",
  "fade-up": "sfx/sweep.mp3",
  "slide-reveal": "sfx/whoosh.mp3",
  "scale-pop": "sfx/pop.mp3",
  // CinematicTransition types
  "crossfade": "sfx/sweep.mp3",
  "cinematic-bars": "sfx/impact.mp3",
  "iris-wipe": "sfx/sweep.mp3",
  "glitch": "sfx/impact.mp3",
  "blur-dissolve": "sfx/sweep.mp3",
  "slide-over": "sfx/whoosh.mp3",
  "whip-pan": "sfx/whoosh.mp3",
  // HighlightZoom
  "highlight-zoom": "sfx/clique.mp3",
};

export interface SoundEffectProps {
  /** Nome da animação/transição para buscar o SFX */
  effectName: string;
  /** Frame em que o SFX deve começar */
  startFrame?: number;
  /** Volume (0 a 1) */
  volume?: number;
}

export const SoundEffect: React.FC<SoundEffectProps> = ({
  effectName,
  startFrame = 0,
  volume = 0.6,
}) => {
  const sfxFile = SFX_MAP[effectName];
  if (!sfxFile) return null;

  return (
    <Audio
      src={staticFile(sfxFile)}
      startFrom={0}
      volume={volume}
      // playbackRate={1}
    />
  );
};

export const getSfxFile = (effectName: string): string | null => {
  return SFX_MAP[effectName] || null;
};
