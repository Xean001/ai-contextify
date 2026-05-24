import mammoth from "mammoth";

export async function parseDocx(absolutePath: string): Promise<string> {
  // `convertToMarkdown` exists at runtime but isn't on mammoth's public types,
  // so we narrow the shape ourselves and fall back to plain text on failure.
  const mammothAny = mammoth as unknown as {
    convertToMarkdown?: (input: {
      path: string;
    }, options?: unknown) => Promise<{ value: string }>;
    images?: {
      imgElement: (
        fn: (image: unknown) => Promise<{ src: string }>,
      ) => unknown;
    };
  };

  if (typeof mammothAny.convertToMarkdown === "function") {
    // Tell mammoth to drop images entirely instead of inlining them as
    // base64 data URIs, which would explode the output size and waste tokens.
    const options =
      mammothAny.images?.imgElement
        ? {
            convertImage: mammothAny.images.imgElement(async () => ({
              src: "",
            })),
          }
        : undefined;

    const { value } = await mammothAny.convertToMarkdown(
      { path: absolutePath },
      options,
    );
    return stripImageNoise(value);
  }

  const { value } = await mammoth.extractRawText({ path: absolutePath });
  return value.replace(/\r\n/g, "\n").trim();
}

/**
 * Belt-and-suspenders: even with `convertImage` set to empty src, older
 * mammoth versions still emit base64 data URIs. Strip them out, along with
 * any leftover empty image links, then collapse the resulting whitespace.
 */
function stripImageNoise(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/!\[[^\]]*\]\(data:[^)]+\)/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/!\[\]\(\)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
