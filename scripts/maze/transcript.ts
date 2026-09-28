export type Transcript = { title: string; date: string; source: string; turns: { speaker: string; text: string }[] };

type Block = { type: string; text?: string };
type ClaudeAiConversation = {
  name: string;
  created_at: string;
  chat_messages: { sender: string; text?: string; content?: Block[] }[];
};
type ClaudeCodeLine = {
  type: string;
  isMeta?: boolean;
  timestamp?: string;
  aiTitle?: string;
  message?: { content: string | Block[] };
};

function blockText(content: string | Block[] | undefined) {
  if (typeof content === "string") return content;
  return (content ?? []).filter((b) => b.type === "text" && b.text).map((b) => b.text).join("\n\n");
}

// Harness-injected text (system reminders, command wrappers) starts with a tag, not with what someone said.
function spoken(text: string) {
  return text.trim() && !text.trim().startsWith("<");
}

export function fromClaudeAi(json: string, match = ""): Transcript {
  const all = JSON.parse(json) as ClaudeAiConversation[];
  const words = match.toLowerCase().split(/\s+/).filter(Boolean);
  const found = all.filter((c) => words.every((w) => (c.name ?? "").toLowerCase().includes(w)));
  if (found.length !== 1) {
    const titles = found.slice(0, 20).map((c) => `  ${c.created_at.slice(0, 10)}  ${c.name}`).join("\n");
    throw new Error(`${found.length} conversations match; pass --match "<words from one title>"\n${titles}`);
  }
  const c = found[0];
  const turns = c.chat_messages
    .map((m) => ({ speaker: m.sender === "human" ? "Me" : "Claude", text: m.text || blockText(m.content) }))
    .filter((t) => spoken(t.text));
  return { title: c.name, date: c.created_at.slice(0, 10), source: "claude.ai export", turns };
}

export function fromClaudeCode(jsonl: string): Transcript {
  const lines = jsonl.split("\n").filter(Boolean).map((l) => JSON.parse(l) as ClaudeCodeLine);
  const turns = lines
    .filter((l) => (l.type === "user" || l.type === "assistant") && !l.isMeta)
    .map((l) => ({ speaker: l.type === "user" ? "Me" : "Claude", text: blockText(l.message?.content) }))
    .filter((t) => spoken(t.text));
  const title = lines.findLast((l) => l.aiTitle)?.aiTitle ?? "Claude Code session";
  const date = (lines.find((l) => l.timestamp)?.timestamp ?? "").slice(0, 10);
  return { title, date, source: "Claude Code session", turns };
}

export function fromText(text: string, title: string, date: string): Transcript {
  return { title, date, source: "text transcript", turns: [{ speaker: "", text: text.trim() }] };
}

export function toNote(t: Transcript, from: string) {
  const body = t.turns.map((turn) => (turn.speaker ? `**${turn.speaker}:** ${turn.text}` : turn.text)).join("\n\n");
  return `# ${t.date} ${t.title}

source: ${t.source} (${from})

<!-- Agent: fill these from the transcript below, then update maze.json (idea-maze skill, disproving.md). -->
tests:

## facts (what happened, with numbers)
## commitments (what they gave or agreed to)
## compliments and opinions (not evidence)
## surprises (candidate new hypotheses or secrets)
## new hypotheses (each one goes through \`maze add\`)

## transcript

${body}
`;
}
