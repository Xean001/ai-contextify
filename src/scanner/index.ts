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

export async function scanDirectory(
  rootDir: string,
  opts: ScannerOptions = {},
): Promise<ScannedFile[]> {
  const absoluteRoot = path.resolve(rootDir);
  const stat = await fs.stat(absoluteRoot).catch(() => null);
  if (!stat) throw new Error(`Input path does not exist: ${rootDir}`);

  if (stat.isFile()) {
    return [
      {
        absolutePath: absoluteRoot,
        relativePath: path.basename(absoluteRoot),
        bytes: stat.size,
      },
    ];
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

  for (const entry of entries) {
    const size = entry.stats?.size ?? 0;
    if (size === 0) continue;
    if (size > maxBytes) continue;

    files.push({
      absolutePath: entry.path,
      relativePath: path.relative(absoluteRoot, entry.path),
      bytes: size,
    });
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}
