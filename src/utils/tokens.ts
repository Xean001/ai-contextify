/**
 * Cheap, dependency-free token estimator.
 * Heuristic: ~4 characters per token for English/code,
 * with a small penalty for whitespace-heavy text.
 * Good enough for budgeting context windows without bundling a tokenizer.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const charCount = text.length;
  const whitespace = (text.match(/\s/g) ?? []).length;
  const effective = charCount - whitespace * 0.3;
  return Math.max(1, Math.ceil(effective / 4));
}

export function formatTokenCount(n: number): string {
  if (n < 1_000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
