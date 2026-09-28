import { daysBetween } from "./dates.ts";
import type { Job, Signal } from "./types.ts";

export const RECENT_DAYS = 90;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function recent(date: string | null, today: string) {
  const days = date ? daysBetween(date, today) : null;
  return days !== null && days >= 0 && days <= RECENT_DAYS;
}

function latest(jobs: Job[], field: "start" | "end") {
  return [...jobs].sort((a, b) => (b[field] ?? "").localeCompare(a[field] ?? ""))[0];
}

export function jobChanges(jobs: Job[], today: string, url: string, idPrefix: string): Signal[] {
  const current = latest(jobs.filter((j) => j.current), "start");
  const previous = latest(jobs.filter((j) => j !== current && j.end), "end");
  if (current?.start && recent(current.start, today)) {
    if (previous && same(previous.company, current.company)) {
      return [{ id: `${idPrefix}:role_change:${current.start}`, kind: "role_change", date: current.start, url,
        text: `Became ${current.title} at ${current.company}, was ${previous.title}` }];
    }
    return [{ id: `${idPrefix}:joined:${current.start}`, kind: "joined", date: current.start, url,
      text: `Joined ${current.company} as ${current.title}${previous ? `, from ${previous.company}` : ""}`,
      ...(previous && { company: previous.company }) }];
  }
  if (previous?.end && recent(previous.end, today)) {
    const now = current ? `; now ${current.title} at ${current.company}` : "";
    return [{ id: `${idPrefix}:left:${previous.end}`, kind: "left", date: previous.end, url,
      text: `Left ${previous.title} at ${previous.company}${now}`, company: previous.company }];
  }
  return [];
}
