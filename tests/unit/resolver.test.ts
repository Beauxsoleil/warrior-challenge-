import { describe, expect, it } from "vitest";
import {
  canonical,
  operationSchema,
  resolve,
} from "../../src/domain/operations";
import { op } from "../fixture";
function permutations<T>(items: T[]): T[][] {
  return items.length
    ? items.flatMap((v, i) =>
        permutations(items.filter((_, j) => i !== j)).map((p) => [v, ...p]),
      )
    : [[]];
}
describe("immutable result graph", () => {
  it("pending, exact replay and numeric result", () => {
    expect(resolve([]).state).toBe("PENDING");
    expect(resolve([op(), op()]).value).toBe(50);
  });
  it("rejects altered ID collisions, unknown fields, bounds, NaN and fractional score", () => {
    expect(
      resolve([op(), op("op1", { payload: { value: 20, reason: "" } })]).state,
    ).toBe("INVALID");
    for (const value of [-1, 101, NaN, Infinity, 1.1])
      expect(
        operationSchema.safeParse(op("a", { payload: { value, reason: "" } }))
          .success,
      ).toBe(false);
    expect(operationSchema.safeParse({ ...op(), points: 10 }).success).toBe(
      false,
    );
  });
  it("preserves competing roots in either upload order", () => {
    for (const items of permutations([op("a"), op("b")]))
      expect(resolve(items)).toMatchObject({
        state: "CONFLICT",
        heads: [{ opId: "a" }, { opId: "b" }],
      });
  });
  it("does not infer missing parents or accept mixed entities/cycles", () => {
    expect(
      resolve([
        op("b", {
          kind: "result.correct",
          parentIds: ["a"],
          payload: { value: 1, reason: "fix" },
        }),
      ]).state,
    ).toBe("INCOMPLETE_INPUT");
    expect(resolve([op(), op("b", { teamId: "B" })]).state).toBe("INVALID");
    expect(
      resolve([
        op("a", {
          kind: "result.correct",
          parentIds: ["b"],
          payload: { value: 1, reason: "fix" },
        }),
        op("b", {
          kind: "result.correct",
          parentIds: ["a"],
          payload: { value: 2, reason: "fix" },
        }),
      ]).state,
    ).toBe("INVALID");
  });
  it("late undo races correction; explicit resolution is permutation-independent", () => {
    const a = op("a"),
      b = op("b", {
        kind: "result.correct",
        parentIds: ["a"],
        payload: { value: 30, reason: "fix" },
      }),
      v = op("v", {
        kind: "result.void",
        parentIds: ["a"],
        payload: { reason: "undo" },
      });
    expect(resolve([a, b, v]).state).toBe("CONFLICT");
    const r = op("r", {
      kind: "result.resolve",
      parentIds: ["b", "v"],
      payload: { value: 45, reason: "official" },
    });
    for (const items of permutations([a, b, v, r]))
      expect(resolve(items)).toMatchObject({ state: "VALID", value: 45 });
    expect(resolve([a, b, v, r, op("late")]).state).toBe("CONFLICT");
  });
  it("replacement references own void; void remains evidence", () => {
    const a = op("a"),
      v = op("v", {
        kind: "result.void",
        parentIds: ["a"],
        payload: { reason: "undo" },
      });
    expect(resolve([a, v]).state).toBe("VOID");
    expect(
      resolve([
        a,
        v,
        op("replacement", {
          kind: "result.correct",
          parentIds: ["v"],
          payload: { value: 20, reason: "replacement" },
        }),
      ]),
    ).toMatchObject({ state: "VALID", value: 20 });
  });
  it("canonical representation ignores property ordering", () =>
    expect(canonical({ b: [2, 1], a: 3 })).toBe(
      canonical({ a: 3, b: [2, 1] }),
    ));
});
