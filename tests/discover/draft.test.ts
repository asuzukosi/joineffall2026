import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addPeople, create, loadPeople, readJson, writeJson } from "../../scripts/discover/batch.ts";
import { checkNote } from "../../scripts/discover/checks.ts";
import { draftAll } from "../../scripts/discover/draft.ts";
import type { Brief, Note, Person, Signal } from "../../scripts/discover/types.ts";

const SIGNALS: Signal[] = [{ id: "profile:1", kind: "profile", date: "2026-09-01", text: "t", url: "u" }];

const GOOD: Note = {
  todo_guess: "Keep the founding team together through discovery",
  subject: "A guide for the early days",
  seen: { text: "Co-founder breakups getting to you? And I'm sure customer discovery and its demands are getting very tough.", evidence: ["profile:1"] },
  gift: { text: "I created a guide for founders in the very early stages that helps them introspect and manage these challenges better, here's the link.", link: "https://example.com/guide" },
  why_me: "I want you to win and I think this would really give you a leg up. I've been working with founders going through this.",
  ask: "Feel free to book a 20 minute conversation if you'd like to talk face to face about these.",
  order: ["seen", "gift", "why_me", "ask"],
  linkedin: "Co-founder breakups getting to you? I made a short guide for early founders on handling it: https://example.com/guide",
};

const BAD: Note = {
  ...GOOD,
  seen: { text: "Saw you just joined EF.", evidence: ["profile:1"] },
  gift: { text: "I'm a psychiatric clinician specializing in founder mental health.", link: "https://example.com" },
  why_me: "I've helped X amount of founders go through the tough founding process.",
  ask: "Are you open to a 20 minute conversation?",
};

const base = () => mkdtempSync(join(tmpdir(), "discover-"));
const mouse = { tier: "mouse" } as Person;
const check = (note: Note, person = mouse, gifts = { pamphlets: base(), out: base() }) => checkNote(note, person, SIGNALS, gifts);

describe("checkNote", () => {
  it("passes the value-first message", () => expect(check(GOOD)).toEqual([]));

  it("fails the pitch-first message on its phrases", () => {
    expect(check(BAD)).toEqual(expect.arrayContaining(["banned phrase: \"i'm a\"", "banned phrase: \"i've helped\"", "banned phrase: \"are you open to\""]));
  });

  it("lets seen and gift swap, but keeps why-me after the gift and the ask last", () => {
    expect(check({ ...GOOD, order: ["gift", "seen", "why_me", "ask"] })).toEqual([]);
    expect(check({ ...GOOD, order: ["seen", "gift", "ask", "why_me"] })).toContain("the ask must come last");
    expect(check({ ...GOOD, order: ["seen", "why_me", "gift", "ask"] })).toContain("why_me must come after the gift");
  });

  it("needs recorded evidence", () => {
    expect(check({ ...GOOD, seen: { text: "x", evidence: ["made:up"] } })).toContain("unknown evidence id: made:up");
    expect(check({ ...GOOD, seen: { text: "x", evidence: [] } })[0]).toMatch(/no evidence/);
  });

  it("needs the gift to exist", () => {
    const gifts = { pamphlets: base(), out: base() };
    const note = { ...GOOD, gift: { text: "Made for you.", pamphlet: "acme" } };
    expect(check(note, mouse, gifts)[0]).toMatch(/pamphlet .* not built/);
    mkdirSync(join(gifts.pamphlets, "acme"));
    writeFileSync(join(gifts.pamphlets, "acme", "pamphlet.pdf"), "%PDF");
    expect(check(note, mouse, gifts)).toEqual([]);
    expect(check({ ...GOOD, gift: { text: "x" } })).toContain("gift needs a pamphlet, file or link");
  });

  it("limits length by tier", () => {
    const long = { ...GOOD, ask: "word ".repeat(60) };
    expect(check(long).some((p) => p.includes("limit is 90"))).toBe(true);
    expect(check(long, { tier: "elephant" } as Person)).toEqual([]);
    expect(check({ ...GOOD, linkedin: "x".repeat(301) }).some((p) => p.includes("LinkedIn"))).toBe(true);
  });
});

describe("draftAll", () => {
  function batch() {
    const dir = create("x", "Any", "Any", base());
    const brief = readJson<Brief>(join(dir, "brief.json"));
    writeJson(join(dir, "brief.json"), { ...brief, sender: { name: "Kosi", company: "Example Co", why_me: "" } });
    addPeople(dir, [
      { name: "Ada Obi", company: "Acme", tier: "mouse", signals: SIGNALS },
      { name: "Ben Ade", company: "Beta", tier: "mouse", signals: SIGNALS },
    ]);
    return { dir, ids: loadPeople(dir).map((p) => p.id) };
  }

  it("drafts a good note and reports a broken one", () => {
    const { dir, ids: [ada, ben] } = batch();
    writeFileSync(join(dir, "notes", `${ada}.json`), JSON.stringify(GOOD));
    writeFileSync(join(dir, "notes", `${ben}.json`), "{not json");
    const failures = draftAll(dir, base());
    expect(Object.keys(failures)).toEqual([ben]);
    expect(failures[ben][0]).toMatch(/not valid JSON/);
    const email = readFileSync(join(dir, "out", ada, "email.md"), "utf8");
    expect(email.startsWith("Subject: A guide for the early days\n\nHi Ada,")).toBe(true);
    expect(email.indexOf("Co-founder")).toBeLessThan(email.indexOf("20 minute"));
    expect(email.trimEnd().endsWith("Kosi")).toBe(true);
    expect(readFileSync(join(dir, "out", ada, "linkedin.md"), "utf8")).toMatch(/^Co-founder/);
  });

  it("reports a note for someone not in the batch", () => {
    const { dir } = batch();
    writeFileSync(join(dir, "notes", "p_missing.json"), JSON.stringify(GOOD));
    expect(draftAll(dir, base())).toEqual({ p_missing: ["no person with id p_missing"] });
  });
});
