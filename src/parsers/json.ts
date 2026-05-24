import fs from "fs-extra";

export async function parseJson(absolutePath: string): Promise<string> {
  const raw = await fs.readFile(absolutePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw.trim();
  }
}
