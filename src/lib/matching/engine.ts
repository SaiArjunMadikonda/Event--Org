/**
 * Group matching engine.
 *
 * Pure TypeScript, no database access: give it the attendees of one event and the
 * event's rules, and it proposes groups. The organizer reviews the proposal before
 * anything is published.
 *
 * Hard rules (never broken; `validateAssignment` checks them):
 *   1. Only the attendees passed in can be assigned.
 *   2. Nobody appears twice (every attendee is either in exactly one group or unassigned).
 *   3. Every group is within [minGroupSize, maxGroupSize].
 *   4. People who blocked each other (either direction) are never in the same group.
 *
 * Preferences (best effort, after the hard rules):
 *   - INTEREST: place people with some shared interests together, then improve by swapping.
 *   - RANDOM:   shuffle and fill groups evenly; interests are not used at all.
 * Ties are broken with a seeded random generator, so a run can be reproduced from its seed.
 */

import { mulberry32, shuffle } from "./rng";

export type MatchingMethod = "INTEREST" | "RANDOM";

export interface Attendee {
  id: string;
  interests: string[];
}

export interface MatchingInput {
  /** Registered attendees, in registration order (earliest first). */
  attendees: Attendee[];
  minGroupSize: number;
  maxGroupSize: number;
  /** Pairs of attendee ids that must not be grouped together (order does not matter). */
  blocks: Array<[string, string]>;
  method: MatchingMethod;
  seed: number;
}

export interface ProposedGroup {
  members: string[];
  /** Interests held by at least two members, most common first (max 3). */
  sharedInterests: string[];
}

export type UnassignedReason =
  /** Fewer registrants than the minimum group size. */
  | "NOT_ENOUGH_PEOPLE"
  /** No group had room for them under the group-size rule. */
  | "GROUP_SIZE_LIMIT"
  /** Every group with room contained someone they are blocked with. */
  | "BLOCK_CONFLICT";

export interface UnassignedAttendee {
  id: string;
  reason: UnassignedReason;
}

export interface MatchingResult {
  method: MatchingMethod;
  seed: number;
  groups: ProposedGroup[];
  unassigned: UnassignedAttendee[];
}

export const METHOD_DESCRIPTIONS: Record<MatchingMethod, string> = {
  INTEREST:
    "Interest-based: people were grouped so they share some interests, while keeping every group within the size rule and keeping blocked people apart. Ties were broken at random.",
  RANDOM:
    "Mostly random: people were shuffled into groups at random. Interests were not used. The size rule and blocks were still respected.",
};

export const UNASSIGNED_REASON_TEXT: Record<UnassignedReason, string> = {
  NOT_ENOUGH_PEOPLE: "Not enough registrants to form even one group of the minimum size.",
  GROUP_SIZE_LIMIT: "No group had room for them under the current group-size rule.",
  BLOCK_CONFLICT: "Every group with room included someone they are blocked with.",
};

/**
 * Decide how many groups to make and how big each should be.
 * Prefers placing everyone with the fewest, most even groups. If the size rule makes that
 * impossible (e.g. 7 people, groups of 4–6), it places as many people as it can.
 */
export function planGroupSizes(n: number, minSize: number, maxSize: number): number[] {
  if (!Number.isInteger(minSize) || !Number.isInteger(maxSize) || minSize < 1 || maxSize < minSize) {
    throw new Error(`Invalid group size rule: ${minSize}–${maxSize}`);
  }
  if (n < minSize) return [];

  const kAll = Math.ceil(n / maxSize);
  if (kAll * minSize <= n) {
    // Everyone fits: spread n as evenly as possible over kAll groups.
    const base = Math.floor(n / kAll);
    const extra = n % kAll;
    return Array.from({ length: kAll }, (_, i) => (i < extra ? base + 1 : base));
  }

  // Not everyone fits. floor(n / min) groups is the most we can fill to at least `min`,
  // and since it is fewer than kAll, filling each to `max` still leaves people over.
  const k = Math.floor(n / minSize);
  return Array.from({ length: k }, () => maxSize);
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function runMatching(input: MatchingInput): MatchingResult {
  const { attendees, minGroupSize, maxGroupSize, method, seed } = input;

  const ids = attendees.map((a) => a.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate attendee ids passed to matching");
  }

  const rng = mulberry32(seed);
  const interestsOf = new Map(attendees.map((a) => [a.id, new Set(a.interests)]));
  const blocked = new Set(input.blocks.map(([a, b]) => pairKey(a, b)));
  const isBlocked = (a: string, b: string) => blocked.has(pairKey(a, b));
  const conflicts = (person: string, group: string[]) => group.some((m) => isBlocked(person, m));

  const sizes = planGroupSizes(attendees.length, minGroupSize, maxGroupSize);
  if (sizes.length === 0) {
    return {
      method,
      seed,
      groups: [],
      unassigned: ids.map((id) => ({ id, reason: "NOT_ENOUGH_PEOPLE" as const })),
    };
  }

  const totalSlots = sizes.reduce((s, x) => s + x, 0);
  // Earlier registrants get priority for the available slots.
  const pool = ids.slice(0, totalSlots);
  const overflow = ids.slice(totalSlots);

  const groups: string[][] = sizes.map(() => []);

  /** How well `person` fits into `group` (higher is better). Only used by INTEREST. */
  const fitScore = (person: string, group: string[]): number => {
    if (group.length === 0) return 0.5; // an empty group beats a group with nothing in common
    const mine = interestsOf.get(person)!;
    let covered = 0;
    for (const interest of mine) {
      if (group.some((m) => interestsOf.get(m)!.has(interest))) covered++;
    }
    let overlappingMembers = 0;
    for (const m of group) {
      for (const interest of interestsOf.get(m)!) {
        if (mine.has(interest)) {
          overlappingMembers++;
          break;
        }
      }
    }
    return covered + 0.25 * overlappingMembers;
  };

  /** Pick among candidate group indexes, breaking ties at random. */
  const pickBest = (candidates: number[], score: (g: number) => number): number => {
    let best: number[] = [];
    let bestScore = -Infinity;
    for (const g of candidates) {
      const s = score(g);
      if (s > bestScore + 1e-9) {
        bestScore = s;
        best = [g];
      } else if (Math.abs(s - bestScore) <= 1e-9) {
        best.push(g);
      }
    }
    return best[Math.floor(rng() * best.length)];
  };

  const scoreFor = (person: string) =>
    method === "INTEREST"
      ? (g: number) => fitScore(person, groups[g])
      : (g: number) => sizes[g] - groups[g].length; // RANDOM: keep groups even

  // Place the most constrained people first so blocks are less likely to strand them.
  const blockCount = new Map<string, number>(pool.map((id) => [id, 0]));
  for (const key of blocked) {
    const [a, b] = key.split("|");
    if (blockCount.has(a) && blockCount.has(b)) {
      blockCount.set(a, blockCount.get(a)! + 1);
      blockCount.set(b, blockCount.get(b)! + 1);
    }
  }
  const order = shuffle(pool, rng).sort((a, b) => blockCount.get(b)! - blockCount.get(a)!);

  const conflictLeftovers: string[] = [];
  for (const person of order) {
    const candidates = groups
      .map((_, g) => g)
      .filter((g) => groups[g].length < sizes[g] && !conflicts(person, groups[g]));
    if (candidates.length === 0) {
      conflictLeftovers.push(person);
      continue;
    }
    groups[pickBest(candidates, scoreFor(person))].push(person);
  }

  // INTEREST: improve by swapping people between groups when it raises the total fit.
  if (method === "INTEREST" && groups.length > 1) {
    const groupScore = (group: string[]) =>
      group.reduce((s, m) => s + fitScore(m, group.filter((x) => x !== m)), 0);
    const iterations = Math.min(4000, 40 * pool.length);
    for (let i = 0; i < iterations; i++) {
      const g1 = Math.floor(rng() * groups.length);
      let g2 = Math.floor(rng() * (groups.length - 1));
      if (g2 >= g1) g2++;
      if (groups[g1].length === 0 || groups[g2].length === 0) continue;
      const i1 = Math.floor(rng() * groups[g1].length);
      const i2 = Math.floor(rng() * groups[g2].length);
      const a = groups[g1][i1];
      const b = groups[g2][i2];
      const new1 = groups[g1].map((m, idx) => (idx === i1 ? b : m));
      const new2 = groups[g2].map((m, idx) => (idx === i2 ? a : m));
      if (conflicts(b, new1.filter((m) => m !== b)) || conflicts(a, new2.filter((m) => m !== a))) continue;
      const before = groupScore(groups[g1]) + groupScore(groups[g2]);
      const after = groupScore(new1) + groupScore(new2);
      if (after > before + 1e-9) {
        groups[g1] = new1;
        groups[g2] = new2;
      }
    }
  }

  const unassigned = new Map<string, UnassignedReason>();

  /** Try to fit someone into any group that still has room under the maximum. */
  const tryPlace = (person: string): boolean => {
    const candidates = groups
      .map((_, g) => g)
      .filter((g) => groups[g].length < maxGroupSize && !conflicts(person, groups[g]));
    if (candidates.length === 0) return false;
    groups[pickBest(candidates, method === "INTEREST" ? scoreFor(person) : (g) => -groups[g].length)].push(person);
    return true;
  };

  for (const person of conflictLeftovers) {
    if (!tryPlace(person)) unassigned.set(person, "BLOCK_CONFLICT");
  }
  for (const person of overflow) {
    if (!tryPlace(person)) unassigned.set(person, "GROUP_SIZE_LIMIT");
  }

  // Never leave a group under the minimum: dissolve it and re-home its members where possible.
  for (;;) {
    const small = groups
      .map((g, idx) => ({ idx, len: g.length }))
      .filter((x) => x.len < minGroupSize)
      .sort((a, b) => a.len - b.len)[0];
    if (!small) break;
    const [members] = groups.splice(small.idx, 1);
    for (const person of members) {
      if (!tryPlace(person)) unassigned.set(person, "GROUP_SIZE_LIMIT");
    }
  }

  const result: MatchingResult = {
    method,
    seed,
    groups: groups.map((members) => ({ members, sharedInterests: sharedInterests(members, interestsOf) })),
    // Report unassigned people in registration order.
    unassigned: ids.filter((id) => unassigned.has(id)).map((id) => ({ id, reason: unassigned.get(id)! })),
  };

  const violations = validateAssignment(input, result);
  if (violations.length > 0) {
    // Should be impossible; refuse to return an invalid proposal rather than hide it.
    throw new Error(`Matching produced an invalid assignment: ${violations.join("; ")}`);
  }
  return result;
}

function sharedInterests(members: string[], interestsOf: Map<string, Set<string>>): string[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    for (const i of interestsOf.get(m) ?? []) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);
}

/**
 * Check a proposed (or stored) assignment against the hard rules.
 * Returns a list of human-readable violations; empty means valid.
 */
export function validateAssignment(
  input: Pick<MatchingInput, "attendees" | "minGroupSize" | "maxGroupSize" | "blocks">,
  result: Pick<MatchingResult, "groups" | "unassigned">,
): string[] {
  const violations: string[] = [];
  const registered = new Set(input.attendees.map((a) => a.id));
  const seen = new Map<string, number>();
  const blocked = new Set(input.blocks.map(([a, b]) => pairKey(a, b)));

  result.groups.forEach((group, g) => {
    if (group.members.length < input.minGroupSize || group.members.length > input.maxGroupSize) {
      violations.push(
        `Group ${g + 1} has ${group.members.length} people (allowed ${input.minGroupSize}–${input.maxGroupSize})`,
      );
    }
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        if (blocked.has(pairKey(group.members[i], group.members[j]))) {
          violations.push(`Group ${g + 1} contains a blocked pair`);
        }
      }
    }
  });

  const everyone = [...result.groups.flatMap((g) => g.members), ...result.unassigned.map((u) => u.id)];
  for (const id of everyone) {
    if (!registered.has(id)) violations.push(`${id} is not registered for this event`);
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) violations.push(`${id} appears ${count} times`);
  }
  for (const id of registered) {
    if (!seen.has(id)) violations.push(`${id} is missing from the result`);
  }
  return violations;
}
