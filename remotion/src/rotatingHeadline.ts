import { interpolate } from "remotion";

export type HeadlineItem = { headline: string; subheadline?: string };

/**
 * true se existe manchete de verdade (1+ item com headline OU subheadline preenchido).
 * Decisão ESTÁTICA pro layout (calculada uma vez, não por frame): sem manchete, o
 * componente pode reservar zero espaço pro rodapé e deixar o vídeo tomar tudo, sem
 * risco de redimensionar no meio do vídeo numa rotação de manchetes.
 */
export function hasHeadlineContent(items: HeadlineItem[]): boolean {
  return (items || []).some((h) => h && (h.headline || h.subheadline));
}

/**
 * Rotaciona manchetes a cada `rotateSec` segundos (default 60).
 * - 0/1 item  → manchete fixa até o fim, sem fade.
 * - N itens   → intercala em loop até o fim do vídeo, com um fade curto na troca.
 *
 * Devolve a manchete/subtítulo ativa no frame atual + a opacidade (pro fade-in).
 * Uso nos componentes: monte a lista com `headlines` (se vier) ou o par único
 * `[{ headline, subheadline }]` e aplique a opacidade no container do texto.
 */
export function pickHeadline(
  items: HeadlineItem[],
  frame: number,
  fps: number,
  rotateSec = 60,
): { headline: string; subheadline: string; opacity: number } {
  const list = (items || []).filter((h) => h && (h.headline || h.subheadline));
  if (list.length === 0) return { headline: "", subheadline: "", opacity: 1 };
  if (list.length === 1)
    return { headline: list[0].headline || "", subheadline: list[0].subheadline || "", opacity: 1 };

  const period = Math.max(1, Math.round(rotateSec * fps));
  const idx = Math.floor(frame / period) % list.length;
  const local = frame % period; // frames desde a última troca
  const fade = Math.min(Math.floor(period / 2), Math.round(0.4 * fps)); // ~0.4s
  const opacity = interpolate(local, [0, fade], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cur = list[idx];
  return { headline: cur.headline || "", subheadline: cur.subheadline || "", opacity };
}
