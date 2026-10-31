import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalStore, namespace } from "../../src/persistence/store";
import {
  uploadPass,
  type Remote,
  type Ownership,
} from "../../src/sync/uploader";
import { op } from "../fixture";
import type { Operation } from "../../src/domain/operations";
const stores: LocalStore[] = [];
async function open(name = crypto.randomUUID()) {
  const s = await LocalStore.open(name);
  stores.push(s);
  return s;
}
afterEach(() => stores.forEach((s) => s.db.close()));
const ns = namespace("practice", "scorer-a");
const owner: Ownership = { run: async (_, work) => work() };
function backend() {
  const accepted = new Map<string, Operation>();
  let writes = 0;
  const remote: Remote = {
    read: async (id) => accepted.get(id) ?? null,
    accept: async (o) => {
      accepted.set(o.opId, o);
      writes++;
    },
  };
  return { accepted, remote, writes: () => writes };
}
describe("local commit and independent transport", () => {
  it("survives reopen before upload and never silently replaces the same local ID", async () => {
    const name = crypto.randomUUID(),
      s = await open(name);
    await s.capture(op());
    s.db.close();
    const next = await open(name);
    expect((await next.list(ns))[0].state).toBe("saved_locally_pending_sync");
    await expect(
      next.capture(op("op1", { payload: { value: 20, reason: "" } })),
    ).rejects.toThrow();
    expect((await next.list(ns))[0].operation.payload).toEqual({
      value: 50,
      reason: "",
    });
  });
  it("transaction abort rejects capture and does not claim a save", async () => {
    const s = await open();
    const original = IDBObjectStore.prototype.add;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "add")
      .mockImplementationOnce(function (
        this: IDBObjectStore,
        ...args: Parameters<typeof original>
      ) {
        const request = original.apply(this, args);
        this.transaction.abort();
        return request;
      });
    await expect(s.capture(op())).rejects.toThrow();
    spy.mockRestore();
    expect(await s.list(ns)).toEqual([]);
  });
  it("recovers server acceptance followed by failed local acknowledgement without a new ID", async () => {
    const s = await open();
    const row = await s.capture(op());
    const b = backend();
    await b.remote.accept(row.operation);
    await s.transport(row.key, { state: "upload_in_flight" });
    await uploadPass(s, ns, b.remote, owner, () => true);
    expect((await s.list(ns))[0].state).toBe("synced");
    expect(b.writes()).toBe(1);
  });
  it("retains rejected intent and descendants while unrelated entries progress", async () => {
    const s = await open(),
      b = backend();
    await s.capture(op("parent"));
    await s.capture(
      op("child", {
        kind: "result.correct",
        parentIds: ["parent"],
        payload: { value: 60, reason: "fix" },
      }),
    );
    await s.capture(op("other", { teamId: "B" }));
    const remote = {
      ...b.remote,
      accept: async (o: Operation) => {
        if (o.opId === "parent")
          throw Object.assign(new Error("role revoked"), {
            code: "permission-denied",
          });
        await b.remote.accept(o);
      },
    };
    await uploadPass(s, ns, remote, owner, () => true);
    const rows = await s.list(ns);
    expect(rows.find((r) => r.operation.opId === "parent")?.state).toBe(
      "needs_review",
    );
    expect(rows.find((r) => r.operation.opId === "child")?.state).toBe(
      "waiting_for_dependency",
    );
    expect(rows.find((r) => r.operation.opId === "other")?.state).toBe(
      "synced",
    );
    expect(await s.export(ns)).toContain("role revoked");
  });
  it("never substitutes actors when accounts change and retains ID collisions", async () => {
    const s = await open(),
      b = backend();
    await s.capture(op());
    await uploadPass(s, ns, b.remote, owner, () => false);
    expect(b.writes()).toBe(0);
    b.accepted.set("op1", op("op1", { payload: { value: 99, reason: "" } }));
    await uploadPass(s, ns, b.remote, owner, () => true);
    expect((await s.list(ns))[0].state).toBe("needs_review");
    expect(await s.list(namespace("practice", "scorer-b"))).toEqual([]);
  });
  it("bounded backoff preserves a retryable failure", async () => {
    const s = await open();
    await s.capture(op());
    const b = backend();
    b.remote.read = async () => {
      throw Object.assign(new Error("offline"), { code: "unavailable" });
    };
    await uploadPass(s, ns, b.remote, owner, () => true, 100);
    expect((await s.list(ns))[0]).toMatchObject({
      state: "saved_locally_pending_sync",
      attempts: 1,
      nextAttemptMs: 2100,
    });
  });
  it("dependency accepted before child, exact payload retained", async () => {
    const s = await open(),
      b = backend();
    await s.capture(op("a"));
    await s.capture(
      op("b", {
        kind: "result.correct",
        parentIds: ["a"],
        payload: { value: 80, reason: "fix" },
      }),
    );
    await uploadPass(s, ns, b.remote, owner, () => true);
    expect([...b.accepted.keys()]).toEqual(["a", "b"]);
    expect((await s.list(ns)).every((r) => r.state === "synced")).toBe(true);
  });
});
