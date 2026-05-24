import fs from "fs-extra";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

const processor = remark().use(remarkGfm);

export async function parseMarkdown(absolutePath: string): Promise<string> {
  const raw = await fs.readFile(absolutePath, "utf8");
  // Round-trip through remark to normalize whitespace, list markers, etc.
  const file = await processor.process(raw);
  return String(file).replace(/\r\n/g, "\n").trim();
}
