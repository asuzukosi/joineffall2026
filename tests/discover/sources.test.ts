import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as exa from "../../scripts/discover/exa.ts";
import * as jobs from "../../scripts/discover/jobs.ts";
import * as papers from "../../scripts/discover/papers.ts";

const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

describe("exa", () => {
  it("reads a person, their current job and a recent move from Exa's real reply shape", () => {
    const person = exa.personFrom({
      id: "abc",
      url: "https://www.linkedin.com/in/ada-obi",
      title: "Ada Obi - Head of Inspection - Beta",
      entities: [{ id: "e1", type: "person", version: 1, properties: { name: "Ada Obi", workHistory: [
        { title: "Head of Inspection", dates: { from: "2026-08-01", to: null }, company: { id: "c1", name: "Beta" } },
        { title: "Inspection Lead", dates: { from: "2021-01", to: "2026-07" }, company: { id: "c2", name: "Acme" } },
      ] } }],
    }, "inspection leads", "2026-09-28");
    expect(person).toMatchObject({ name: "Ada Obi", title: "Head of Inspection", company: "Beta", linkedin: "https://www.linkedin.com/in/ada-obi" });
    expect(person.signals.map((s) => s.kind)).toEqual(["profile", "joined"]);
    expect(person.signals[1].text).toBe("Joined Beta as Head of Inspection, from Acme");
  });

  it("falls back to the page title when there is no entity", () => {
    const person = exa.personFrom({ id: "x", url: "https://example.com/team", title: "Ben Ade - CTO" }, "q", "2026-09-28");
    expect(person.name).toBe("Ben Ade");
    expect(person.linkedin).toBe("");
  });
});

describe("papers", () => {
  it("turns each author into a person sharing the paper's signal", () => {
    const works = fixture("openalex_works.json").results;
    const people = works.flatMap(papers.authorsOf);
    expect(people.length).toBeGreaterThan(0);
    for (const person of people) {
      expect(person.name).toBeTruthy();
      expect(person.signals[0].kind).toBe("publishes");
      expect(person.signals[0].id).toMatch(/^paper:W/);
    }
    expect(new Set(papers.authorsOf(works[0]).map((p) => p.signals[0].id)).size).toBe(1);
  });
});

describe("jobs", () => {
  it("reads Greenhouse posts as plain text", () => {
    const posts = jobs.postings("greenhouse", fixture("greenhouse_jobs.json"));
    expect(posts).toHaveLength(3);
    for (const post of posts) {
      expect(post.url).toMatch(/^http/);
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.text).not.toContain("<");
    }
  });

  it("reads Lever and Ashby posts", () => {
    const lever = [{ id: "l1", text: "Inspection Lead", hostedUrl: "https://jobs.lever.co/a/l1", createdAt: 1756684800000, descriptionPlain: "d" }];
    const ashby = { jobs: [{ id: "a1", title: "Robotics PM", jobUrl: "https://jobs.ashbyhq.com/b/a1", publishedAt: "2026-09-01T10:00:00Z", descriptionPlain: "d" }] };
    expect(jobs.postings("lever", lever)[0].date).toBe("2025-09-01");
    expect(jobs.postings("ashby", ashby)[0].title).toBe("Robotics PM");
  });

  it("names who the hire reports to", () => {
    const post = { id: "l1", title: "Inspection Lead", url: "https://x", date: "2026-09-01", text: "You will report to the VP of Operations. Travel required." };
    expect(jobs.signalFrom("lever", "acme", post)).toMatchObject({
      id: "job:lever:acme:l1", kind: "hiring", text: "Hiring: Inspection Lead (reports to VP of Operations)" });
  });

  it("needs every query word", () => {
    const post = { title: "Inspection Lead", text: "drones and crawlers" };
    expect(jobs.matches(post, "inspection drones")).toBe(true);
    expect(jobs.matches(post, "inspection welding")).toBe(false);
  });
});
