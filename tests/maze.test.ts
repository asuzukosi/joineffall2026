import { describe, expect, it } from "vitest";
import { addCrumb, addHypothesis } from "../scripts/maze/add.ts";
import { checkMaze, type Hypothesis, type Maze } from "../scripts/maze/check.ts";
import { dedupe, matches } from "../scripts/maze/events.ts";
import { latest } from "../scripts/maze/latest.ts";
import { fromClaudeAi, fromClaudeCode, toNote } from "../scripts/maze/transcript.ts";

function hypothesis(overrides: Partial<Hypothesis> = {}): Hypothesis {
  return {
    id: "h-pays",
    belief: "Warehouse managers pay for picking help",
    type: "problem",
    importance: 5,
    evidence: 1,
    disproof_test: {
      method: "Mom Test interviews",
      we_are_wrong_if: "fewer than 4 of 12 do",
      deadline: "2026-10-12",
    },
    status: "untested",
    actions: [{ do: "Book 12 interviews", due: "2026-10-01", done: false }],
    ...overrides,
  };
}

function maze(...hypotheses: Hypothesis[]): Maze {
  const walk = { why_now: "w", dead_attempts: "d", moving_walls: "m", who_pays: "p" };
  const premortem = { buyer: "b", incumbent: "i", regulator: "r", researcher: "s" };
  const decisions = [{ date: "2026-09-28", decision: "Destination: a paid pilot by 2026-11-30; floor £20m a year", why: "w" }];
  const crumbs = [{ give: "List of 5 OSS triage tools", for: "Sarah at Northside", due: "2026-09-28", status: "given" as const }];
  return { thesis: "t", open_questions: [], decisions, bets: [{ id: "b", name: "Bet", secret: "s", walk, premortem, crumbs, hypotheses }] };
}

describe("checkMaze", () => {
  it("passes a falsifiable hypothesis and lists its action", () => {
    const { blocking, gaps, next } = checkMaze(maze(hypothesis()), "2026-09-28");
    expect(blocking).toEqual([]);
    expect(gaps).toEqual([]);
    expect(next).toEqual([
      {
        risk: 25,
        bet: "b",
        hypothesis: "h-pays",
        wrongIf: "fewer than 4 of 12 do",
        deadline: "2026-10-12",
        action: "Book 12 interviews",
        due: "2026-10-01",
        overdue: false,
      },
    ]);
  });

  it("flags a hypothesis with no kill line", () => {
    const h = hypothesis();
    h.disproof_test.we_are_wrong_if = "";
    expect(checkMaze(maze(h), "2026-09-28").blocking).toEqual(["b/h-pays: unfalsifiable: no we_are_wrong_if"]);
  });

  it("flags an open hypothesis with nothing left to do", () => {
    const h = hypothesis({ actions: [{ do: "x", due: "2026-10-01", done: true }] });
    expect(checkMaze(maze(h), "2026-09-28").blocking).toEqual(["b/h-pays: open but no action to disprove it"]);
  });

  it("puts the riskiest hypothesis first and marks overdue actions", () => {
    const safe = hypothesis({ id: "h-safe", evidence: 4 });
    const { next } = checkMaze(maze(safe, hypothesis()), "2026-10-05");
    expect(next.map((n) => n.hypothesis)).toEqual(["h-pays", "h-safe"]);
    expect(next[0].overdue).toBe(true);
  });

  it("wants a verdict once the deadline passes", () => {
    expect(checkMaze(maze(hypothesis()), "2026-10-13").blocking).toEqual([
      "b/h-pays: deadline passed: mark it survived or killed and write the result",
    ]);
  });

  it("lists missing planning as gaps that do not block acting", () => {
    const m = maze(hypothesis());
    m.decisions = [];
    m.bets[0].premortem.regulator = "";
    const { blocking, gaps, next } = checkMaze(m, "2026-09-28");
    expect(blocking).toEqual([]);
    expect(gaps).toEqual(["maze: no destination in decisions", "b: premortem missing regulator (run the gaps pass)"]);
    expect(next).toHaveLength(1);
  });

  it("flags an id used twice", () => {
    expect(checkMaze(maze(hypothesis(), hypothesis()), "2026-09-28").blocking).toEqual(['maze: id "h-pays" used more than once']);
  });

  it("summarises each bet by its riskiest open hypothesis", () => {
    const { summary } = checkMaze(maze(hypothesis(), hypothesis({ id: "h-done", status: "killed", result: "r" })), "2026-09-28");
    expect(summary).toEqual([{ bet: "b", open: 1, survived: 0, killed: 1, topRisk: 25, parked: false }]);
  });

  it("leaves parked bets out of the action list, deadlines and gaps pass", () => {
    const m = maze(hypothesis({ actions: [] }));
    m.bets[0].parked = true;
    m.bets[0].premortem.buyer = "";
    const { blocking, gaps, next } = checkMaze(m, "2026-10-20");
    expect(blocking).toEqual([]);
    expect(gaps).toEqual([]);
    expect(next).toEqual([]);
  });

  it("drops killed hypotheses from the action list but wants a result", () => {
    const { blocking, next } = checkMaze(maze(hypothesis({ status: "killed" })), "2026-09-28");
    expect(next).toEqual([]);
    expect(blocking).toEqual(["b/h-pays: killed but no result written"]);
  });
});

describe("problems before solutions", () => {
  it("blocks a solution test until a problem in the bet has survived", () => {
    const m = maze(hypothesis(), hypothesis({ id: "h-tool", type: "solution" }));
    expect(checkMaze(m, "2026-09-28").blocking).toEqual([
      "b/h-tool: solution test before any problem in this bet survived; test the problem first",
    ]);
    m.bets[0].hypotheses[0] = hypothesis({ status: "survived", result: "5 of 12 described it" });
    expect(checkMaze(m, "2026-09-28").blocking).toEqual([]);
  });

  it("flags a problem hypothesis worded as a solution", () => {
    const m = maze(hypothesis({ belief: "Physio clinics would pay for AI that writes their notes" }));
    expect(checkMaze(m, "2026-09-28").gaps).toEqual([
      "b/h-pays: reads like a solution; restate it as what the buyer does or suffers today",
    ]);
  });
});

describe("crumbs of value", () => {
  it("wants a crumb on every bet in play", () => {
    const m = maze(hypothesis());
    m.bets[0].crumbs = [];
    expect(checkMaze(m, "2026-09-28").gaps).toEqual(["b: no crumb of value: what can we give the buyer free today?"]);
  });

  it("lists crumbs still to give or awaiting a reaction, and wants a result once they land", () => {
    const m = maze(hypothesis());
    m.bets[0].crumbs = [
      { give: "Competitor digest", for: "Sarah", due: "2026-09-27", status: "to-give" },
      { give: "Script", for: "Tom", due: "2026-09-26", status: "used" },
    ];
    const { crumbs, gaps } = checkMaze(m, "2026-09-28");
    expect(crumbs).toMatchObject([{ give: "Competitor digest", overdue: true }]);
    expect(gaps).toEqual(['b: crumb "Script" is used but has no result']);
  });

  it("adds a crumb due today", () => {
    const m: Maze = { thesis: "", open_questions: [], bets: [] };
    addCrumb(m, "inbox", { give: "Events list", for: "Sarah", due: "2026-09-28" });
    expect(m.bets[0].crumbs).toEqual([{ give: "Events list", for: "Sarah", due: "2026-09-28", status: "to-give" }]);
  });
});

describe("addHypothesis", () => {
  const input = {
    belief: "Clinic managers lose 5+ hours a week to triage",
    wrongIf: "fewer than 4 of 12 describe it",
    action: "Message 10 clinic managers",
    bet: "inbox",
    type: "problem" as const,
    method: "customer conversations",
    deadline: "2026-10-12",
    today: "2026-09-28",
  };

  it("turns a belief into a testable hypothesis with an action due today", () => {
    const m: Maze = { thesis: "", open_questions: [], bets: [] };
    addHypothesis(m, input);
    const { blocking, next } = checkMaze(m, "2026-09-28");
    expect(blocking).toEqual([]);
    expect(next[0]).toMatchObject({ bet: "inbox", hypothesis: "clinic-managers-lose-5-hours", due: "2026-09-28" });
  });

  it("never reuses an id", () => {
    const m: Maze = { thesis: "", open_questions: [], bets: [] };
    addHypothesis(m, input);
    expect(addHypothesis(m, input).id).toBe("clinic-managers-lose-5-hours-2");
  });
});

describe("events", () => {
  it("matches any comma-separated term, by word start", () => {
    expect(matches("robotics, humanoid", "Humanoid robots from AWS")).toBe(true);
    expect(matches("robot", "Robotics night")).toBe(true);
    expect(matches("ai", "Maintaining legacy code")).toBe(false);
  });

  it("drops the same event listed twice on one day", () => {
    const e = { start: "2026-10-07T18:00:00Z", title: "Physical I/O: Robotics", where: "", host: "", url: "", source: "Luma" };
    expect(dedupe([e, { ...e, title: "Physical IO Robotics", source: "Meetup" }])).toHaveLength(1);
  });
});

describe("transcripts", () => {
  const exported = JSON.stringify([
    { name: "Clinic brainstorm", created_at: "2026-09-20T10:00:00Z", chat_messages: [
      { sender: "human", text: "Do clinic managers hate rota admin?" },
      { sender: "assistant", text: "", content: [{ type: "text", text: "Test it with 12 calls." }] },
    ] },
    { name: "Warehouse robots", created_at: "2026-09-21T10:00:00Z", chat_messages: [] },
  ]);

  it("picks one claude.ai conversation by title words", () => {
    const t = fromClaudeAi(exported, "clinic");
    expect(t.turns).toEqual([
      { speaker: "Me", text: "Do clinic managers hate rota admin?" },
      { speaker: "Claude", text: "Test it with 12 calls." },
    ]);
  });

  it("lists the titles when the match is not unique", () => {
    expect(() => fromClaudeAi(exported, "")).toThrow(/2 conversations match/);
  });

  it("keeps only what was said in a Claude Code session", () => {
    const jsonl = [
      { type: "user", timestamp: "2026-09-28T09:00:00Z", message: { content: "Chart this thesis" } },
      { type: "user", isMeta: true, message: { content: "Base directory for this skill: ..." } },
      { type: "user", message: { content: "<system-reminder>ignore</system-reminder>" } },
      { type: "assistant", message: { content: [{ type: "thinking" }, { type: "text", text: "Charting now." }, { type: "tool_use" }] } },
      { type: "ai-title", aiTitle: "Idea maze session" },
    ].map((l) => JSON.stringify(l)).join("\n");
    const t = fromClaudeCode(jsonl);
    expect(t).toMatchObject({ title: "Idea maze session", date: "2026-09-28" });
    expect(t.turns).toEqual([
      { speaker: "Me", text: "Chart this thesis" },
      { speaker: "Claude", text: "Charting now." },
    ]);
    expect(toNote(t, "s.jsonl")).toContain("**Claude:** Charting now.");
  });
});

describe("latest", () => {
  it("says where the Exa key goes when it is missing", async () => {
    const key = process.env.EXA_API_KEY;
    delete process.env.EXA_API_KEY;
    await expect(latest("robots", 30)).rejects.toThrow("EXA_API_KEY is not set; add it to .env.local");
    if (key) process.env.EXA_API_KEY = key;
  });
});
