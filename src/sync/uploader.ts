import { canonical, type Operation } from "../domain/operations";
import { LocalStore } from "../persistence/store";
export interface Remote {
  read(id: string): Promise<Operation | null>;
  accept(op: Operation): Promise<void>;
}
export interface Ownership {
  run(name: string, work: () => Promise<void>): Promise<void>;
}
export const browserOwnership: Ownership = {
  async run(name, work) {
    if (!navigator.locks)
      throw new Error(
        "Web Locks unavailable: upload disabled; retain and export captures.",
      );
    await navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
      if (lock) await work();
    });
  },
};
const retryable = new Set([
  "unavailable",
  "deadline-exceeded",
  "aborted",
  "unauthenticated",
  "resource-exhausted",
]);
export function codeOf(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String(error.code).replace(/^firestore\//, "")
    : "unknown";
}
export async function uploadPass(
  store: LocalStore,
  ns: string,
  remote: Remote,
  ownership: Ownership,
  stillActor: () => boolean,
  now = Date.now(),
) {
  await ownership.run("warrior-uploader:" + ns, async () => {
    const retained = await store.list(ns);
    const byId = new Map(retained.map((row) => [row.operation.opId, row]));
    for (const row of retained) {
      if (!stillActor()) return;
      if (
        row.state === "synced" ||
        row.state === "needs_review" ||
        row.nextAttemptMs > now
      )
        continue;
      try {
        // Online existence check also recovers acceptance followed by a local bookkeeping crash.
        const existing = await remote.read(row.operation.opId);
        if (existing) {
          if (canonical(existing) !== canonical(row.operation))
            throw Object.assign(
              new Error("ID collision: different immutable payload"),
              { code: "integrity-error" },
            );
          await store.transport(row.key, { state: "synced", error: undefined });
          continue;
        }
        let ready = true;
        for (const parentId of row.operation.parentIds) {
          if (
            byId.get(parentId)?.state === "needs_review" ||
            !(await remote.read(parentId))
          )
            ready = false;
        }
        if (!ready) {
          await store.transport(row.key, {
            state: "waiting_for_dependency",
            nextAttemptMs: now + 2000,
          });
          continue;
        }
        if (!stillActor()) return;
        await store.transport(row.key, { state: "upload_in_flight" });
        await remote.accept(row.operation);
        await store.transport(row.key, { state: "synced", error: undefined });
      } catch (error) {
        const code = codeOf(error),
          attempts = row.attempts + 1;
        await store.transport(row.key, {
          state: retryable.has(code)
            ? "saved_locally_pending_sync"
            : "needs_review",
          attempts,
          nextAttemptMs:
            now + Math.min(60000, 1000 * 2 ** Math.min(attempts, 6)),
          error: code + ": " + String(error),
        });
      }
    }
  });
}
