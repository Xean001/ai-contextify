import mammoth from "mammoth";

export async function parseDocx(absolutePath: string): Promise<string> {
  // `convertToMarkdown` exists at runtime but isn't on mammoth's public types,
  // so we narrow the shape ourselves and fall back to plain text on failure.
  const mammothAny = mammoth as unknown as {
    convertToMarkdown?: (input: {
      path: string;
    }) => Promise<{ value: string }>;
  };

  if (typeof mammothAny.convertToMarkdown === "function") {
    const { value } = await mammothAny.convertToMarkdown({ path: absolutePath });
    return value
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const { value } = await mammoth.extractRawText({ path: absolutePath });
  return value.replace(/\r\n/g, "\n").trim();
}
