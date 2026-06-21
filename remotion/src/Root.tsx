import { Composition, staticFile } from "remotion";
import { DynamicVideo } from "./DynamicVideo";
import type { DynamicVideoPlan } from "./DynamicVideoTypes";
import { VideoComposition, VideoCompositionProps } from "./VideoComposition";
import { TextShowcase } from "./TextShowcase";
import {
  TransitionShowcase,
  TRANSITION_SHOWCASE_DURATION,
} from "./TransitionShowcase";
import {
  LowerThirdShowcase,
  LOWER_THIRD_SHOWCASE_DURATION,
} from "./LowerThirdShowcase";
import {
  NarrationShowcase,
  NARRATION_SHOWCASE_DURATION,
} from "./NarrationShowcase";
import {
  TextMaskShowcase,
  TEXT_MASK_SHOWCASE_DURATION,
} from "./TextMaskShowcase";
import {
  CardsShowcase,
  CARDS_SHOWCASE_DURATION,
} from "./CardsShowcase";
import {
  HighlightShowcase,
  HIGHLIGHT_SHOWCASE_DURATION,
} from "./HighlightShowcase";
import {
  SplitTextMediaShowcase,
  SPLIT_TEXT_MEDIA_SHOWCASE_DURATION,
} from "./SplitTextMediaShowcase";
import {
  WordCascadeShowcase,
  WORD_CASCADE_SHOWCASE_DURATION,
} from "./WordCascadeShowcase";
import {
  TriplePanelShowcase,
  TRIPLE_PANEL_SHOWCASE_DURATION,
} from "./TriplePanelShowcase";
import { MediaTextHalfShowcase } from "./components/MediaTextHalfShowcase";
import { MediaRiseTitleShowcase } from "./components/MediaRiseTitleShowcase";
import { InstaFeedShowcase } from "./components/InstaFeedShowcase";
import { NeonRiseShowcase } from "./components/NeonRiseShowcase";
import { PortraitShowcase } from "./PortraitShowcase";
import { CardSpreadShowcase } from "./components/CardSpreadShowcase";
import { SplitExpandRevealShowcase } from "./SplitExpandRevealShowcase";
import { QuadGridShowcase } from "./components/QuadGridShowcase";
import { HostPIPShowcase } from "./components/HostPIPShowcase";
import { NewsCoverShowcase } from "./components/NewsCoverShowcase";
import { SourcesCardShowcasePT, SourcesCardShowcaseIT } from "./components/SourcesCardShowcase";
import { SOURCES_CARD_DURATION } from "./components/SourcesCard";
import { FloatingPhoneShowcase, FLOATING_PHONE_DURATION } from "./FloatingPhoneShowcase";
import { SubscribePopup, SUBSCRIBE_POPUP_DURATION } from "./SubscribePopup";
import { F1Broadcast, F1_BROADCAST_DURATION } from "./F1Broadcast";
const FPS = 30;

const DEMO_PROPS: VideoCompositionProps = {
  totalDurationSec: 24,
  audioSrc: "",
  bgMusicSrc: "",
  bgMusicVolume: 0.08,
  blocks: [
    {
      id: "block_0_0",
      sceneIdx: 0,
      blockIdx: 0,
      startTime: 0,
      endTime: 12,
      transition: "fade",
      transitionDuration: 0.5,
      segments: [
        { type: "image", src: staticFile("samples/img1.jpg"), durationSec: 4.0, animation: "ken-burns" },
        { type: "image", src: staticFile("samples/img2.jpg"), durationSec: 4.0, animation: "zoom-in" },
        { type: "image", src: staticFile("samples/img3.jpg"), durationSec: 4.0, animation: "pan-left" },
      ],
    },
    {
      id: "block_0_1",
      sceneIdx: 0,
      blockIdx: 1,
      startTime: 12,
      endTime: 24,
      transition: "slide-left",
      transitionDuration: 0.5,
      segments: [
        { type: "image", src: staticFile("samples/img4.jpg"), durationSec: 4.0, animation: "zoom-out" },
        { type: "image", src: staticFile("samples/img5.jpg"), durationSec: 4.0, animation: "pan-right" },
        { type: "image", src: staticFile("samples/img6.jpg"), durationSec: 4.0, animation: "ken-burns" },
      ],
    },
  ],
};

// ── Demo plan para DynamicVideo ──────────────────────────────────────
const DEMO_DYNAMIC_PLAN: DynamicVideoPlan = {
  totalDurationSec: 40,
  blocks: [
    {
      id: "b0",
      startSec: 0,
      endSec: 12,
      segments: [
        { type: "image", src: staticFile("samples/img1.jpg"), durationSec: 4, animation: "ken-burns" },
        { type: "image", src: staticFile("samples/img2.jpg"), durationSec: 4, animation: "zoom-in" },
        { type: "image", src: staticFile("samples/img3.jpg"), durationSec: 4, animation: "pan-left" },
      ],
      transition: { type: "zoom-through", durationSec: 1 },
    },
    {
      id: "b1",
      startSec: 12,
      endSec: 24,
      segments: [
        { type: "image", src: staticFile("samples/img4.jpg"), durationSec: 4, animation: "zoom-out" },
        { type: "image", src: staticFile("samples/img5.jpg"), durationSec: 4, animation: "pan-right" },
        { type: "image", src: staticFile("samples/img6.jpg"), durationSec: 4, animation: "ken-burns" },
      ],
      transition: { type: "whip-pan", durationSec: 1 },
    },
    {
      id: "b2",
      startSec: 24,
      endSec: 40,
      segments: [
        { type: "image", src: staticFile("samples/img1.jpg"), durationSec: 4, animation: "ken-burns" },
        { type: "image", src: staticFile("samples/img3.jpg"), durationSec: 4, animation: "zoom-in" },
        { type: "image", src: staticFile("samples/img5.jpg"), durationSec: 4, animation: "pan-right" },
        { type: "image", src: staticFile("samples/img2.jpg"), durationSec: 4, animation: "zoom-out" },
      ],
    },
  ],
  overlays: [
    {
      type: "lower-third",
      startSec: 2,
      durationSec: 4,
      style: "sports-bar",
      title: "HAMILTON VENCE NA FERRARI",
      subtitle: "Primeira vitória com a Scuderia",
      primaryColor: "#dc2626",
    },
    {
      type: "animated-text",
      startSec: 14,
      durationSec: 4,
      text: "A nova era começa agora",
      animationStyle: "word-by-word",
      color: "white",
      backgroundColor: "rgba(0,0,0,0.7)",
      position: "center",
    },
  ],
  specialEffects: [
    {
      type: "big-text",
      startSec: 7,
      durationSec: 3,
      text: "2026",
      fontSize: 400,
      animation: "scale-up",
      bgSrc: staticFile("samples/img4.jpg"),
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Composição principal (backend usa essa) ── */}
      <Composition
        id="DynamicVideo"
        component={DynamicVideo as any}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={DEMO_DYNAMIC_PLAN}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.ceil((props as any).totalDurationSec * ((props as any).fps || FPS)),
          fps: (props as any).fps || FPS,
          width: (props as any).width || 1920,
          height: (props as any).height || 1080,
        })}
      />

      {/* ── Composição legada ── */}
      <Composition
        id="MainVideo"
        component={VideoComposition as any}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={DEMO_PROPS}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.ceil((props as any).totalDurationSec * FPS),
        })}
      />
      <Composition
        id="TextShowcase"
        component={TextShowcase}
        durationInFrames={FPS * 20}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="TransitionShowcase"
        component={TransitionShowcase}
        durationInFrames={TRANSITION_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="LowerThirdShowcase"
        component={LowerThirdShowcase}
        durationInFrames={LOWER_THIRD_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="NarrationShowcase"
        component={NarrationShowcase}
        durationInFrames={NARRATION_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="TextMaskShowcase"
        component={TextMaskShowcase}
        durationInFrames={TEXT_MASK_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="CardsShowcase"
        component={CardsShowcase}
        durationInFrames={CARDS_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="HighlightShowcase"
        component={HighlightShowcase}
        durationInFrames={HIGHLIGHT_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="SplitTextMediaShowcase"
        component={SplitTextMediaShowcase}
        durationInFrames={SPLIT_TEXT_MEDIA_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="WordCascadeShowcase"
        component={WordCascadeShowcase}
        durationInFrames={WORD_CASCADE_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="TriplePanelShowcase"
        component={TriplePanelShowcase}
        durationInFrames={TRIPLE_PANEL_SHOWCASE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="MediaTextHalfShowcase"
        component={MediaTextHalfShowcase}
        durationInFrames={90}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="MediaRiseTitleShowcase"
        component={MediaRiseTitleShowcase}
        durationInFrames={90}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="InstaFeedShowcase"
        component={InstaFeedShowcase}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="NeonRiseShowcase"
        component={NeonRiseShowcase}
        durationInFrames={120}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PortraitShowcase"
        component={PortraitShowcase}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="CardSpreadShowcase"
        component={CardSpreadShowcase}
        durationInFrames={120}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="SplitExpandRevealShowcase"
        component={SplitExpandRevealShowcase}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="QuadGridShowcase"
        component={QuadGridShowcase}
        durationInFrames={120}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="HostPIPShowcase"
        component={HostPIPShowcase}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="NewsCoverShowcase"
        component={NewsCoverShowcase}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="SourcesCardPT"
        component={SourcesCardShowcasePT}
        durationInFrames={SOURCES_CARD_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="SourcesCardIT"
        component={SourcesCardShowcaseIT}
        durationInFrames={SOURCES_CARD_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="FloatingPhone"
        component={FloatingPhoneShowcase as any}
        durationInFrames={FLOATING_PHONE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          portraitVideoSrc: staticFile("samples/img1.jpg"),
          logoSrc: staticFile("logo.png"),
          wideSegments: Array.from({ length: 24 }, (_, i) => ({
            src: staticFile(`samples/img${(i % 6) + 1}.jpg`),
            type: "photo" as const,
            durationSec: 5,
          })),
          durationSec: 130,
          showInstagram: true,
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.ceil((props as any).durationSec * FPS),
        })}
      />
      <Composition
        id="SubscribePopup"
        component={SubscribePopup as any}
        durationInFrames={SUBSCRIBE_POPUP_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          channelName: "Mondo Ferrari F1",
          channelHandle: "@MondoFerrariF1",
          avatarSrc: staticFile("logo-estranho.png"),
          durationSec: 12,
          cycleSec: 40,
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.ceil((props as any).durationSec * FPS),
        })}
      />
      <Composition
        id="F1Broadcast"
        component={F1Broadcast as any}
        durationInFrames={F1_BROADCAST_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          bigSegments: [],
          standings: [
            { pos: 1, name: "Antonelli", points: 156, teamColor: "#00D2BE", teamLogoSrc: staticFile("logo-mercedes.svg") },
            { pos: 2, name: "Hamilton", points: 115, teamColor: "#DC0000", teamLogoSrc: staticFile("ferrari-f1-logo.png"), logoScale: 1.45 },
            { pos: 3, name: "Russell", points: 106, teamColor: "#00D2BE", teamLogoSrc: staticFile("logo-mercedes.svg") },
            { pos: 4, name: "Leclerc", points: 75, teamColor: "#DC0000", teamLogoSrc: staticFile("ferrari-f1-logo.png"), logoScale: 1.45 },
            { pos: 5, name: "Norris", points: 73, teamColor: "#FF8000", teamLogoSrc: staticFile("mclaren-f1-logo.png") },
            { pos: 6, name: "Piastri", points: 68, teamColor: "#FF8000", teamLogoSrc: staticFile("mclaren-f1-logo.png") },
            { pos: 7, name: "Verstappen", points: 55, teamColor: "#1E41FF", teamLogoSrc: staticFile("redbull-f1-logo.png"), logoScale: 1.35 },
            { pos: 8, name: "Gasly", points: 41, teamColor: "#0093CC", teamLogoSrc: staticFile("alpine-f1-logo.png") },
            { pos: 9, name: "Hadjar", points: 34, teamColor: "#1E41FF", teamLogoSrc: staticFile("redbull-f1-logo.png"), logoScale: 1.35 },
            { pos: 10, name: "Lawson", points: 28, teamColor: "#6692FF", teamLogoSrc: staticFile("racingbulls-logo.webp") },
          ],
          programLogoSrc: staticFile("logo-programa.png"),
          f1LogoSrc: staticFile("logo-f1-aqui.png"),
          backgroundSrc: staticFile("fundo-tela.png"),
          driverLeft: { name: "Leclerc", photoSrc: staticFile("leclerc-aqui-foto.png") },
          driverRight: { name: "Hamilton", photoSrc: staticFile("hamilton-aqui.png") },
          headline: "FERRARI DOMINA A SESSÃO",
          subheadline: "Leclerc e Hamilton lideram os treinos livres em Monza",
          durationSec: 45,
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.ceil((props as any).durationSec * FPS),
        })}
      />
    </>
  );
};
