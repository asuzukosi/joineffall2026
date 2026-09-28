import { describe, expect, it } from "vitest";
import { openSeats, rankAll, speedFor, tierFor } from "../../scripts/discover/rank.ts";
import type { Person, Signal } from "../../scripts/discover/types.ts";

const TODAY = "2026-09-28";

function person(extra: Partial<Person> = {}): Person {
  return { id: "p", name: "A", title: "Engineer", company: "Acme", domain: "", company_size: null, linkedin: "",
    email: "", phone: null, phone_request_id: null, signals: [], tier: null, tier_override: null,
    speed_score: 0, speed_reasons: [], approved: false, ...extra };
}
const sig = (kind: string, date: string, company?: string): Signal => ({ id: kind + date, kind, date, text: kind, url: "u", company });

describe("rank", () => {
  it("sets tiers by company size", () => {
    const tier = (size: number | null) => tierFor(person({ company_size: size }), []);
    expect([tier(8), tier(50), tier(51), tier(5000), tier(5001), tier(null)])
      .toEqual(["mouse", "rabbit", "deer", "elephant", "whale", "deer"]);
  });

  it("puts strategic companies at whale and respects an override", () => {
    expect(tierFor(person({ company_size: 8 }), ["ACME"])).toBe("whale");
    expect(tierFor(person({ company_size: 8, tier_override: "elephant" }), [])).toBe("elephant");
  });

  it("counts each kind once, inside its window", () => {
    const signals = [sig("joined", "2026-07-01"), sig("hiring", "2025-01-01"), sig("hiring", "2026-09-01"),
      sig("funding", "2025-01-01"), sig("deadline", "2026-10-20"), sig("publishes", "2026-06-01")];
    const { score, reasons } = speedFor(person({ title: "Founder & CEO" }), signals, TODAY);
    expect(score).toBe(3 + 2 + 2 + 1 + 2);
    expect(reasons).toContain("founder or owner buys");
    expect(reasons.some((r) => r.startsWith("funding"))).toBe(false);
  });

  it("ignores a deadline that has passed", () => {
    expect(speedFor(person(), [sig("deadline", "2026-09-01")], TODAY).score).toBe(0);
  });

  it("orders by tier, then speed", () => {
    const ordered = rankAll([person({ name: "whale", company_size: 9000 }), person({ name: "slow mouse", company_size: 5 }),
      person({ name: "fast mouse", company_size: 5, signals: [sig("joined", "2026-09-01")] })], {}, [], TODAY);
    expect(ordered.map((p) => p.name)).toEqual(["fast mouse", "slow mouse", "whale"]);
  });

  it("lists seats that just opened", () => {
    const moved = person({ name: "Ada", signals: [sig("joined", "2026-09-01", "Acme"), sig("left", "2026-08-01", "Gamma")] });
    expect(openSeats([moved, person()])).toEqual(["Acme (Ada moved on)", "Gamma (Ada moved on)"]);
  });
});
