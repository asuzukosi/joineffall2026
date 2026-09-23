import { parse } from "csv-parse/sync";
import { normaliseLinkedIn } from "./roster";

export type Connection = {
  url: string;
  name: string;
  title: string;
  company: string;
  connectedOn: string;
};

export function parseConnections(csv: string): Connection[] {
  const lines = csv.split(/\r?\n/);
  // LinkedIn puts a few lines of notes above the real header.
  const header = lines.findIndex((line) => line.startsWith("First Name,"));
  if (header === -1) {
    throw new Error("that file is not a LinkedIn connections export");
  }

  const rows: Record<string, string>[] = parse(
    lines.slice(header).join("\n"),
    { columns: true, skip_empty_lines: true, relax_column_count: true, trim: true },
  );

  return rows
    .map((row) => ({
      url: normaliseLinkedIn(row.URL ?? ""),
      name: `${row["First Name"] ?? ""} ${row["Last Name"] ?? ""}`.trim(),
      title: row.Position ?? "",
      company: row.Company ?? "",
      connectedOn: row["Connected On"] ?? "",
    }))
    // A restricted profile exports with no URL. Dropping it loses a row; matching
    // it on name would merge two different people under one.
    .filter((connection) => connection.url && connection.name);
}
