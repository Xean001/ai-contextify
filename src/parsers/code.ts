import fs from "fs-extra";

export async function parseCode(absolutePath: string): Promise<string> {
  const raw = await fs.readFile(absolutePath, "utf8");
  return raw.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
}
