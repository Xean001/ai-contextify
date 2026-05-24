import path from "node:path";
import fs from "fs-extra";
import type { BuildSummary } from "../types.js";

export async function exportMetadata(
  outputPath: string,
  summary: BuildSummary,
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}
