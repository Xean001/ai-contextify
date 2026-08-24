import path from "node:path";
import fs from "fs-extra";
import ora from "ora";
import type { BuildOptions, BuildSummary, ParsedFile } from "./types.js";
import { detectKind, parseFile } from "./parsers/index.js";
import { scanDirectory } from "./scanner/index.js";
import { exportCombinedMarkdown } from "./exporters/markdown.js";
import { exportMetadata } from "./exporters/metadata.js";
import { exportClaudeXml } from "./exporters/xml.js";
import { exportChunks } from "./exporters/chunks.js";
import { estimateTokens } from "./utils/tokens.js";
import { formatBytes } from "./utils/bytes.js";
import { detectLanguage } from "./utils/language.js";
import { logger } from "./utils/logger.js";

export async function build(options: BuildOptions): Promise<BuildSummary> {
  const startedAt = Date.now();
  const absoluteInput = path.resolve(options.input);
  const absoluteOutput = path.resolve(options.output);

  const scanSpinner = ora({
    text: `Scanning ${absoluteInput}`,
    color: "cyan",
  }).start();

  const { files: scanned, skipped } = await scanDirectory(absoluteInput, {
    include: options.include,
    exclude: options.exclude,
    followSymlinks: options.followSymlinks,
    maxFileSizeBytes: options.maxFileSizeBytes,
  });

  const tooLarge = skipped.filter((f) => f.reason === "too-large");
  scanSpinner.succeed(
    `Found ${scanned.length} file(s)` +
      (skipped.length > 0 ? ` (${skipped.length} skipped)` : ""),
  );

  if (tooLarge.length > 0) {
    logger.warn(
      `${tooLarge.length} file(s) skipped for exceeding --max-size (${formatBytes(
        options.maxFileSizeBytes ?? 10 * 1024 * 1024,
      )}):`,
    );
    for (const f of tooLarge.slice(0, 10)) {
      logger.dim(`  - ${f.relativePath} (${formatBytes(f.bytes)})`);
    }
    if (tooLarge.length > 10) {
      logger.dim(`  …and ${tooLarge.length - 10} more (see metadata.json)`);
    }
    logger.dim("  Raise the limit with --max-size <bytes> to include them.");
  }

  if (scanned.length === 0) {
    logger.warn("No files matched the scan filters. Nothing to do.");
  }

  const parseSpinner = ora({ color: "cyan" }).start();
  const parsed: ParsedFile[] = [];

  let i = 0;
  for (const entry of scanned) {
    i += 1;
    const detected = detectKind(entry.absolutePath);
    parseSpinner.text = `Parsing [${i}/${scanned.length}] ${entry.relativePath}`;

    let content = "";
    let parseError: string | undefined;
    try {
      content = await parseFile(entry.absolutePath, detected.kind);
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
      content = "";
    }

    parsed.push({
      absolutePath: entry.absolutePath,
      relativePath: entry.relativePath,
      kind: detected.kind,
      extension: detected.extension,
      language: detectLanguage(detected.extension, entry.relativePath),
      bytes: entry.bytes,
      content,
      estimatedTokens: estimateTokens(content),
      parseError,
    });
  }

  parseSpinner.succeed(`Parsed ${parsed.length} file(s)`);

  await fs.ensureDir(absoluteOutput);

  const artifacts: BuildSummary["artifacts"] = {};
  const generatedAt = new Date().toISOString();
  const title = options.title ?? `Context bundle: ${path.basename(absoluteInput)}`;

  const combinedPath = path.join(absoluteOutput, "combined.md");
  if (options.emitCombined !== false) {
    const exportSpinner = ora({
      text: "Writing combined.md",
      color: "cyan",
    }).start();
    await exportCombinedMarkdown(parsed, {
      outputPath: combinedPath,
      title,
      inputDir: absoluteInput,
      generatedAt,
    });
    artifacts.combined = combinedPath;
    exportSpinner.succeed(`combined.md written (${parsed.length} sections)`);
  }

  if (options.emitXml) {
    const xmlSpinner = ora({ text: "Writing context.xml", color: "cyan" }).start();
    const xmlPath = path.join(absoluteOutput, "context.xml");
    await exportClaudeXml(parsed, {
      outputPath: xmlPath,
      inputDir: absoluteInput,
      generatedAt,
    });
    artifacts.xml = xmlPath;
    xmlSpinner.succeed("context.xml written");
  }

  if (options.chunkSize && options.chunkSize > 0 && artifacts.combined) {
    const chunkSpinner = ora({
      text: `Chunking into ~${options.chunkSize}-token slices`,
      color: "cyan",
    }).start();
    const combinedMarkdown = await fs.readFile(artifacts.combined, "utf8");
    const chunkDir = path.join(absoluteOutput, "chunks");
    artifacts.chunks = await exportChunks({
      outputDir: chunkDir,
      combinedMarkdown,
      chunkTokens: options.chunkSize,
    });
    chunkSpinner.succeed(`Wrote ${artifacts.chunks.length} chunk(s) to ${chunkDir}`);
  }

  const summary: BuildSummary = {
    inputDir: absoluteInput,
    outputDir: absoluteOutput,
    generatedAt,
    fileCount: parsed.length,
    totalBytes: parsed.reduce((acc, f) => acc + f.bytes, 0),
    totalTokens: parsed.reduce((acc, f) => acc + f.estimatedTokens, 0),
    durationMs: Date.now() - startedAt,
    files: parsed.map((f) => ({
      path: f.relativePath,
      kind: f.kind,
      bytes: f.bytes,
      tokens: f.estimatedTokens,
      parseError: f.parseError,
      empty: !f.parseError && f.content.trim().length === 0,
    })),
    skipped: skipped.map((f) => ({
      path: f.relativePath,
      bytes: f.bytes,
      reason: f.reason,
      limitBytes: f.limitBytes,
    })),
    artifacts,
  };

  if (options.emitMetadata !== false) {
    const metaPath = path.join(absoluteOutput, "metadata.json");
    await exportMetadata(metaPath, summary);
    summary.artifacts.metadata = metaPath;
  }

  return summary;
}

export type { BuildOptions, BuildSummary, ParsedFile, FileKind } from "./types.js";
