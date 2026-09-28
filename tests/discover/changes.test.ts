import { describe, expect, it } from "vitest";
import { jobChanges } from "../../scripts/discover/changes.ts";
import { daysBetween, parseDate } from "../../scripts/discover/dates.ts";
import type { Job } from "../../scripts/discover/types.ts";

const TODAY = "2026-09-28";
const job = (company: string, title: string, start: string | null, end: string | null = null): Job =>
  ({ company, title, start, end, current: end === null });

describe("dates", () => {
  it("reads partial dates as the first of the month or year", () => {
    expect(parseDate("2026-07")?.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(parseDate("2026")?.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(parseDate("2026-07-15T10:00:00Z")?.toISOString().slice(0, 10)).toBe("2026-07-15");
    expect(parseDate("soon")).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(daysBetween("2026-09-01", TODAY)).toBe(27);
  });
});

describe("jobChanges", () => {
  it("records joining a new company, naming the one they came from", () => {
    const [s] = jobChanges([job("Beta", "Head of Ops", "2026-07-01"), job("Acme", "Ops Lead", "2022-01", "2026-06")], TODAY, "u", "x");
    expect(s).toMatchObject({ kind: "joined", date: "2026-07-01", text: "Joined Beta as Head of Ops, from Acme", company: "Acme" });
  });

  it("records a new role at the same company", () => {
    const [s] = jobChanges([job("Acme", "Head of Ops", "2026-08"), job("Acme", "Ops Lead", "2022", "2026-08")], TODAY, "u", "x");
    expect(s).toMatchObject({ kind: "role_change", text: "Became Head of Ops at Acme, was Ops Lead" });
  });

  it("records leaving when there is no recent join", () => {
    const [s] = jobChanges([job("Acme", "Ops Lead", "2020", "2026-08-15")], TODAY, "u", "x");
    expect(s).toMatchObject({ kind: "left", text: "Left Ops Lead at Acme", company: "Acme" });
  });

  it("records nothing when every change is old or undated", () => {
    expect(jobChanges([job("Acme", "Ops Lead", "2019"), job("Old", "Analyst", null, null)], TODAY, "u", "x")).toEqual([]);
    expect(jobChanges([], TODAY, "u", "x")).toEqual([]);
  });
});
