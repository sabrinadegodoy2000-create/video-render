/** Tipografia global — altere aqui para refletir em todos os componentes */
export const FONT_FAMILY = "'Neue Haas Grotesk Display Pro', 'Helvetica Now Display', 'Helvetica', Arial, sans-serif";
export const LETTER_SPACING = -4;

/**
 * Calcula fontSize que garante que o texto caiba na largura disponível.
 * charWidthRatio: largura estimada de cada caractere como fração do fontSize (0.55 para bold).
 */
export function fitFontSize(
  text: string,
  desiredSize: number,
  maxWidthPx: number,
  charWidthRatio = 0.55,
  minSize = 28,
): number {
  if (!text) return desiredSize;
  // Pega a linha mais longa se tiver quebras
  const longestLine = text.split("\n").reduce((a, b) => (a.length > b.length ? a : b), "");
  const textWidth = longestLine.length * desiredSize * charWidthRatio;
  if (textWidth <= maxWidthPx) return desiredSize;
  const fitted = Math.floor(maxWidthPx / (longestLine.length * charWidthRatio));
  return Math.max(minSize, fitted);
}
