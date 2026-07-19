import { staticFile } from "remotion";
import { Standing } from "./DriverStandings";

/**
 * Estilo por equipe (constructorId da API Jolpica) — cor + logo + ajuste de escala.
 * Compartilhado entre TODOS os canais de F1 (Mondo Ferrari, Il Muretto F1, ...) —
 * atualiza uma vez só quando a grade de equipes/liveries mudar de temporada.
 * Times sem logo no projeto caem no fallback (caixinha branca), mas mantêm a cor.
 */
export const TEAM_STYLE: Record<string, { color: string; logo?: string; scale?: number }> = {
  mercedes:     { color: "#00D2BE", logo: staticFile("logo-mercedes.svg") },
  ferrari:      { color: "#DC0000", logo: staticFile("ferrari-f1-logo.png"), scale: 1.45 },
  mclaren:      { color: "#FF8000", logo: staticFile("mclaren-f1-logo.png") },
  red_bull:     { color: "#1E41FF", logo: staticFile("redbull-f1-logo.png"), scale: 1.35 },
  alpine:       { color: "#0093CC", logo: staticFile("alpine-f1-logo.png") },
  rb:           { color: "#6692FF", logo: staticFile("racingbulls-logo.webp") },
  haas:         { color: "#9C9FA2" },
  williams:     { color: "#005AFF" },
  audi:         { color: "#00594F" },
  aston_martin: { color: "#006F62" },
  cadillac:     { color: "#9A7B4F" },
};

/** Preenche cor/logo/escala a partir do constructorId, sem sobrescrever o que já veio. */
export function resolveStandings(list: Standing[]): Standing[] {
  return list.map((s) => {
    const st = s.team ? TEAM_STYLE[s.team] : undefined;
    if (!st) return s;
    return {
      ...s,
      teamColor: s.teamColor || st.color,
      teamLogoSrc: s.teamLogoSrc ?? st.logo,
      logoScale: s.logoScale ?? st.scale,
    };
  });
}
