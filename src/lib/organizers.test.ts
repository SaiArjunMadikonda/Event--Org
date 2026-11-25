import { describe, expect, it } from "vitest";
import { isListedOrganizer, onboardingState, parseOrganizerEmails, validateApplication } from "./organizers";

describe("parseOrganizerEmails", () => {
  it("accepts commas, spaces and mixed case", () => {
    expect([...parseOrganizerEmails(" A@x.com, b@Y.org ;c@z.net\n")]).toEqual(["a@x.com", "b@y.org", "c@z.net"]);
  });

  it("is empty when unset or junk", () => {
    expect(parseOrganizerEmails(undefined).size).toBe(0);
    expect(parseOrganizerEmails("  ,, not-an-email ").size).toBe(0);
  });
});

describe("isListedOrganizer", () => {
  it("matches case-insensitively and only exact addresses", () => {
    expect(isListedOrganizer("Host@Example.com", "host@example.com")).toBe(true);
    expect(isListedOrganizer("other@example.com", "host@example.com")).toBe(false);
    expect(isListedOrganizer("host@example.com", "")).toBe(false);
  });
});

describe("onboardingState", () => {
  it("organizers never see the form", () => {
    expect(onboardingState("ORGANIZER", null)).toBe("ORGANIZER");
    expect(onboardingState("ORGANIZER", { status: "PENDING" })).toBe("ORGANIZER");
  });

  it("only one pending application at a time", () => {
    expect(onboardingState("PARTICIPANT", { status: "PENDING" })).toBe("PENDING");
  });

  it("can apply first time or again after a decline", () => {
    expect(onboardingState("PARTICIPANT", null)).toBe("CAN_APPLY");
    expect(onboardingState("PARTICIPANT", { status: "DECLINED" })).toBe("CAN_APPLY");
  });
});

describe("validateApplication", () => {
  it("requires plans and area", () => {
    expect(validateApplication({ plans: "", area: "Irving", experience: "" })).toMatch(/what you'd like/);
    expect(validateApplication({ plans: "Board games", area: "", experience: "" })).toMatch(/what you'd like/);
    expect(validateApplication({ plans: "Board games", area: "Irving", experience: "" })).toBeNull();
  });

  it("limits length", () => {
    expect(validateApplication({ plans: "x".repeat(1001), area: "Irving", experience: "" })).toMatch(/under 1000/);
  });
});
