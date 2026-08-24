import path from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";

export const DEFAULT_EXCLUDES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.cache/**",
  "**/.turbo/**",
  "**/.vercel/**",
  "**/coverage/**",
  "**/.DS_Store",
  "**/*.lock",
  "**/pnpm-lock.yaml",
  "**/package-lock.json",
  "**/yarn.lock",
];

export const DEFAULT_INCLUDES = ["**/*"];

export interface ScannerOptions {
  include?: string[];
  exclude?: string[];
  followSymlinks?: boolean;
  maxFileSizeBytes?: number;
}

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  bytes: number;
}

export type SkipReason = "too-large" | "empty";

export interface SkippedFile {
  absolutePath: string;
  relativePath: string;
  bytes: number;
  reason: SkipReason;
  /** Only set when reason is "too-large". */
  limitBytes?: number;
}

export interface ScanResult {
  files: ScannedFile[];
  skipped: SkippedFile[];
}

export async function scanDirectory(
  rootDir: string,
  opts: ScannerOptions = {},
): Promise<ScanResult> {
  const absoluteRoot = path.resolve(rootDir);
  const stat = await fs.stat(absoluteRoot).catch(() => null);
  if (!stat) throw new Error(`Input path does not exist: ${rootDir}`);

  // A file passed explicitly is always parsed: the size limit exists to keep
  // directory scans from swallowing huge binaries, not to second-guess the user.
  if (stat.isFile()) {
    return {
      files: [
        {
          absolutePath: absoluteRoot,
          relativePath: path.basename(absoluteRoot),
          bytes: stat.size,
        },
      ],
      skipped: [],
    };
  }

  const include = opts.include?.length ? opts.include : DEFAULT_INCLUDES;
  const exclude = [...DEFAULT_EXCLUDES, ...(opts.exclude ?? [])];

  const entries = await fg(include, {
    cwd: absoluteRoot,
    ignore: exclude,
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: opts.followSymlinks ?? false,
    absolute: true,
    stats: true,
    suppressErrors: true,
  });

  const maxBytes = opts.maxFileSizeBytes ?? 10 * 1024 * 1024;
  const files: ScannedFile[] = [];
  const skipped: SkippedFile[] = [];

  for (const entry of entries) {
    const size = entry.stats?.size ?? 0;
    const relativePath = path.relative(absoluteRoot, entry.path);

    if (size === 0) {
      skipped.push({
        absolutePath: entry.path,
        relativePath,
        bytes: size,
        reason: "empty",
      });
      continue;
    }

    if (size > maxBytes) {
      skipped.push({
        absolutePath: entry.path,
        relativePath,
        bytes: size,
        reason: "too-large",
        limitBytes: maxBytes,
      });
      continue;
    }

    files.push({
      absolutePath: entry.path,
      relativePath,
      bytes: size,
    });
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  skipped.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { files, skipped };
}
