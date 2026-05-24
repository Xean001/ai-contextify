// Tiny TypeScript snippet so the parser has a code file to render.
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(greet("world"));
}
