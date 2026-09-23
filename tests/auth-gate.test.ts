import { describe, expect, it } from "vitest";
import { isMember } from "@/lib/roster";

const csv = [
  "name,email,linkedin,photo",
  "Ade Okafor,ade@example.com,https://www.linkedin.com/in/ade-okafor/,https://cdn.example.com/a.webp?v=1",
].join("\n");

describe("the sign-in gate", () => {
  process.env.ROSTER_CSV = csv;

  it("lets a roster address through, whatever case it is typed in", () => {
    expect(isMember("ade@example.com")).toBe(true);
    expect(isMember("  ADE@Example.com  ")).toBe(true);
  });

  it("keeps everyone else out", () => {
    expect(isMember("stranger@example.com")).toBe(false);
    expect(isMember("")).toBe(false);
  });
});
