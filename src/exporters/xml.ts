import path from "node:path";
import fs from "fs-extra";
import type { ParsedFile } from "../types.js";

export interface XmlExportOptions {
  outputPath: string;
  inputDir: string;
  generatedAt: string;
}

/**
 * Emit a Claude-style `<documents>` XML bundle. This format is the one
 * Anthropic recommends for stuffing multiple documents into a single prompt.
 */
export async function exportClaudeXml(
  files: ParsedFile[],
  options: XmlExportOptions,
): Promise<void> {
  const lines: string[] = [];
  lines.push(`<!-- ai-contextify · ${options.generatedAt} -->`);
  lines.push(`<!-- source: ${escapeAttr(options.inputDir)} -->`);
  lines.push("<documents>");

  files.forEach((file, index) => {
    lines.push(`  <document index="${index + 1}">`);
    lines.push(`    <source>${escapeText(file.relativePath)}</source>`);
    lines.push(`    <kind>${file.kind}</kind>`);
    lines.push(`    <tokens>${file.estimatedTokens}</tokens>`);
    lines.push("    <document_content>");
    lines.push(escapeText(file.content));
    lines.push("    </document_content>");
    lines.push("  </document>");
  });

  lines.push("</documents>");

  await fs.ensureDir(path.dirname(options.outputPath));
  await fs.writeFile(options.outputPath, `${lines.join("\n")}\n`, "utf8");
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}
