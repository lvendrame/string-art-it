import { describe, expect, it } from "vitest";
import { nextId, seedCounterFrom } from "./idCounter";

describe("nextId", () => {
  it("generates sequential ids per prefix", () => {
    const a = nextId("idcounter-test-a");
    const b = nextId("idcounter-test-a");
    expect(a).toMatch(/^idcounter-test-a-\d+$/);
    expect(b).toMatch(/^idcounter-test-a-\d+$/);
    expect(Number(b.split("-").pop())).toBe(Number(a.split("-").pop()) + 1);
  });

  it("tracks separate counters per prefix", () => {
    const a = nextId("idcounter-test-b");
    const c = nextId("idcounter-test-c");
    expect(a).toMatch(/^idcounter-test-b-1$/);
    expect(c).toMatch(/^idcounter-test-c-1$/);
  });
});

describe("seedCounterFrom", () => {
  it("bumps the counter past a higher id seen in a loaded document", () => {
    seedCounterFrom("idcounter-test-d-50");
    const next = nextId("idcounter-test-d");
    expect(Number(next.split("-").pop())).toBeGreaterThan(50);
  });

  it("does nothing for an id that isn't higher than the current counter", () => {
    nextId("idcounter-test-e"); // counter now at 1
    seedCounterFrom("idcounter-test-e-1");
    const next = nextId("idcounter-test-e");
    expect(next).toBe("idcounter-test-e-2");
  });

  it("does nothing for a malformed id with no trailing number", () => {
    seedCounterFrom("not-a-valid-id");
    const next = nextId("idcounter-test-f");
    expect(next).toBe("idcounter-test-f-1");
  });
});
