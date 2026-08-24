import fs from "fs-extra";
// pdf-parse is CommonJS; import the default function.
import pdfParse from "pdf-parse";

export async function parsePdf(absolutePath: string): Promise<string> {
  const buffer = await fs.readFile(absolutePath);
  const result = await pdfParse(buffer);
  return normalize(result.text);
}

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/ /g, " ")
    // PDF layout leaks out as tabs and padded runs of spaces; collapse them so
    // the text reads as prose and does not burn tokens on whitespace.
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
