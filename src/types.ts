export type FileKind =
  | "pdf"
  | "docx"
  | "markdown"
  | "text"
  | "json"
  | "code"
  | "unknown";

export interface ScanOptions {
  input: string;
  output: string;
  include?: string[];
  exclude?: string[];
  maxFileSizeBytes?: number;
  followSymlinks?: boolean;
}

export interface ParsedFile {
  absolutePath: string;
  relativePath: string;
  kind: FileKind;
  extension: string;
  language?: string;
  bytes: number;
  content: string;
  estimatedTokens: number;
  parseError?: string;
}

export interface BuildOptions extends ScanOptions {
  chunkSize?: number;
  emitXml?: boolean;
  emitMetadata?: boolean;
  emitCombined?: boolean;
  title?: string;
}

export interface BuildSummary {
  inputDir: string;
  outputDir: string;
  generatedAt: string;
  fileCount: number;
  totalBytes: number;
  totalTokens: number;
  durationMs: number;
  files: Array<{
    path: string;
    kind: FileKind;
    bytes: number;
    tokens: number;
    parseError?: string;
  }>;
  artifacts: {
    combined?: string;
    metadata?: string;
    xml?: string;
    chunks?: string[];
  };
}
