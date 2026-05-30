import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { SafeImg } from "./components/SafeMedia";
import type {
  DynamicVideoPlan,
  DynBlock,
  DynOverlay,
  DynSpecialEffect,
} from "./DynamicVideoTypes";
import { SegmentClip } from "./components/SegmentClip";
import {
  CinematicTransition,
  TransitionType,
} from "./components/CinematicTransition";
import { LowerThird } from "./components/LowerThird";
import { AnimatedText } from "./components/AnimatedText";
import { NarrationOverlay } from "./components/NarrationOverlay";
import { BigText } from "./components/BigText";
import { CardsReveal } from "./components/CardsReveal";
import { HighlightZoom } from "./components/HighlightZoom";
import { SplitTextMedia } from "./components/SplitTextMedia";
import { TriplePanel } from "./components/TriplePanel";
import { MediaTextHalf } from "./components/MediaTextHalf";
import { MediaRiseTitle } from "./components/MediaRiseTitle";
import { InstaFeed } from "./components/InstaFeed";
import { NeonRise } from "./components/NeonRise";
import { CardSpread } from "./components/CardSpread";
import { SplitExpandReveal } from "./components/SplitExpandReveal";
import { QuadGrid } from "./components/QuadGrid";
import { HostPIP } from "./components/HostPIP";
import { NewsCover } from "./components/NewsCover";
import { SourcesCard } from "./components/SourcesCard";
import { getSfxFile } from "./components/SoundEffect";

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

const sec2fr = (sec: number, fps: number) => Math.round(sec * fps);

/** Renderiza os segmentos de um bloco sequencialmente */
const BlockSegments: React.FC<{ block: DynBlock; fps: number }> = ({
  block,
  fps,
}) => {
  let offset = 0;
  return (
    <>
      {block.segments.map((seg, i) => {
        const segFrames = sec2fr(seg.durationSec, fps);
        const el = (
          <Sequence key={i} from={offset} durationInFrames={segFrames}>
            <SegmentClip
              segment={{
                type: seg.type,
                src: seg.src,
                durationSec: seg.durationSec,
                animation: seg.animation,
                flipBlur: seg.flipBlur,
              }}
              durationFrames={segFrames}
            />
          </Sequence>
        );
        offset += segFrames;
        return el;
      })}
    </>
  );
};

/** Renderiza o conteúdo do último segmento de um bloco (para transição outgoing) */
const LastSegmentOf: React.FC<{ block: DynBlock; fps: number }> = ({
  block,
  fps,
}) => {
  const seg = block.segments[block.segments.length - 1];
  if (!seg) return null;
  const segFrames = sec2fr(seg.durationSec, fps);
  return (
    <AbsoluteFill>
      <SegmentClip
        segment={{
          type: seg.type,
          src: seg.src,
          durationSec: seg.durationSec,
          animation: seg.animation,
          flipBlur: seg.flipBlur,
        }}
        durationFrames={segFrames}
      />
    </AbsoluteFill>
  );
};

/** Renderiza o conteúdo do primeiro segmento de um bloco (para transição incoming) */
const FirstSegmentOf: React.FC<{ block: DynBlock; fps: number }> = ({
  block,
  fps,
}) => {
  const seg = block.segments[0];
  if (!seg) return null;
  const segFrames = sec2fr(seg.durationSec, fps);
  return (
    <AbsoluteFill>
      <SegmentClip
        segment={{
          type: seg.type,
          src: seg.src,
          durationSec: seg.durationSec,
          animation: seg.animation,
          flipBlur: seg.flipBlur,
        }}
        durationFrames={segFrames}
      />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Overlay Renderer
// ═══════════════════════════════════════════════════════════════════════

const OverlayRenderer: React.FC<{
  item: DynOverlay;
  durationFrames: number;
}> = ({ item, durationFrames }) => {
  switch (item.type) {
    case "lower-third":
      return (
        <LowerThird
          style={item.style}
          title={item.title}
          subtitle={item.subtitle}
          primaryColor={item.primaryColor}
          enterFrame={0}
          exitFrame={durationFrames - 20}
        />
      );
    case "animated-text":
      return (
        <AnimatedText
          text={item.text}
          animationStyle={item.animationStyle}
          color={item.color}
          backgroundColor={item.backgroundColor}
          fontSize={item.fontSize}
          position={item.position}
          enterFrame={0}
        />
      );
    case "narration-overlay":
      return (
        <NarrationOverlay
          style={item.style}
          text={item.text}
          highlightWords={item.highlightWords}
          highlightColor={item.highlightColor}
          position={item.position}
          fontSize={item.fontSize}
          enterFrame={0}
        />
      );
    default:
      return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Special Effect Renderer
// ═══════════════════════════════════════════════════════════════════════

const SpecialEffectRenderer: React.FC<{
  item: DynSpecialEffect;
}> = ({ item }) => {
  switch (item.type) {
    case "big-text":
      return (
        <AbsoluteFill>
          {/* Imagem/vídeo de fundo se fornecido */}
          {item.bgSrc && item.bgType !== "video" && (
            <SafeImg
              src={item.bgSrc}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          <BigText
            text={item.text}
            color={item.color}
            fontSize={item.fontSize}
            animation={item.animation}
            enterFrame={5}
          />
        </AbsoluteFill>
      );
    case "cards-reveal":
      return (
        <CardsReveal
          cards={item.cards}
          cardWidth={item.cardWidth}
          cardHeight={item.cardHeight}
          backgroundColor={item.backgroundColor}
          labelColor={item.labelColor}
          enterFrame={5}
        />
      );
    case "highlight-zoom":
      return (
        <HighlightZoom
          text={item.text}
          fontSize={item.fontSize}
          color={item.color}
          highlightColor={item.highlightColor}
          backgroundColor={item.backgroundColor}
          enterFrame={5}
          playSfx
        />
      );
    case "split-text-media":
      return (
        <SplitTextMedia
          mediaSrc={item.mediaSrc}
          mediaType={item.mediaType}
          leftText={item.leftText}
          rightText={item.rightText}
          fontSize={item.fontSize}
          color={item.color}
          backgroundColor={item.backgroundColor}
          enterFrame={5}
        />
      );
    case "triple-panel":
      return (
        <TriplePanel
          panels={item.panels}
          fontSize={item.fontSize}
          color={item.color}
          enterFrame={5}
        />
      );
    case "media-text-half":
      return (
        <MediaTextHalf
          mediaSrc={item.mediaSrc}
          mediaType={item.mediaType}
          title={item.title}
          paragraphs={item.paragraphs || []}
          titleColor={item.color}
          backgroundColor={item.backgroundColor}
          enterFrame={5}
        />
      );
    case "media-rise-title":
      return (
        <MediaRiseTitle
          mediaSrc={item.mediaSrc}
          mediaType={item.mediaType}
          title={item.title}
          titleColor={item.color}
          backgroundColor={item.backgroundColor}
          enterFrame={5}
        />
      );
    case "insta-feed":
      return (
        <InstaFeed
          cards={item.cards || []}
          backgroundColor={item.backgroundColor}
          enterFrame={5}
        />
      );
    case "neon-rise":
      return (
        <NeonRise
          mediaSrc={item.mediaSrc}
          mediaType={item.mediaType}
          neonColor={item.neonColor}
          backgroundColor={item.backgroundColor}
          enterFrame={5}
        />
      );
    case "card-spread":
      return (
        <CardSpread
          cards={item.cards || []}
          enterFrame={5}
        />
      );
    case "split-expand-reveal":
      return (
        <SplitExpandReveal
          mediaSrc={item.mediaSrc}
          mediaType={item.mediaType}
          title={item.title}
          topics={item.topics || []}
          enterFrame={5}
        />
      );
    case "quad-grid":
      return (
        <QuadGrid
          media={item.media || []}
          gap={item.gap}
          enterFrame={5}
        />
      );
    case "host-pip":
      return (
        <HostPIP
          videoSrc={item.videoSrc}
          borderColor={item.borderColor}
          pipVideoStartSec={item.pipVideoStartSec}
          enterFrame={0}
        />
      );
    case "news-cover":
      return (
        <NewsCover
          title={item.title}
          subtitle={item.subtitle}
          author={item.author}
          date={item.date}
          imageSrc={item.imageSrc}
          accentColor={item.accentColor}
          enterFrame={5}
        />
      );
    case "sources-card":
      return (
        <SourcesCard
          lang={item.lang ?? "pt"}
          logos={item.logos}
        />
      );
    default:
      return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Special Effect Fade Wrapper — fade-in/out suave nos efeitos especiais
// ═══════════════════════════════════════════════════════════════════════

const SpecialEffectFade: React.FC<{
  durationFrames: number;
  children: React.ReactNode;
}> = ({ durationFrames, children }) => {
  const frame = useCurrentFrame();
  const FADE = 8; // 8 frames ≈ 0.27s de fade

  const opacity = interpolate(
    frame,
    [0, FADE, durationFrames - FADE, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// DynamicVideo — Composição principal
// ═══════════════════════════════════════════════════════════════════════

export const DynamicVideo: React.FC<DynamicVideoPlan> = ({
  blocks,
  overlays = [],
  specialEffects = [],
  audio,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>

      {/* ── LAYER 1: Blocos (backbone visual) ─────────────────────── */}
      {blocks.map((block, i) => {
        const startFrame = sec2fr(block.startSec, fps);
        const durFrames = sec2fr(block.endSec - block.startSec, fps);

        return (
          <Sequence
            key={`block-${block.id}`}
            from={startFrame}
            durationInFrames={durFrames}
          >
            <AbsoluteFill>
              <BlockSegments block={block} fps={fps} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* ── LAYER 2: Transições cinematográficas entre blocos ─────── */}
      {blocks.map((block, i) => {
        const nextBlock = blocks[i + 1];
        if (!block.transition || !nextBlock) return null;

        const transDurSec = block.transition.durationSec;
        const transFrames = sec2fr(transDurSec, fps);
        // A transição começa no final do bloco atual
        const transStartFrame = sec2fr(block.endSec, fps) - transFrames;

        return (
          <Sequence
            key={`trans-${block.id}`}
            from={transStartFrame}
            durationInFrames={transFrames * 2}
          >
            <CinematicTransition
              type={block.transition.type as TransitionType}
              durationFrames={transFrames * 2}
              outgoing={<LastSegmentOf block={block} fps={fps} />}
              incoming={<FirstSegmentOf block={nextBlock} fps={fps} />}
            />
          </Sequence>
        );
      })}

      {/* ── LAYER 3: Efeitos especiais (full-screen) ──────────────── */}
      {specialEffects.map((fx, i) => {
        const startFrame = sec2fr(fx.startSec, fps);
        const durFrames = sec2fr(fx.durationSec, fps);

        // host-pip gerencia sua própria animação — sem SpecialEffectFade
        if (fx.type === "host-pip") {
          return (
            <Sequence key={`fx-${i}`} from={startFrame} durationInFrames={durFrames}>
              <SpecialEffectRenderer item={fx} />
            </Sequence>
          );
        }

        return (
          <Sequence
            key={`fx-${i}`}
            from={startFrame}
            durationInFrames={durFrames}
          >
            <SpecialEffectFade durationFrames={durFrames}>
              <SpecialEffectRenderer item={fx} />
            </SpecialEffectFade>
          </Sequence>
        );
      })}

      {/* ── LAYER 4: Overlays (lower thirds, texto, narração) ─────── */}
      {overlays.map((ov, i) => {
        const startFrame = sec2fr(ov.startSec, fps);
        const durFrames = sec2fr(ov.durationSec, fps);

        return (
          <Sequence
            key={`ov-${i}`}
            from={startFrame}
            durationInFrames={durFrames}
          >
            <OverlayRenderer item={ov} durationFrames={durFrames} />
          </Sequence>
        );
      })}

      {/* ── LAYER 5: Áudio ────────────────────────────────────────── */}
      {audio?.narrationSrc && (
        <Audio src={audio.narrationSrc} volume={audio.narrationVolume ?? 1} />
      )}
      {audio?.bgMusicSrc && (
        <Audio
          src={audio.bgMusicSrc}
          volume={audio.bgMusicVolume ?? 0.08}
          loop
        />
      )}
    </AbsoluteFill>
  );
};
