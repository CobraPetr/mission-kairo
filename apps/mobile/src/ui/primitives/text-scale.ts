export function resolveTextLineScale(
  fontScale: number,
  allowFontScaling: boolean,
  maxFontSizeMultiplier: number | null | undefined,
): number {
  if (!allowFontScaling) return 1;
  const maximumScale = typeof maxFontSizeMultiplier === 'number' ? maxFontSizeMultiplier : 2;
  return Math.min(fontScale, maximumScale);
}
