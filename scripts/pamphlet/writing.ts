import { createRequire } from "node:module";

type Issue = { type: string; text: string; severity: string; suggestion?: string };
type Detector = { analyzeText: (text: string, opts?: { context?: string }) => { score: number; issues: Issue[] } };

const detector = createRequire(import.meta.url)("avoid-ai-writing-detector") as Detector;
const BLOCKING = new Set(["high", "medium"]);

// tables, sources, running heads and <!-- data --> blocks (reference lists) are data, not prose
export function proseOf(html: string) {
  return html
    .replace(/<!-- data -->[\s\S]*?<!-- \/data -->/g, " ")
    .replace(/<(table|style|script)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<p class="(source|note|caption)"[\s\S]*?<\/p>/gi, " ")
    .replace(/<div class="runhead"[\s\S]*?<\/div>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkWriting(label: string, text: string) {
  if (!text.trim()) return [];
  const { issues } = detector.analyzeText(text, { context: "technical" });
  return issues.filter((i) => BLOCKING.has(i.severity)).map((i) => `${label}: ${i.text} — ${i.suggestion ?? i.type}`);
}
