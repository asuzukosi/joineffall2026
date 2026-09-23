import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseConnections } from "@/lib/linkedin";

const csv = readFileSync("tests/fixtures/connections.csv", "utf8");

describe("parseConnections", () => {
  it("skips the notes LinkedIn puts above the header", () => {
    expect(parseConnections(csv)).toHaveLength(3);
  });

  it("joins the name and keeps the title and company", () => {
    const [neha] = parseConnections(csv);
    expect(neha.name).toBe("Neha Mittal");
    expect(neha.title).toBe("CEO and Co-founder");
    expect(neha.company).toBe("JustAI");
    expect(neha.connectedOn).toBe("14 Mar 2021");
  });

  it("normalises the profile url", () => {
    expect(parseConnections(csv)[1].url).toBe("linkedin.com/in/alexandre-berkovic");
  });

  it("decodes an escaped accent, so one person cannot become two", () => {
    expect(parseConnections(csv)[2].url).toBe("linkedin.com/in/bodinestubbé");
  });

  it("drops a restricted profile rather than matching it on name", () => {
    expect(parseConnections(csv).some((c) => c.name.startsWith("Restricted")))
      .toBe(false);
  });

  it("refuses a file that is not a connections export", () => {
    expect(() => parseConnections("a,b,c\n1,2,3")).toThrow(/connections export/i);
  });
});
