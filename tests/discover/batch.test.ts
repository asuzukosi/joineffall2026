import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addCompanySignals, addPeople, create, loadPeople, openBatch, readJson, signalsFor } from "../../scripts/discover/batch.ts";
import { requireKey } from "../../scripts/discover/keys.ts";
import type { Brief, Company, Signal } from "../../scripts/discover/types.ts";

const root = () => mkdtempSync(join(tmpdir(), "discover-"));
const signal = (id: string): Signal => ({ id, kind: "profile", date: "2026-09-01", text: "t", url: "u" });

describe("batch", () => {
  it("creates a folder with an empty brief", () => {
    const dir = create("inspection", "Robotics", "Pilot reviews", root());
    expect(readJson<Brief>(join(dir, "brief.json")).industry).toBe("Robotics");
    expect(loadPeople(dir)).toEqual([]);
  });

  it("fills the sender from the environment set up once", () => {
    process.env.DISCOVER_SENDER_NAME = "Kosi";
    process.env.DISCOVER_SENDER_COMPANY = "Example Co";
    process.env.DISCOVER_BOOKING_LINK = "https://calendar.app.google/abc";
    const dir = create("sender", "a", "b", root());
    expect(readJson<Brief>(join(dir, "brief.json")).sender).toEqual({
      name: "Kosi", company: "Example Co", why_me: "", booking_link: "https://calendar.app.google/abc" });
    delete process.env.DISCOVER_SENDER_NAME;
    delete process.env.DISCOVER_SENDER_COMPANY;
    delete process.env.DISCOVER_BOOKING_LINK;
  });

  it("refuses to overwrite a batch", () => {
    const base = root();
    create("x", "a", "b", base);
    expect(() => create("x", "a", "b", base)).toThrow("already exists");
  });

  it("opens a batch by name or by path", () => {
    const base = root();
    const dir = create("x", "a", "b", base);
    expect(openBatch(dir.split("/").pop()!, base)).toBe(dir);
    expect(openBatch(dir, base)).toBe(dir);
    expect(() => openBatch("missing", base)).toThrow("no batch");
  });

  it("keeps the same person from two sources as one record", () => {
    const dir = create("x", "a", "b", root());
    const first = { name: "Ada Obi", company: "Acme", linkedin: "https://linkedin.com/in/ada/", signals: [signal("a")] };
    const second = { name: "ada obi", company: "ACME", title: "Head of Ops", signals: [signal("b")] };
    expect(addPeople(dir, [first])).toBe(1);
    expect(addPeople(dir, [second])).toBe(0);
    const [ada, ...rest] = loadPeople(dir);
    expect(rest).toEqual([]);
    expect(ada.signals.map((s) => s.id)).toEqual(["a", "b"]);
    expect(ada.title).toBe("Head of Ops");
    expect(ada.id).toMatch(/^p_[0-9a-f]{8}$/);
  });

  it("skips someone with no name, email or LinkedIn", () => {
    const dir = create("x", "a", "b", root());
    expect(addPeople(dir, [{ title: "Somebody", signals: [] }])).toBe(0);
  });

  it("gives company signals to that company's people", () => {
    const dir = create("x", "a", "b", root());
    addCompanySignals(dir, "Acme", [signal("job")]);
    addCompanySignals(dir, "acme", [signal("job")]);
    const companies = readJson<Record<string, Company>>(join(dir, "companies.json"));
    expect(signalsFor(companies, { company: "ACME ", signals: [signal("own")] }).map((s) => s.id)).toEqual(["own", "job"]);
  });

  it("names a missing key", () => {
    delete process.env.EXA_API_KEY;
    expect(() => requireKey("EXA_API_KEY")).toThrow("EXA_API_KEY");
  });
});
