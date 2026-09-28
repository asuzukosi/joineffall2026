export type Action = { do: string; due: string; done: boolean };

export type Hypothesis = {
  id: string;
  belief: string;
  type: "desirability" | "viability" | "feasibility";
  importance: number;
  evidence: number;
  disproof_test: {
    method: string;
    measure?: string;
    we_are_wrong_if: string;
    deadline: string;
  };
  status: "untested" | "testing" | "survived" | "killed";
  actions: Action[];
  result?: string;
};

export type Walk = { why_now: string; dead_attempts: string; moving_walls: string; who_pays: string };

export type Premortem = { buyer: string; incumbent: string; regulator: string; researcher: string };

export type Bet = {
  id: string;
  name: string;
  secret: string;
  walk: Walk;
  premortem: Premortem;
  parked?: boolean;
  hypotheses: Hypothesis[];
};

export type Decision = { date: string; decision: string; why: string };

export type Maze = { thesis: string; open_questions: string[]; bets: Bet[]; decisions?: Decision[] };

export type BetSummary = { bet: string; open: number; survived: number; killed: number; topRisk: number; parked: boolean };

export type NextAction = {
  risk: number;
  bet: string;
  hypothesis: string;
  action: string;
  due: string;
  overdue: boolean;
};

const TYPES = ["desirability", "viability", "feasibility"];
const STATUSES = ["untested", "testing", "survived", "killed"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isScore(n: unknown) {
  return Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;
}

function missing(record: object | undefined, keys: string[]) {
  return keys.filter((k) => !String((record as Record<string, unknown>)?.[k] ?? "").trim());
}

function betGaps(bet: Bet): string[] {
  const problems: string[] = [];
  if (!bet.hypotheses?.length) problems.push("no hypotheses");
  if (!bet.secret?.trim()) problems.push("no secret (what we believe that most people don't)");
  if (bet.parked) return problems;
  const walk = missing(bet.walk, ["why_now", "dead_attempts", "moving_walls", "who_pays"]);
  if (walk.length) problems.push(`walk missing ${walk.join(", ")}`);
  const seats = missing(bet.premortem, ["buyer", "incumbent", "regulator", "researcher"]);
  if (seats.length) problems.push(`premortem missing ${seats.join(", ")} (run the gaps pass)`);
  return problems;
}

function hypothesisProblems(h: Hypothesis, today: string, parked: boolean): string[] {
  const problems: string[] = [];
  const test = h.disproof_test ?? {};
  if (!h.belief?.trim()) problems.push("no belief");
  if (!TYPES.includes(h.type)) problems.push(`type must be one of ${TYPES.join(", ")}`);
  if (!isScore(h.importance)) problems.push("importance must be 1-5");
  if (!isScore(h.evidence)) problems.push("evidence must be 1-5");
  if (!STATUSES.includes(h.status)) problems.push(`status must be one of ${STATUSES.join(", ")}`);
  if (!test.method?.trim()) problems.push("no disproof method");
  if (!test.we_are_wrong_if?.trim()) problems.push("unfalsifiable: no we_are_wrong_if");
  if (!DATE.test(test.deadline ?? "")) problems.push("no deadline (YYYY-MM-DD)");
  const open = h.status === "untested" || h.status === "testing";
  if (open && !parked && !(h.actions ?? []).some((a) => !a.done)) problems.push("open but no action to disprove it");
  if (open && !parked && test.deadline < today) problems.push("deadline passed: mark it survived or killed and write the result");
  if (!open && !h.result?.trim()) problems.push(`${h.status} but no result written`);
  return problems;
}

function duplicates(ids: string[]) {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

function summarise(bet: Bet): BetSummary {
  const count = (status: Hypothesis["status"]) => bet.hypotheses.filter((h) => h.status === status).length;
  const open = bet.hypotheses.filter((h) => h.status === "untested" || h.status === "testing");
  const topRisk = Math.max(0, ...open.map((h) => h.importance * (6 - h.evidence)));
  return { bet: bet.id, open: open.length, survived: count("survived"), killed: count("killed"), topRisk, parked: !!bet.parked };
}

// Blocking problems stop a test from running; gaps are planning that can catch up after acting.
export function checkMaze(maze: Maze, today: string) {
  const blocking: string[] = [];
  const gaps: string[] = [];
  const next: NextAction[] = [];
  const bets = maze.bets ?? [];
  const hypothesisIds = bets.flatMap((b) => (b.hypotheses ?? []).map((h) => h.id));
  for (const id of duplicates([...bets.map((b) => b.id), ...hypothesisIds])) blocking.push(`maze: id "${id}" used more than once`);
  if (!hypothesisIds.length) blocking.push("maze: no hypotheses yet; add one with `maze add`");
  if (!maze.thesis?.trim()) gaps.push("maze: no thesis");
  if (!maze.decisions?.length) gaps.push("maze: no destination in decisions");
  for (const bet of bets) {
    for (const p of betGaps(bet)) gaps.push(`${bet.id}: ${p}`);
    for (const h of bet.hypotheses ?? []) {
      for (const p of hypothesisProblems(h, today, !!bet.parked)) blocking.push(`${bet.id}/${h.id}: ${p}`);
      if (bet.parked || (h.status !== "untested" && h.status !== "testing")) continue;
      const risk = h.importance * (6 - h.evidence);
      for (const a of (h.actions ?? []).filter((a) => !a.done)) {
        next.push({ risk, bet: bet.id, hypothesis: h.id, action: a.do, due: a.due, overdue: a.due < today });
      }
    }
  }
  next.sort((a, b) => b.risk - a.risk || a.due.localeCompare(b.due));
  const summary = bets.filter((b) => b.hypotheses?.length).map(summarise);
  return { blocking, gaps, next, summary };
}
