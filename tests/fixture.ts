import type { Operation } from "../src/domain/operations";
export function op(opId = "op1", patch: Partial<Operation> = {}): Operation {
  return {
    opId,
    competitionId: "practice",
    eventId: "grenade",
    teamId: "A",
    schemaVersion: 1,
    rulesVersion: "practice-v1",
    actorUid: "scorer-a",
    deviceId: "device",
    sessionId: "session",
    capturedAtClientMs: 100,
    kind: "result.submit",
    parentIds: [],
    payload: { value: 50, reason: "" },
    ...patch,
  } as Operation;
}
