function cell(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

export function table(headers: string[], rows: unknown[][]) {
  if (!rows.length) return "_none found_\n";
  const lines = [headers, headers.map(() => "---"), ...rows].map((r) => `| ${r.map(cell).join(" | ")} |`);
  return lines.join("\n") + "\n";
}

export async function section(title: string, build: () => Promise<string>) {
  try {
    return `## ${title}\n\n${await build()}`;
  } catch (err) {
    return `## ${title}\n\n_failed: ${(err as Error).message}_\n`;
  }
}

export function day(iso: string) {
  return iso.slice(0, 10);
}
