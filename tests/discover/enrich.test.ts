import { describe, expect, it } from "vitest";
import { applyMatch, collectPhones, enrichAll, type Apollo, type MatchReply } from "../../scripts/discover/enrich.ts";
import type { Person } from "../../scripts/discover/types.ts";

const TODAY = "2026-09-28";
const FOUND = {
  id: "ap1",
  email: "ada@beta.com",
  title: "Head of Inspection",
  linkedin_url: "https://linkedin.com/in/ada",
  employment_history: [
    { current: true, start_date: "2026-07-01", end_date: null, organization_name: "Beta", title: "Head of Inspection" },
    { current: false, start_date: "2019-01-01", end_date: "2026-06-01", organization_name: "Acme", title: "Inspection Lead" },
  ],
  organization: { estimated_num_employees: 140, primary_domain: "beta.com", latest_funding_round_date: "2026-05-01", latest_funding_stage: "Series B" },
};

function person(extra: Partial<Person> = {}): Person {
  return { id: "p_1", name: "Ada Obi", title: "", company: "Beta", domain: "", company_size: null, linkedin: "",
    email: "", phone: null, phone_request_id: null, signals: [], tier: null, tier_override: null,
    speed_score: 0, speed_reasons: [], approved: false, enriched_at: null, ...extra };
}

function fake(post: () => MatchReply, gets: Awaited<ReturnType<Apollo["get"]>>[] = []): Apollo & { posts: number } {
  const api = { posts: 0, async post() { api.posts++; return post(); }, async get() { return gets.shift()!; } };
  return api;
}

describe("enrich", () => {
  it("fills contact and company fields and adds dated signals", () => {
    const p = person();
    applyMatch(p, FOUND, TODAY);
    expect(p).toMatchObject({ email: "ada@beta.com", company_size: 140, domain: "beta.com", title: "Head of Inspection" });
    expect(p.signals.map((s) => s.kind)).toEqual(["joined", "funding"]);
    expect(p.signals[0].text).toBe("Joined Beta as Head of Inspection, from Acme");
  });

  it("leaves a person alone when Apollo finds no match", async () => {
    const people = [person()];
    expect(await enrichAll(people, false, fake(() => ({ person: null })), TODAY)).toEqual({ matched: 0, tried: 1, errors: [] });
    expect(people[0].email).toBe("");
  });

  it("skips people already enriched or without a name", async () => {
    const api = fake(() => ({ person: FOUND }));
    await enrichAll([person({ enriched_at: "2026-09-01" }), person({ name: "" })], false, api, TODAY);
    expect(api.posts).toBe(0);
  });

  it("keeps what it already paid for when one call fails, and does not ask again", async () => {
    let calls = 0;
    const api = fake(() => {
      if (calls++ === 0) throw new Error("429 from Apollo /people/match");
      return { person: FOUND };
    });
    const people = [person({ name: "First" }), person()];
    const result = await enrichAll(people, false, api, TODAY);
    expect(result).toEqual({ matched: 1, tried: 2, errors: ["First: 429 from Apollo /people/match"] });
    expect(people[0].enriched_at).toBeNull();
    expect(people[1].enriched_at).toBe(TODAY);
    await enrichAll(people, false, fake(() => ({ person: null })), TODAY);
    expect(people[1].email).toBe("ada@beta.com");
  });

  it("asks for phones only for deer and above, even when already enriched", async () => {
    const api = fake(() => ({ person: null, request_id: 42 }), [{ status: 200, body: { phone_numbers: [{ sanitized_number: "+15550100" }] } }]);
    const mouse = person({ tier: "mouse", enriched_at: TODAY, email: "m@x.com" });
    const deer = person({ tier: "deer", enriched_at: TODAY, email: "d@x.com" });
    const result = await enrichAll([mouse, deer], true, api, TODAY);
    expect(result.tried).toBe(1);
    expect(mouse.phone_request_id).toBeNull();
    expect(deer.phone_request_id).toBe("42");
  });

  it("polls for phones until Apollo has them", async () => {
    const people = [person({ phone_request_id: "123" })];
    const api = fake(() => ({}), [
      { status: 404, body: { error_code: "result_pending", retry_after_seconds: 1 } },
      { status: 200, body: { webhook_status: "success", webhook_result: { people: [{ phone_numbers: [{ sanitized_number: "+447700900123" }] }] } } },
    ]);
    await collectPhones(people, api, async () => {});
    expect(people[0].phone).toBe("+447700900123");
  });
});
