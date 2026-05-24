import path from "node:path";
import fs from "fs-extra";
import { chunkText } from "../utils/chunking.js";

export interface ChunkExportOptions {
  outputDir: string;
  combinedMarkdown: string;
  chunkTokens: number;
}

export async function exportChunks(
  options: ChunkExportOptions,
): Promise<string[]> {
  const chunks = chunkText(options.combinedMarkdown, options.chunkTokens);
  await fs.ensureDir(options.outputDir);

  const written: string[] = [];
  const pad = String(chunks.length).length;

  for (const chunk of chunks) {
    const filename = `chunk-${String(chunk.index + 1).padStart(pad, "0")}.md`;
    const fullPath = path.join(options.outputDir, filename);
    const header = `<!-- chunk ${chunk.index + 1}/${chunks.length} · ~${chunk.tokens} tokens -->\n\n`;
    await fs.writeFile(fullPath, header + chunk.content + "\n", "utf8");
    written.push(fullPath);
  }

  return written;
}
