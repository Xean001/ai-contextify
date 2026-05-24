const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".cc": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".fish": "fish",
  ".ps1": "powershell",
  ".sql": "sql",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".ini": "ini",
  ".env": "dotenv",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",
  ".lua": "lua",
  ".dart": "dart",
  ".r": "r",
  ".scala": "scala",
  ".clj": "clojure",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".pl": "perl",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".proto": "protobuf",
  ".tf": "hcl",
  ".dockerfile": "dockerfile",
};

export function detectLanguage(extension: string, filename: string): string {
  const lower = extension.toLowerCase();
  if (LANGUAGE_BY_EXTENSION[lower]) return LANGUAGE_BY_EXTENSION[lower];
  if (/^dockerfile/i.test(filename)) return "dockerfile";
  if (/^makefile/i.test(filename)) return "makefile";
  return "text";
}

const CODE_EXTENSIONS = new Set(Object.keys(LANGUAGE_BY_EXTENSION));

export function isCodeExtension(extension: string): boolean {
  return CODE_EXTENSIONS.has(extension.toLowerCase());
}
