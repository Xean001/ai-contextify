import { estimateTokens } from "./tokens.js";

export interface Chunk {
  index: number;
  tokens: number;
  content: string;
}

/**
 * Split text into chunks of approximately `targetTokens` tokens,
 * preferring paragraph and line boundaries to avoid mid-sentence cuts.
 */
export function chunkText(text: string, targetTokens = 6_000): Chunk[] {
  if (!text.trim()) return [];

  const paragraphs = text.split(/\n{2,}/);
  const chunks: Chunk[] = [];
  let buffer = "";
  let bufferTokens = 0;

  const flush = (): void => {
    if (!buffer.trim()) return;
    chunks.push({
      index: chunks.length,
      tokens: bufferTokens,
      content: buffer.trim(),
    });
    buffer = "";
    bufferTokens = 0;
  };

  for (const paragraph of paragraphs) {
    const pTokens = estimateTokens(paragraph);

    if (pTokens > targetTokens) {
      flush();
      // Hard-split very large blocks line by line.
      let lineBuf = "";
      let lineTokens = 0;
      for (const line of paragraph.split("\n")) {
        const lt = estimateTokens(line);
        if (lineTokens + lt > targetTokens && lineBuf) {
          chunks.push({
            index: chunks.length,
            tokens: lineTokens,
            content: lineBuf,
          });
          lineBuf = "";
          lineTokens = 0;
        }
        lineBuf += (lineBuf ? "\n" : "") + line;
        lineTokens += lt;
      }
      if (lineBuf) {
        chunks.push({
          index: chunks.length,
          tokens: lineTokens,
          content: lineBuf,
        });
      }
      continue;
    }

    if (bufferTokens + pTokens > targetTokens) flush();
    buffer += (buffer ? "\n\n" : "") + paragraph;
    bufferTokens += pTokens;
  }

  flush();
  return chunks;
}
