import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { HostPIP } from "./HostPIP";

export const HostPIPShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {/* Fundo simulado */}
      <AbsoluteFill>
        <img
          src={staticFile("samples/img1.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
        />
      </AbsoluteFill>
      <HostPIP
        videoSrc={staticFile("samples/img2.jpg")}
        borderColor="#ef4444"
        pipVideoStartSec={0}
        enterFrame={10}
      />
    </AbsoluteFill>
  );
};
