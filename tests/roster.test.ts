import { describe, expect, it } from "vitest";
import { isMember, loadRoster, normaliseLinkedIn, parseRoster } from "@/lib/roster";

describe("normaliseLinkedIn", () => {
  it("strips scheme, subdomain, query and trailing slash", () => {
    expect(normaliseLinkedIn("https://www.linkedin.com/in/Ade-Okafor/?trk=abc"))
      .toBe("linkedin.com/in/ade-okafor");
  });

  it("returns an empty string for anything that is not a profile", () => {
    expect(normaliseLinkedIn("")).toBe("");
    expect(normaliseLinkedIn("https://example.com/ade")).toBe("");
  });

  it("lands an escaped accent and a literal one on the same key", () => {
    expect(normaliseLinkedIn("https://linkedin.com/in/bodinestubb%c3%a9"))
      .toBe(normaliseLinkedIn("https://www.linkedin.com/in/bodinestubbé/"));
  });

  it("survives a stray percent sign", () => {
    expect(normaliseLinkedIn("https://linkedin.com/in/ade-100%"))
      .toBe("linkedin.com/in/ade-100%");
  });
});

describe("parseRoster", () => {
  const csv = [
    "name,email,linkedin,photo",
    "Ade Okafor,Ade@Example.com,https://www.linkedin.com/in/ade-okafor/,ade-okafor.webp",
    "No Email,,https://www.linkedin.com/in/nobody/,nobody.webp",
  ].join("\n");

  it("lowercases the email and normalises the profile url", () => {
    const [ade] = parseRoster(csv);
    expect(ade.email).toBe("ade@example.com");
    expect(ade.linkedin).toBe("linkedin.com/in/ade-okafor");
  });

  it("drops a row with no email, since email is what the gate reads", () => {
    expect(parseRoster(csv)).toHaveLength(1);
  });
});

describe("loadRoster", () => {
  const csv = [
    "name,email,linkedin,photo",
    "Ade Okafor,ade@example.com,https://www.linkedin.com/in/ade-okafor/,ade-okafor.webp",
  ].join("\n");

  it("reads the cohort from the environment", () => {
    process.env.ROSTER_CSV = csv;
    expect(loadRoster()).toHaveLength(1);
    expect(isMember("ADE@example.com")).toBe(true);
    expect(isMember("stranger@example.com")).toBe(false);
  });
});
