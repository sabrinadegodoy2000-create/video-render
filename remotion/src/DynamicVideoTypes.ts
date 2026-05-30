// ═══════════════════════════════════════════════════════════════════════
// DynamicVideoTypes.ts — Schema JSON para o DynamicVideo
// O backend gera esse JSON, o Remotion lê e renderiza o vídeo.
// ═══════════════════════════════════════════════════════════════════════

// ── Tempo ────────────────────────────────────────────────────────────

/** Todos os tempos são em segundos (float) */
export interface TimeRange {
  startSec: number;
  durationSec: number;
}

// ── Segmentos (mídia dentro dos blocos) ──────────────────────────────

export type SegmentAnimation =
  | "ken-burns" | "zoom-in" | "zoom-out"
  | "pan-left" | "pan-right" | "none" | "isometric";

export interface DynSegment {
  type: "image" | "video";
  src: string;
  durationSec: number;
  animation?: SegmentAnimation;
  flipBlur?: boolean;
}

// ── Transições ───────────────────────────────────────────────────────

export type CinematicTransitionType =
  | "zoom-through" | "blur-dissolve" | "slide-over" | "whip-pan"
  | "crossfade" | "cinematic-bars" | "iris-wipe" | "glitch";

export interface DynTransition {
  type: CinematicTransitionType;
  durationSec: number;
  /** Som na transição (default: true) */
  sfx?: boolean;
}

// ── Blocos (backbone visual) ─────────────────────────────────────────

export interface DynBlock {
  id: string;
  startSec: number;
  endSec: number;
  segments: DynSegment[];
  /** Transição para o próximo bloco */
  transition?: DynTransition;
}

// ── Overlays (aparecem por cima dos blocos) ──────────────────────────

export interface DynLowerThird extends TimeRange {
  type: "lower-third";
  style: "sports-bar" | "news-ticker";
  title: string;
  subtitle?: string;
  primaryColor?: string;
}

export type AnimatedTextStyle =
  | "word-by-word" | "typewriter" | "fade-up" | "slide-reveal" | "scale-pop";

export interface DynAnimatedText extends TimeRange {
  type: "animated-text";
  text: string;
  animationStyle?: AnimatedTextStyle;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  position?: "top" | "center" | "bottom";
}

export interface DynNarrationOverlay extends TimeRange {
  type: "narration-overlay";
  style: "split-screen";
  text: string;
  highlightWords?: string[];
  highlightColor?: string;
  position?: "top" | "center" | "bottom";
  fontSize?: number;
}

export type DynOverlay = DynLowerThird | DynAnimatedText | DynNarrationOverlay;

// ── Efeitos especiais (full-screen) ──────────────────────────────────

export interface DynBigText extends TimeRange {
  type: "big-text";
  text: string;
  /** Imagem/vídeo de fundo atrás do texto */
  bgSrc?: string;
  bgType?: "image" | "video";
  color?: string;
  fontSize?: number;
  animation?: "scale-up" | "slide-up" | "fade-in" | "zoom-through" | "pop";
}

export interface DynCardsReveal extends TimeRange {
  type: "cards-reveal";
  cards: Array<{ img: string; label?: string }>;
  cardWidth?: number;
  cardHeight?: number;
  backgroundColor?: string;
  labelColor?: string;
}

export interface DynHighlightZoom extends TimeRange {
  type: "highlight-zoom";
  text: string;
  fontSize?: number;
  color?: string;
  highlightColor?: string;
  backgroundColor?: string;
}

export interface DynSplitTextMedia extends TimeRange {
  type: "split-text-media";
  mediaSrc: string;
  mediaType?: "image" | "video";
  leftText: string;
  rightText: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
}

export interface DynTriplePanel extends TimeRange {
  type: "triple-panel";
  panels: [
    { src: string; type?: "image" | "video"; word: string },
    { src: string; type?: "image" | "video"; word: string },
    { src: string; type?: "image" | "video"; word: string },
  ];
  fontSize?: number;
  color?: string;
}

export interface DynMediaTextHalf {
  type: "media-text-half";
  startSec: number;
  durationSec: number;
  mediaSrc: string;
  mediaType?: "image" | "video";
  title: string;
  paragraphs?: string[];
  color?: string;
  backgroundColor?: string;
}

export interface DynMediaRiseTitle {
  type: "media-rise-title";
  startSec: number;
  durationSec: number;
  mediaSrc: string;
  mediaType?: "image" | "video";
  title: string;
  color?: string;
  backgroundColor?: string;
}

export interface DynInstaFeed {
  type: "insta-feed";
  startSec: number;
  durationSec: number;
  cards: { src: string; type?: "image" | "video" }[];
  backgroundColor?: string;
}

export interface DynNeonRise {
  type: "neon-rise";
  startSec: number;
  durationSec: number;
  mediaSrc: string;
  mediaType?: "image" | "video";
  neonColor?: string;
  backgroundColor?: string;
}

export interface DynCardSpread {
  type: "card-spread";
  startSec: number;
  durationSec: number;
  cards: { src: string; type?: "image" | "video" }[];
}

export interface DynSplitExpandReveal extends TimeRange {
  type: "split-expand-reveal";
  mediaSrc: string;
  mediaType?: "image" | "video";
  title?: string;
  topics?: string[];
}

export interface DynQuadGrid extends TimeRange {
  type: "quad-grid";
  media: Array<{ src: string; type?: "image" | "video" }>;
  gap?: number;
}

export interface DynHostPIP extends TimeRange {
  type: "host-pip";
  videoSrc: string;
  pipVideoStartSec?: number;
  borderColor?: string;
}

export interface DynNewsCover extends TimeRange {
  type: "news-cover";
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  imageSrc?: string;
  accentColor?: string;
}

export interface DynSourcesCard extends TimeRange {
  type: "sources-card";
  lang?: "pt" | "it";
  logos?: string[]; // filenames, ex: ["g1-logo.png", "uol-logo.png"]
}

export type DynSpecialEffect =
  | DynBigText
  | DynCardsReveal
  | DynHighlightZoom
  | DynSplitTextMedia
  | DynTriplePanel
  | DynMediaTextHalf
  | DynMediaRiseTitle
  | DynInstaFeed
  | DynNeonRise
  | DynCardSpread
  | DynSplitExpandReveal
  | DynQuadGrid
  | DynHostPIP
  | DynNewsCover
  | DynSourcesCard;

// ── Áudio ────────────────────────────────────────────────────────────

export interface DynAudio {
  narrationSrc?: string;
  narrationVolume?: number;
  bgMusicSrc?: string;
  bgMusicVolume?: number;
}

// ── Plano completo ───────────────────────────────────────────────────

export interface DynamicVideoPlan {
  totalDurationSec: number;
  fps?: number;
  width?: number;
  height?: number;
  /** Backbone visual: blocos sequenciais de mídia */
  blocks: DynBlock[];
  /** Overlays (lower thirds, texto animado, narração) */
  overlays?: DynOverlay[];
  /** Efeitos especiais full-screen */
  specialEffects?: DynSpecialEffect[];
  /** Configuração de áudio */
  audio?: DynAudio;
}
