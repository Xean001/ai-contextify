import fs from "fs-extra";

export async function parseText(absolutePath: string): Promise<string> {
  const raw = await fs.readFile(absolutePath, "utf8");
  return raw.replace(/\r\n/g, "\n").trim();
}
