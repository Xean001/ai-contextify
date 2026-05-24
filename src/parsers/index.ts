import path from "node:path";
import type { FileKind } from "../types.js";
import { isCodeExtension } from "../utils/language.js";
import { parseCode } from "./code.js";
import { parseDocx } from "./docx.js";
import { parseJson } from "./json.js";
import { parseMarkdown } from "./markdown.js";
import { parsePdf } from "./pdf.js";
import { parseText } from "./text.js";

export interface DetectedFile {
  kind: FileKind;
  extension: string;
}

export function detectKind(absolutePath: string): DetectedFile {
  const extension = path.extname(absolutePath).toLowerCase();
  const base = path.basename(absolutePath).toLowerCase();

  switch (extension) {
    case ".pdf":
      return { kind: "pdf", extension };
    case ".docx":
      return { kind: "docx", extension };
    case ".md":
    case ".mdx":
    case ".markdown":
      return { kind: "markdown", extension };
    case ".json":
    case ".jsonc":
      return { kind: "json", extension };
    case ".txt":
    case ".log":
    case ".rst":
      return { kind: "text", extension };
  }

  if (isCodeExtension(extension)) return { kind: "code", extension };
  if (base === "dockerfile" || base.startsWith("dockerfile.")) {
    return { kind: "code", extension: ".dockerfile" };
  }
  if (base === "makefile") return { kind: "code", extension: ".makefile" };

  return { kind: "unknown", extension };
}

export async function parseFile(
  absolutePath: string,
  kind: FileKind,
): Promise<string> {
  switch (kind) {
    case "pdf":
      return parsePdf(absolutePath);
    case "docx":
      return parseDocx(absolutePath);
    case "markdown":
      return parseMarkdown(absolutePath);
    case "json":
      return parseJson(absolutePath);
    case "code":
      return parseCode(absolutePath);
    case "text":
      return parseText(absolutePath);
    case "unknown":
      return parseText(absolutePath);
  }
}
