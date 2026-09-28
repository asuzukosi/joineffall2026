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
  subject: "[Founder field guide] Co-founder breakups decide more early companies than markets do, here's how to see it coming",
  seen: { text: "Co-founder breakups getting to you? And I'm sure customer discovery and its demands are getting very tough.", evidence: ["profile:1"] },
  gift: {
    finding: "Most co-founder splits start months earlier, as a silent gap in how much risk each founder can carry.",
    means: "The guide gives you five questions that surface it while it is still an easy talk.",
    link: "https://example.com/guide",
  },
  why_me: "I've been working with founders going through this.",
  ask: "Feel free to book a 20 minute conversation if you'd like to talk face to face about these.",
  order: ["seen", "gift", "why_me", "ask"],
  linkedin: "Co-founder breakups getting to you? I made a short guide for early founders on handling it: https://example.com/guide",
};

const BAD: Note = {
  ...GOOD,
  seen: { text: "Saw you just joined EF.", evidence: ["profile:1"] },
  gift: { finding: "I'm a psychiatric clinician specializing in founder mental health.", means: "It could help you.", link: "https://example.com" },
  why_me: "I've helped X amount of founders go through the tough founding process.",
  ask: "Are you open to a 20 minute conversation?",
};

const BOOKING = "https://calendar.app.google/JWd2cyMtkWQ6kzMx8";
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
    const drive = "https://drive.google.com/file/d/abc/view";
    const note = { ...GOOD, gift: { ...GOOD.gift, pamphlet: "acme", link: drive }, linkedin: `Made this for you: ${drive}` };
    expect(check(note, mouse, gifts)[0]).toMatch(/pamphlet .* not built/);
    mkdirSync(join(gifts.pamphlets, "acme"));
    writeFileSync(join(gifts.pamphlets, "acme", "pamphlet.pdf"), "%PDF");
    expect(check(note, mouse, gifts)).toEqual([]);
  });

  it("needs a share link for every gift, and the LinkedIn note carries it", () => {
    const shareLink = "gift needs a link they can open, such as a Google Drive link anyone can view";
    expect(check({ ...GOOD, gift: { ...GOOD.gift, link: undefined } })).toContain(shareLink);
    expect(check({ ...GOOD, gift: { ...GOOD.gift, link: undefined, file: "brief.pdf" } }, mouse, { pamphlets: base(), out: base() })).toContain(shareLink);
    expect(check({ ...GOOD, gift: { ...GOOD.gift, link: "file:///Users/me/brief.pdf" } })).toContain(shareLink);
    expect(check({ ...GOOD, linkedin: "Co-founder breakups getting to you?" })).toContain("the LinkedIn note must include the gift link");
  });

  it("rejects subjects that are about us or say nothing", () => {
    for (const line of ["Quick question", "following up", "Checking in", "Intro to Example Co", "Hi Ada"]) {
      const subject = `[Field guide] ${line}`;
      expect(check({ ...GOOD, subject })).toContain(`subject says nothing about their outcome: "${subject}"`);
    }
    expect(check({ ...GOOD, subject: "[Global CIO report] Your AI accountability is about to outpace your capacity, here's what happens next" })).toEqual([]);
    expect(check({ ...GOOD, subject: "Your AI accountability is about to outpace your capacity" })).toContain("subject must start with a [report name] tag, e.g. [Global CIO report]");
  });

  it("makes every follow-up bring something new, with its own link", () => {
    const finding = "Founders who split had usually stopped sharing their personal runway numbers a quarter before.";
    const means = "The one-page check shows you how to raise it without it feeling like an accusation.";
    const followUp = (f = finding, m = means, link = "https://drive.google.com/file/d/two/view") => ({ ...GOOD, follow_ups: [{ finding: f, means: m, link }] });
    expect(check(followUp())).toEqual([]);
    expect(check(followUp("just bumping this to the top of your inbox so it does not get lost."))).toContain("follow-up 1 brings nothing new: \"bumping\"");
    expect(check(followUp(finding, means, GOOD.gift.link!))).toContain("follow-up 1 needs its own link to something new, not the first gift again");
    expect(check(followUp(finding, means, ""))).toContain("follow-up 1 needs its own link to something new, not the first gift again");
    expect(check(followUp(finding, "word ".repeat(50)))).toContain("follow-up 1 is 64 words; the limit is 60");
  });

  it("makes the email hand over the finding itself, told to them, not a pointer to a file", () => {
    const gift = (finding: string, means = GOOD.gift.means) => check({ ...GOOD, gift: { ...GOOD.gift, finding, means } });
    expect(gift("Page 4 has the three warning signs your peers caught too late.")).toContain("gift only points at the file; say what they are missing: \"page 4 has\"");
    expect(gift("Take a look at the attached guide for early founders.")).toContain("gift only points at the file; say what they are missing: \"take a look\"");
    expect(gift("Splits start early.")).toContain("gift finding is too thin to be useful on its own; state what they are missing in a full sentence");
    expect(gift(GOOD.gift.finding, "The guide has five questions that surface it early.")).toContain("gift must say what it means for them, speaking to them (you / your)");
    const followUp = { finding: "Page 6 has the checklist.", means: "Worth a read.", link: "https://drive.google.com/file/d/two/view" };
    expect(check({ ...GOOD, follow_ups: [followUp] })).toEqual(expect.arrayContaining([
      "follow-up 1 only points at the file; say what they are missing: \"page 6 has\"",
      "follow-up 1 must say what it means for them, speaking to them (you / your)",
    ]));
  });

  it("keeps every email to 90 words, whatever the tier", () => {
    const long = { ...GOOD, ask: "word ".repeat(60) };
    expect(check(long)).toContain("email is 119 words; the limit is 90");
    expect(check(long, { tier: "whale" } as Person)).toContain("email is 119 words; the limit is 90");
    const long201 = GOOD.linkedin.padEnd(201, ".");
    expect(check({ ...GOOD, linkedin: long201 })).toContain("LinkedIn note is 201 characters; the limit is 200");
    expect(check({ ...GOOD, linkedin: GOOD.linkedin.padEnd(200, ".") })).toEqual([]);
  });
});

describe("draftAll", () => {
  function batch() {
    const dir = create("x", "Any", "Any", base());
    const brief = readJson<Brief>(join(dir, "brief.json"));
    writeJson(join(dir, "brief.json"), { ...brief, sender: { name: "Kosi", company: "Example Co", why_me: "", booking_link: BOOKING } });
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
    expect(email.startsWith("Subject: [Founder field guide] Co-founder breakups decide more early companies than markets do, here's how to see it coming\n\nhi Ada,")).toBe(true);
    expect(email.indexOf("co-founder")).toBeLessThan(email.indexOf("20 minute"));
    expect(email.endsWith(`kosi\n\nnot relevant? that's fine! send a "no" and i won't follow up\n`)).toBe(true);
    expect(email).toContain("and i'm sure customer discovery");
    const body = email.slice(email.indexOf("\n")).replace(BOOKING, "").replaceAll("Ada", "");
    expect(body).toBe(body.toLowerCase());
    expect(email).toContain("while it is still an easy talk.\nhttps://example.com/guide\n");
    expect(email).toContain("most co-founder splits start months earlier, as a silent gap in how much risk each founder can carry. the guide gives you five questions");
    expect(email).not.toContain("Attach");
    expect(email).toContain(`talk face to face about these.\n${BOOKING}\n\nkosi`);
    expect(readFileSync(join(dir, "out", ada, "linkedin.md"), "utf8")).toMatch(/^co-founder/);
  });

  it("reports a note with the wrong shape and still drafts the rest", () => {
    const { dir, ids: [ada, ben] } = batch();
    writeFileSync(join(dir, "notes", `${ada}.json`), JSON.stringify(GOOD));
    for (const broken of [null, { ...GOOD, order: {} }, { ...GOOD, seen: { text: "x", evidence: "profile:1" } }]) {
      writeFileSync(join(dir, "notes", `${ben}.json`), JSON.stringify(broken));
      const failures = draftAll(dir, base());
      expect(Object.keys(failures)).toEqual([ben]);
      expect(failures[ben][0]).toMatch(/^notes\/p_[0-9a-f]+\.json has the wrong shape:/);
    }
  });

  it("refuses to draft without a booking link in the brief", () => {
    const { dir } = batch();
    const brief = readJson<Brief>(join(dir, "brief.json"));
    writeJson(join(dir, "brief.json"), { ...brief, sender: { ...brief.sender, booking_link: "" } });
    expect(() => draftAll(dir, base())).toThrow("brief.json needs sender.booking_link");
  });

  it("writes at most three short paragraphs between the greeting and the sign-off", () => {
    const { dir, ids: [ada] } = batch();
    writeFileSync(join(dir, "notes", `${ada}.json`), JSON.stringify(GOOD));
    draftAll(dir, base());
    const email = readFileSync(join(dir, "out", ada, "email.md"), "utf8");
    const body = email.slice(email.indexOf("hi Ada,\n\n") + 9, email.indexOf("\n\nkosi"));
    expect(body.split("\n\n")).toHaveLength(3);
    expect(body.split("\n\n")[2]).toMatch(/^i've been working with founders going through this\. feel free to book/);
  });

  it("drafts each follow-up in the same voice, with its link", () => {
    const { dir, ids: [ada] } = batch();
    const link = "https://drive.google.com/file/d/Two/view";
    const followUps = [{ finding: "Founders who split had usually stopped sharing their runway numbers a quarter before.", means: "Ada, the one-page check shows you how to raise it gently.", link }];
    writeFileSync(join(dir, "notes", `${ada}.json`), JSON.stringify({ ...GOOD, follow_ups: followUps }));
    expect(draftAll(dir, base())).toEqual({});
    const followUp = readFileSync(join(dir, "out", ada, "follow-up-1.md"), "utf8");
    expect(followUp).toBe(`hi Ada,\n\nfounders who split had usually stopped sharing their runway numbers a quarter before. Ada, the one-page check shows you how to raise it gently.\n${link}\n\nkosi\n\nnot relevant? that's fine! send a "no" and i won't follow up\n`);
  });

  it("keeps the person's and company's names in their own casing anywhere in the body", () => {
    const { dir, ids: [ada] } = batch();
    const note = { ...GOOD, why_me: "Ada, I want you to win at ACME. I've been working with founders like you, ada." , ask: "Book 20 minutes if useful." };
    writeFileSync(join(dir, "notes", `${ada}.json`), JSON.stringify(note));
    draftAll(dir, base());
    const email = readFileSync(join(dir, "out", ada, "email.md"), "utf8");
    expect(email).toContain("Ada, i want you to win at Acme. i've been working with founders like you, Ada.");
    expect(email).not.toContain("adapt");
  });

  it("reports a note for someone not in the batch", () => {
    const { dir } = batch();
    writeFileSync(join(dir, "notes", "p_missing.json"), JSON.stringify(GOOD));
    expect(draftAll(dir, base())).toEqual({ p_missing: ["no person with id p_missing"] });
  });
});
