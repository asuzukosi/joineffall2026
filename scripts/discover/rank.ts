import { signalsFor } from "./batch.ts";
import { daysBetween } from "./dates.ts";
import type { Company, Person, Signal, Tier } from "./types.ts";

export const TIERS: Tier[] = ["mouse", "rabbit", "deer", "elephant", "whale"];

const SIZE_LIMITS: [number, Tier][] = [[10, "mouse"], [50, "rabbit"], [500, "deer"], [5000, "elephant"]];

const WEIGHTS: Record<string, [points: number, days: number | null]> = {
  joined: [3, 90],
  role_change: [2, 90],
  left: [2, 90],
  funding: [3, 180],
  hiring: [2, null],
  deadline: [2, 60],
  competitor_news: [1, 90],
  publishes: [1, 180],
  speaks: [1, 180],
};

const BUYER_WORDS = ["founder", "owner", "ceo", "chief executive", "managing director", "president"];

export function tierFor(person: Person, strategic: string[]): Tier {
  if (person.tier_override) return person.tier_override;
  if (strategic.some((s) => s.trim().toLowerCase() === person.company.trim().toLowerCase())) return "whale";
  if (!person.company_size) return "deer";
  return SIZE_LIMITS.find(([limit]) => person.company_size! <= limit)?.[1] ?? "whale";
}

function inWindow(signal: Signal, days: number | null, today: string) {
  if (days === null) return true;
  const elapsed = signal.kind === "deadline" ? daysBetween(today, signal.date) : daysBetween(signal.date, today);
  return elapsed !== null && elapsed >= 0 && elapsed <= days;
}

export function speedFor(person: Person, signals: Signal[], today: string) {
  let score = 0;
  const reasons: string[] = [];
  for (const [kind, [points, days]] of Object.entries(WEIGHTS)) {
    const hit = signals.find((s) => s.kind === kind && inWindow(s, days, today));
    if (!hit) continue;
    score += points;
    reasons.push(`${kind.replace("_", " ")}: ${hit.text}`);
  }
  if (BUYER_WORDS.some((word) => person.title.toLowerCase().includes(word))) {
    score += 2;
    reasons.push("founder or owner buys");
  }
  return { score, reasons };
}

export function rankAll(people: Person[], companies: Record<string, Company>, strategic: string[], today: string) {
  for (const person of people) {
    person.tier = tierFor(person, strategic);
    const { score, reasons } = speedFor(person, signalsFor(companies, person), today);
    person.speed_score = score;
    person.speed_reasons = reasons;
  }
  return [...people].sort((a, b) => TIERS.indexOf(a.tier!) - TIERS.indexOf(b.tier!) || b.speed_score - a.speed_score);
}

export function openSeats(people: Person[]) {
  return people.flatMap((p) => p.signals
    .filter((s) => (s.kind === "joined" || s.kind === "left") && s.company)
    .map((s) => `${s.company} (${p.name} moved on)`));
}
