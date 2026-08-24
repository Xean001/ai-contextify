#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import chalk from "chalk";
import { Command } from "commander";
import { build } from "./index.js";
import { logger } from "./utils/logger.js";
import { formatTokenCount } from "./utils/tokens.js";

interface CliOptions {
  output: string;
  include?: string[];
  exclude?: string[];
  maxSize: string;
  chunk?: string;
  xml?: boolean;
  title?: string;
  followSymlinks?: boolean;
}

const program = new Command();

program
  .name("ai-contextify")
  .description(
    "Convert files and entire projects into optimized context for LLMs (Claude, ChatGPT, Gemini).",
  )
  .version("0.1.2")
  .argument("<input>", "File or directory to convert into LLM context")
  .option("-o, --output <dir>", "Output directory", "context-output")
  .option(
    "-i, --include <patterns...>",
    "Glob patterns to include (default: everything)",
  )
  .option(
    "-e, --exclude <patterns...>",
    "Extra glob patterns to exclude (node_modules/dist/build/.git are always excluded)",
  )
  .option(
    "--max-size <bytes>",
    "Skip files larger than this many bytes (directory scans only)",
    String(10 * 1024 * 1024),
  )
  .option(
    "--chunk <tokens>",
    "Also emit chunk-*.md files of approximately this many tokens",
  )
  .option("--xml", "Also emit context.xml in Claude's <documents> format")
  .option("--title <title>", "Title for the combined.md document")
  .option("--follow-symlinks", "Follow symbolic links while scanning", false)
  .action(async (input: string, opts: CliOptions) => {
    const absoluteInput = path.resolve(input);
    const absoluteOutput = path.resolve(opts.output);

    logger.step(`Input:  ${chalk.bold(absoluteInput)}`);
    logger.step(`Output: ${chalk.bold(absoluteOutput)}`);

    const maxSizeBytes = Number.parseInt(opts.maxSize, 10);
    if (!Number.isFinite(maxSizeBytes) || maxSizeBytes <= 0) {
      logger.error(`Invalid --max-size: ${opts.maxSize}`);
      process.exit(1);
    }

    const chunkSize = opts.chunk ? Number.parseInt(opts.chunk, 10) : undefined;
    if (opts.chunk && (!Number.isFinite(chunkSize) || (chunkSize ?? 0) <= 0)) {
      logger.error(`Invalid --chunk: ${opts.chunk}`);
      process.exit(1);
    }

    try {
      const summary = await build({
        input: absoluteInput,
        output: absoluteOutput,
        include: opts.include,
        exclude: opts.exclude,
        maxFileSizeBytes: maxSizeBytes,
        followSymlinks: opts.followSymlinks,
        chunkSize,
        emitXml: opts.xml === true,
        title: opts.title,
      });

      console.log("");
      logger.success(chalk.bold("Done!"));
      logger.dim(`  Files:     ${summary.fileCount}`);
      if (summary.skipped.length > 0) {
        logger.dim(`  Skipped:   ${summary.skipped.length}`);
      }
      logger.dim(`  Bytes:     ${summary.totalBytes.toLocaleString()}`);
      logger.dim(`  Tokens:    ~${formatTokenCount(summary.totalTokens)}`);
      logger.dim(`  Duration:  ${(summary.durationMs / 1000).toFixed(2)}s`);
      if (summary.artifacts.combined) {
        logger.dim(`  ${chalk.cyan("combined.md")}  → ${summary.artifacts.combined}`);
      }
      if (summary.artifacts.metadata) {
        logger.dim(`  ${chalk.cyan("metadata.json")} → ${summary.artifacts.metadata}`);
      }
      if (summary.artifacts.xml) {
        logger.dim(`  ${chalk.cyan("context.xml")}  → ${summary.artifacts.xml}`);
      }
      if (summary.artifacts.chunks?.length) {
        logger.dim(
          `  ${chalk.cyan("chunks/")}       → ${summary.artifacts.chunks.length} files`,
        );
      }

      const errored = summary.files.filter((f) => f.parseError);
      if (errored.length > 0) {
        console.log("");
        logger.warn(`${errored.length} file(s) failed to parse:`);
        for (const f of errored.slice(0, 10)) {
          logger.dim(`  - ${f.path}: ${f.parseError}`);
        }
        if (errored.length > 10) {
          logger.dim(`  …and ${errored.length - 10} more (see metadata.json)`);
        }
      }

      const empty = summary.files.filter((f) => f.empty);
      if (empty.length > 0) {
        console.log("");
        logger.warn(`${empty.length} file(s) parsed but yielded no text:`);
        for (const f of empty.slice(0, 10)) {
          logger.dim(`  - ${f.path} (${f.kind})`);
        }
        if (empty.length > 10) {
          logger.dim(`  …and ${empty.length - 10} more (see metadata.json)`);
        }
        if (empty.some((f) => f.kind === "pdf")) {
          logger.dim(
            "  Scanned PDFs have no text layer — they need OCR, which this CLI does not do.",
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(message);
      if (process.env.DEBUG) console.error(err);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(message);
  process.exit(1);
});
