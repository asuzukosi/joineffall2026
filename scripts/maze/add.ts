import type { Bet, Hypothesis, Maze } from "./check.ts";

export type NewHypothesis = {
  id?: string;
  belief: string;
  wrongIf: string;
  action: string;
  bet: string;
  type: Hypothesis["type"];
  method: string;
  deadline: string;
  today: string;
};

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 5).join("-");
}

function uniqueId(maze: Maze, base: string) {
  const taken = new Set(maze.bets.flatMap((b) => [b.id, ...b.hypotheses.map((h) => h.id)]));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

function findOrCreateBet(maze: Maze, id: string): Bet {
  const existing = maze.bets.find((b) => b.id === id);
  if (existing) return existing;
  const bet: Bet = {
    id,
    name: id,
    secret: "",
    walk: { why_now: "", dead_attempts: "", moving_walls: "", who_pays: "" },
    premortem: { buyer: "", incumbent: "", regulator: "", researcher: "" },
    hypotheses: [],
  };
  maze.bets.push(bet);
  return bet;
}

export function addHypothesis(maze: Maze, n: NewHypothesis): Hypothesis {
  const bet = findOrCreateBet(maze, n.bet);
  const hypothesis: Hypothesis = {
    id: uniqueId(maze, slug(n.id ?? n.belief)),
    belief: n.belief,
    type: n.type,
    importance: 4,
    evidence: 1,
    disproof_test: { method: n.method, we_are_wrong_if: n.wrongIf, deadline: n.deadline },
    status: "untested",
    actions: [{ do: n.action, due: n.today, done: false }],
  };
  bet.hypotheses.push(hypothesis);
  return hypothesis;
}
