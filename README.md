# ai-contextify

> Convierte archivos y proyectos completos en contexto optimizado para LLMs como **Claude**, **ChatGPT** y **Gemini**.

`ai-contextify` es una CLI moderna de Node.js que escanea una carpeta, parsea cada archivo soportado (PDF, DOCX, Markdown, TXT, JSON, código fuente…), normaliza todo a Markdown limpio y emite un único bundle listo para pegar en cualquier prompt de modelo de lenguaje — junto con un `metadata.json` que describe cada archivo, su tamaño y una estimación de tokens.

```bash
npx ai-contextify ./docs
```

```
context-output/
├── combined.md     # un gran documento markdown listo para prompts
└── metadata.json   # tipos, tamaños, tokens estimados y errores por archivo
```

---

## Características

- **Escaneo recursivo** con exclusiones sensatas por defecto (omite `node_modules`, `dist`, `build`, `.git`, lockfiles).
- **Parsers multi-formato**
  - PDF (`pdf-parse`)
  - DOCX (`mammoth` → Markdown)
  - Markdown / MDX (normalizado con `remark` + GFM)
  - Texto plano, logs, RST
  - JSON / JSONC (formateado)
  - Código fuente en 40+ lenguajes (con fenced code blocks correctos)
- **Estimación de tokens** integrada — conoce el presupuesto antes de pegar.
- **Chunking opcional** (`--chunk 6000`) para ventanas de contexto pequeñas.
- **Export XML estilo Claude opcional** (`--xml`) usando tags `<documents>` / `<document_content>`.
- **UX bonita en terminal** con spinners de `ora` y colores de `chalk`.
- **TypeScript estricto**, ESM, multiplataforma (macOS, Linux, Windows), Node ≥ 18.
- Diseñado para ser **extensible** — agrega un parser nuevo soltando un archivo en `src/parsers/` y registrándolo en `src/parsers/index.ts`.

---

## Instalación

Úsalo directamente sin instalar en la carpeta con este comando:

```bash
npx ai-contextify .
```

O instálalo globalmente:

```bash
npm install -g ai-contextify
ai-contextify ./docs
```

---

## Uso

```
ai-contextify <input> [opciones]
```

> 💡 **Tip:** el argumento `<input>` es obligatorio. Usa `.` para escanear la carpeta donde estás parado:
>
> ```bash
> ai-contextify .
> ```

| Opción                  | Descripción                                                                          | Por defecto        |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------ |
| `-o, --output <dir>`    | Directorio de salida                                                                 | `context-output`   |
| `-i, --include <globs…>`| Patrones glob a incluir                                                              | todo               |
| `-e, --exclude <globs…>`| Patrones glob adicionales a excluir (los defaults siempre se aplican)                | —                  |
| `--max-size <bytes>`    | Omite archivos más grandes que esta cantidad de bytes (solo al escanear carpetas)    | `10485760` (10 MB) |
| `--chunk <tokens>`      | Emite también `chunks/chunk-N.md` de aproximadamente esta cantidad de tokens         | desactivado        |
| `--xml`                 | Emite también `context.xml` en el formato `<documents>` de Claude                    | desactivado        |
| `--title <título>`      | Título usado en `combined.md`                                                        | derivado del input |
| `--follow-symlinks`     | Sigue enlaces simbólicos al escanear                                                 | `false`            |
| `-V, --version`         | Muestra la versión                                                                   |                    |
| `-h, --help`            | Muestra la ayuda                                                                     |                    |

### Archivos omitidos

Al escanear una carpeta se omiten los archivos vacíos y los que superan `--max-size`. La CLI ahora lo avisa y los lista, y quedan registrados en `metadata.json` bajo `skipped` con su motivo:

```bash
$ ai-contextify ./docs
✔ Found 8 file(s) (1 skipped)
⚠ 1 file(s) skipped for exceeding --max-size (10.0 MB):
  - libro-escaneado.pdf (10.7 MB)
  Raise the limit with --max-size <bytes> to include them.
```

Para incluirlos, sube el límite (`--max-size 52428800`) o apunta directo al archivo — un archivo pasado como input siempre se procesa, sin importar su tamaño:

```bash
ai-contextify ./docs/libro.pdf
```

Los archivos que sí se parsean pero no producen texto (por ejemplo un PDF escaneado, sin capa de texto) se marcan con `"empty": true` en `metadata.json` y también se avisan al final. Esos necesitan OCR, que esta CLI no hace.

### Ejemplos

Empaqueta una carpeta de docs:

```bash
ai-contextify ./docs
```

Salida personalizada, descartando tests y la carpeta de build:

```bash
ai-contextify ./src -o ./context -e "**/*.test.ts" "**/__snapshots__/**"
```

Divide en chunks de ~6k tokens para modelos pequeños y además emite XML de Claude:

```bash
ai-contextify ./project --chunk 6000 --xml
```

Un solo archivo:

```bash
ai-contextify ./paper.pdf
```

---

## API programática

```ts
import { build } from "ai-contextify";

const summary = await build({
  input: "./docs",
  output: "./context-output",
  chunkSize: 6000,
  emitXml: true,
});

console.log(`Se escribieron ${summary.fileCount} archivos, ~${summary.totalTokens} tokens`);
```

El tipo exportado `BuildSummary` te dice qué se escribió, dónde, y cuántos tokens estás a punto de gastar.

---

## Salida

### `combined.md`

Un único documento Markdown que:

1. Comienza con un encabezado (título, origen, número de archivos, tokens totales).
2. Lista una tabla de contenidos clickeable.
3. Renderiza cada archivo como su propia sección, con bloques de código usando el tag de lenguaje correcto y PDFs/DOCX renderizados como texto plano.

### `metadata.json`

```json
{
  "inputDir": "/ruta/abs/a/docs",
  "outputDir": "/ruta/abs/a/context-output",
  "generatedAt": "2026-05-24T12:00:00.000Z",
  "fileCount": 12,
  "totalBytes": 84211,
  "totalTokens": 21034,
  "durationMs": 482,
  "files": [
    { "path": "README.md", "kind": "markdown", "bytes": 4321, "tokens": 1080 }
  ],
  "skipped": [
    { "path": "libro.pdf", "bytes": 11216488, "reason": "too-large", "limitBytes": 10485760 }
  ],
  "artifacts": {
    "combined": "/ruta/abs/a/context-output/combined.md",
    "metadata": "/ruta/abs/a/context-output/metadata.json"
  }
}
```

### `context.xml` (con `--xml`)

```xml
<documents>
  <document index="1">
    <source>README.md</source>
    <kind>markdown</kind>
    <tokens>1080</tokens>
    <document_content>
      …
    </document_content>
  </document>
</documents>
```

### `chunks/` (con `--chunk N`)

`chunk-01.md`, `chunk-02.md`, … cada uno ≲ N tokens. Los cortes ocurren en límites de párrafo cuando es posible.

---

## Desarrollo

```bash
npm install
npm run build
npm link
ai-contextify ./example
```

Scripts (funcionan con `npm`, `pnpm` o `yarn`):

| Script           | Qué hace                                  |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Ejecuta la CLI desde el código con `tsx` |
| `npm run build`  | Compila TypeScript a `dist/`             |
| `npm start`      | Ejecuta la CLI compilada                 |
| `npm run clean`  | Elimina `dist/`                          |

Estructura del proyecto:

```
src/
├── cli.ts              # Punto de entrada de Commander
├── index.ts            # API programática build()
├── types.ts
├── scanner/            # Escaneo con fast-glob y exclusiones sensatas
├── parsers/
│   ├── pdf.ts
│   ├── docx.ts
│   ├── markdown.ts
│   ├── text.ts
│   ├── json.ts
│   ├── code.ts
│   └── index.ts        # Detección de tipo + dispatch
├── exporters/
│   ├── markdown.ts     # combined.md
│   ├── metadata.ts     # metadata.json
│   ├── xml.ts          # Formato <documents> de Claude
│   └── chunks.ts       # chunks/chunk-N.md
└── utils/
    ├── logger.ts
    ├── tokens.ts       # Estimador de tokens barato y sin dependencias
    ├── chunking.ts
    └── language.ts     # extensión → tag de lenguaje
```

### Agregar un parser

1. Crea `src/parsers/miformato.ts` exportando `async function parseMiformato(path: string): Promise<string>`.
2. Agrega un nuevo `FileKind` en `src/types.ts`.
3. Registra la extensión en `detectKind()` y el dispatch en `parseFile()` dentro de `src/parsers/index.ts`.

Eso es todo — el scanner, los exporters y el pipeline de metadata lo recogen automáticamente.

---

## Contribuir

¡Los PRs son bienvenidos! Si quieres agregar un parser nuevo, soportar otro formato de export, o mejorar el estimador de tokens, abre un issue para discutirlo primero.

---

## Licencia

[MIT](./LICENSE)
