import { z } from "zod";
export const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const common = {
  opId: id,
  competitionId: id,
  eventId: id,
  teamId: id,
  schemaVersion: z.literal(1),
  rulesVersion: z.literal("practice-v1"),
  actorUid: id,
  deviceId: id,
  sessionId: id,
  capturedAtClientMs: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
};
const score = z
  .object({
    value: z.number().int().min(0).max(100),
    reason: z.string().max(500),
  })
  .strict();
const parent = z
  .array(id)
  .max(4)
  .refine((p) => new Set(p).size === p.length, "Duplicate parent");
export const operationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...common,
      kind: z.literal("result.submit"),
      parentIds: parent.length(0),
      payload: score,
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("result.correct"),
      parentIds: parent.length(1),
      payload: score.refine(
        (p) => p.reason.trim().length > 0,
        "Reason required",
      ),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("result.void"),
      parentIds: parent.length(1),
      payload: z.object({ reason: z.string().min(1).max(500) }).strict(),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("result.resolve"),
      parentIds: parent.min(2),
      payload: score.refine(
        (p) => p.reason.trim().length > 0,
        "Reason required",
      ),
    })
    .strict(),
]);
export type Operation = z.infer<typeof operationSchema>;
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(record[k]))
      .join(",") +
    "}"
  );
}
export function clientOperation(raw: unknown): Operation {
  if (!raw || typeof raw !== "object") return operationSchema.parse(raw);
  const { receivedAt: _receivedAt, ...client } = raw as Record<string, unknown>;
  void _receivedAt;
  return operationSchema.parse(client);
}
export const entityKey = (
  op: Pick<Operation, "competitionId" | "eventId" | "teamId">,
) => JSON.stringify([op.competitionId, op.eventId, op.teamId]);
export type Resolution = {
  state:
    "PENDING" | "VALID" | "VOID" | "CONFLICT" | "INCOMPLETE_INPUT" | "INVALID";
  heads: Operation[];
  value?: number;
  error?: string;
};
export function resolve(input: readonly Operation[]): Resolution {
  const ops = new Map<string, Operation>();
  try {
    for (const raw of input) {
      const op = operationSchema.parse(raw);
      const previous = ops.get(op.opId);
      if (previous && canonical(previous) !== canonical(op))
        throw new Error("Operation ID collision");
      ops.set(op.opId, op);
    }
    if (!ops.size) return { state: "PENDING", heads: [] };
    if (new Set([...ops.values()].map(entityKey)).size !== 1)
      throw new Error("Mixed entities");
    for (const op of ops.values())
      for (const p of op.parentIds) {
        if (!ops.has(p))
          return {
            state: "INCOMPLETE_INPUT",
            heads: [],
            error: "Missing parent " + p,
          };
      }
    const visiting = new Set<string>(),
      visited = new Set<string>();
    function visit(key: string) {
      if (visiting.has(key)) throw new Error("Cycle");
      if (visited.has(key)) return;
      visiting.add(key);
      for (const p of ops.get(key)!.parentIds) visit(p);
      visiting.delete(key);
      visited.add(key);
    }
    for (const key of ops.keys()) visit(key);
    const superseded = new Set([...ops.values()].flatMap((op) => op.parentIds));
    const heads = [...ops.values()]
      .filter((op) => !superseded.has(op.opId))
      .sort((a, b) => (a.opId < b.opId ? -1 : a.opId > b.opId ? 1 : 0));
    if (heads.length > 1) return { state: "CONFLICT", heads };
    const head = heads[0];
    return head.kind === "result.void"
      ? { state: "VOID", heads }
      : { state: "VALID", heads, value: head.payload.value };
  } catch (error) {
    return { state: "INVALID", heads: [], error: String(error) };
  }
}
