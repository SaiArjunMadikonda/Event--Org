import { describe, expect, it } from "vitest";
import { planGroupSizes, runMatching, validateAssignment, type Attendee, type MatchingInput } from "./engine";
import { mulberry32 } from "./rng";

const GENRES = ["Action", "Comedy", "Sci-Fi", "Drama", "Horror", "Animation"];

function people(n: number, interests: (i: number) => string[] = (i) => [GENRES[i % GENRES.length]]): Attendee[] {
  return Array.from({ length: n }, (_, i) => ({ id: `u${i + 1}`, interests: interests(i) }));
}

function input(overrides: Partial<MatchingInput>): MatchingInput {
  return {
    attendees: people(15),
    minGroupSize: 5,
    maxGroupSize: 5,
    blocks: [],
    method: "INTEREST",
    seed: 42,
    ...overrides,
  };
}

describe("planGroupSizes", () => {
  it("splits 15 into three groups of 5", () => {
    expect(planGroupSizes(15, 5, 5)).toEqual([5, 5, 5]);
  });
  it("spreads people evenly", () => {
    expect(planGroupSizes(14, 4, 6)).toEqual([5, 5, 4]);
    expect(planGroupSizes(12, 4, 6)).toEqual([6, 6]);
  });
  it("places as many as possible when everyone cannot fit (7 people, 4–6)", () => {
    expect(planGroupSizes(7, 4, 6)).toEqual([6]);
  });
  it("returns no groups below the minimum", () => {
    expect(planGroupSizes(3, 4, 6)).toEqual([]);
  });
  it("rejects invalid rules", () => {
    expect(() => planGroupSizes(10, 0, 4)).toThrow();
    expect(() => planGroupSizes(10, 5, 4)).toThrow();
  });
});

describe("runMatching", () => {
  it("Movie and Dinner Night: 15 people become three groups of five", () => {
    const result = runMatching(input({}));
    expect(result.groups.map((g) => g.members.length)).toEqual([5, 5, 5]);
    expect(result.unassigned).toEqual([]);
  });

  it("7 people with groups of 4–6 gives one group of 6 and one unassigned", () => {
    const result = runMatching(input({ attendees: people(7), minGroupSize: 4, maxGroupSize: 6 }));
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].members).toHaveLength(6);
    expect(result.unassigned).toEqual([{ id: "u7", reason: "GROUP_SIZE_LIMIT" }]);
  });

  it("marks everyone unassigned when there are too few people", () => {
    const result = runMatching(input({ attendees: people(3), minGroupSize: 4, maxGroupSize: 6 }));
    expect(result.groups).toEqual([]);
    expect(result.unassigned.every((u) => u.reason === "NOT_ENOUGH_PEOPLE")).toBe(true);
    expect(result.unassigned).toHaveLength(3);
  });

  it("never places blocked people together", () => {
    const blocks: Array<[string, string]> = [
      ["u1", "u2"],
      ["u1", "u3"],
      ["u2", "u3"],
      ["u4", "u5"],
    ];
    for (const method of ["INTEREST", "RANDOM"] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        const result = runMatching(input({ blocks, method, seed, attendees: people(15, () => ["Action"]) }));
        for (const g of result.groups) {
          for (const [a, b] of blocks) {
            expect(g.members.includes(a) && g.members.includes(b)).toBe(false);
          }
        }
      }
    }
  });

  it("leaves someone unassigned rather than breaking a block", () => {
    // Only one group possible, and u1 blocked u2: one of them cannot be placed.
    const result = runMatching(
      input({ attendees: people(5), minGroupSize: 4, maxGroupSize: 5, blocks: [["u1", "u2"]] }),
    );
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].members).toHaveLength(4);
    expect(result.unassigned).toHaveLength(1);
    expect(["u1", "u2"]).toContain(result.unassigned[0].id);
    expect(result.unassigned[0].reason).toBe("BLOCK_CONFLICT");
  });

  it("dissolves a group that would fall below the minimum", () => {
    // 4 people, groups of exactly 4, but u1 blocked u2: no valid group exists.
    const result = runMatching(
      input({ attendees: people(4), minGroupSize: 4, maxGroupSize: 4, blocks: [["u1", "u2"]] }),
    );
    expect(result.groups).toEqual([]);
    expect(result.unassigned).toHaveLength(4);
  });

  it("groups people with shared interests in interest mode", () => {
    // Three clean interest clusters of five.
    const clusters = ["Action", "Comedy", "Drama"];
    const attendees = people(15, (i) => [clusters[i % 3]]);
    const result = runMatching(input({ attendees, method: "INTEREST", seed: 7 }));
    for (const g of result.groups) {
      const genres = new Set(g.members.map((m) => attendees.find((a) => a.id === m)!.interests[0]));
      expect(genres.size).toBe(1);
      expect(g.sharedInterests).toHaveLength(1);
    }
  });

  it("is reproducible from its seed", () => {
    const a = runMatching(input({ seed: 123 }));
    const b = runMatching(input({ seed: 123 }));
    expect(a).toEqual(b);
  });

  it("reports the method that was actually used", () => {
    expect(runMatching(input({ method: "RANDOM" })).method).toBe("RANDOM");
    expect(runMatching(input({ method: "INTEREST" })).method).toBe("INTEREST");
  });

  it("rejects duplicate attendees", () => {
    expect(() => runMatching(input({ attendees: [...people(5), { id: "u1", interests: [] }] }))).toThrow();
  });

  it("satisfies every hard rule across many random events", () => {
    const rng = mulberry32(2026);
    for (let trial = 0; trial < 300; trial++) {
      const n = Math.floor(rng() * 40);
      const min = 2 + Math.floor(rng() * 4);
      const max = min + Math.floor(rng() * 4);
      const attendees = people(n, () => GENRES.filter(() => rng() < 0.35));
      const blocks: Array<[string, string]> = [];
      for (let b = 0; b < n / 3; b++) {
        const x = 1 + Math.floor(rng() * n);
        const y = 1 + Math.floor(rng() * n);
        if (x !== y) blocks.push([`u${x}`, `u${y}`]);
      }
      const inp = input({
        attendees,
        minGroupSize: min,
        maxGroupSize: max,
        blocks,
        method: rng() < 0.5 ? "INTEREST" : "RANDOM",
        seed: trial,
      });
      const result = runMatching(inp);
      expect(validateAssignment(inp, result)).toEqual([]);
    }
  });
});

describe("validateAssignment", () => {
  const base = { attendees: people(4), minGroupSize: 2, maxGroupSize: 3, blocks: [["u1", "u2"]] as Array<[string, string]> };

  it("catches duplicates, strangers, size and block violations", () => {
    const violations = validateAssignment(base, {
      groups: [{ members: ["u1", "u2", "u3", "u4"], sharedInterests: [] }, { members: ["u1", "x9"], sharedInterests: [] }],
      unassigned: [],
    });
    expect(violations.join("\n")).toMatch(/Group 1 has 4 people/);
    expect(violations.join("\n")).toMatch(/blocked pair/);
    expect(violations.join("\n")).toMatch(/x9 is not registered/);
    expect(violations.join("\n")).toMatch(/u1 appears 2 times/);
  });

  it("catches someone missing from the result", () => {
    const violations = validateAssignment(base, {
      groups: [{ members: ["u1", "u3"], sharedInterests: [] }],
      unassigned: [{ id: "u2", reason: "GROUP_SIZE_LIMIT" }],
    });
    expect(violations).toEqual(["u4 is missing from the result"]);
  });
});
