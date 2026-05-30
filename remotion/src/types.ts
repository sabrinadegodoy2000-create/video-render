/** Um segmento de mídia dentro de um bloco (sub-take de ~4s) */
export interface Segment {
  /** Tipo de mídia */
  type: "image" | "video";
  /** URL ou caminho absoluto do arquivo */
  src: string;
  /** Duração deste segmento em segundos */
  durationSec: number;
  /** Se deve aplicar flip horizontal + blur (anti-copyright) */
  flipBlur?: boolean;
  /** Tipo de animação para imagens (ken-burns, zoom-in, pan-left, etc.) */
  animation?: "ken-burns" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "none" | "isometric";
}

/** Um bloco do storyboard (~15-19s de narração) */
export interface Block {
  /** ID único do bloco */
  id: string;
  /** Índice da cena (áudio) */
  sceneIdx: number;
  /** Índice do bloco dentro da cena */
  blockIdx: number;
  /** Tempo de início no áudio (segundos) */
  startTime: number;
  /** Tempo de fim no áudio (segundos) */
  endTime: number;
  /** Segmentos de mídia que compõem este bloco */
  segments: Segment[];
  /** Tipo de transição para o próximo bloco */
  transition?: "fade" | "slide-left" | "slide-right" | "wipe" | "zoom" | "blur" | "none";
  /** Duração da transição em segundos */
  transitionDuration?: number;
}
