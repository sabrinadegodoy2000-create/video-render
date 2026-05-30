import React from "react";
import { AbsoluteFill, Img, OffthreadVideo } from "remotion";

const VIDEO_EXT_RE = /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$|%)/i;

/**
 * Wrapper seguro para <Img> — se src estiver vazio/undefined,
 * renderiza um retângulo preto em vez de crashar.
 * Se src for um arquivo de vídeo (.mp4 etc.), usa <OffthreadVideo> automaticamente.
 */
export const SafeImg: React.FC<React.ComponentProps<typeof Img>> = (props) => {
  if (!props.src) {
    return (
      <div
        style={{
          width: props.style?.width || "100%",
          height: props.style?.height || "100%",
          backgroundColor: "#000",
        }}
      />
    );
  }

  // Auto-detect video files — render OffthreadVideo instead of Img
  if (VIDEO_EXT_RE.test(decodeURIComponent(props.src))) {
    return (
      <OffthreadVideo
        src={props.src}
        style={props.style}
        volume={0}
        muted
      />
    );
  }

  return <Img {...props} />;
};

/**
 * Wrapper seguro para <OffthreadVideo> — se src estiver vazio/undefined,
 * renderiza um retângulo preto em vez de crashar.
 */
export const SafeVideo: React.FC<React.ComponentProps<typeof OffthreadVideo>> = (props) => {
  if (!props.src) {
    return (
      <div
        style={{
          width: props.style?.width || "100%",
          height: props.style?.height || "100%",
          backgroundColor: "#000",
        }}
      />
    );
  }
  return <OffthreadVideo volume={0.1} {...props} />;
};
