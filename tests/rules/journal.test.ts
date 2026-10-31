import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { documents, projectId } from "../../scripts/fixtures";
import { op } from "../fixture";
import { resolve, type Operation } from "../../src/domain/operations";
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [path, value] of Object.entries(documents))
      await setDoc(doc(ctx.firestore(), path), value);
  });
});
const db = (uid = "scorer-a") => env.authenticatedContext(uid).firestore();
const ref = (id: string, uid = "scorer-a") =>
  doc(db(uid), "competitions/practice/journal/" + id);
const write = (o: Operation, uid = o.actorUid) =>
  setDoc(ref(o.opId, uid), { ...o, receivedAt: serverTimestamp() });
async function privileged(path: string, data: object) {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), path), data, { merge: true }),
  );
}
describe("real Rules authorization", () => {
  it("accepts assigned numeric capture, server acknowledgement, narrow query and immutable history", async () => {
    await assertSucceeds(write(op()));
    expect((await getDoc(ref("op1"))).data()?.receivedAt).toBeTruthy();
    await assertSucceeds(
      getDocs(
        query(
          collection(db(), "competitions/practice/journal"),
          where("eventId", "==", "grenade"),
        ),
      ),
    );
    await assertFails(
      getDocs(collection(db(), "competitions/practice/journal")),
    );
    await assertFails(
      updateDoc(ref("op1"), { payload: { value: 99, reason: "" } }),
    );
    await assertFails(deleteDoc(ref("op1")));
    await assertFails(write(op()));
  });
  it("denies unauthenticated private reads, role escalation and public writes", async () => {
    await assertFails(
      getDoc(
        doc(env.unauthenticatedContext().firestore(), "competitions/practice"),
      ),
    );
    await assertFails(
      setDoc(doc(db(), "competitions/practice/members/scorer-a"), {
        role: "admin",
        active: true,
        eventIds: ["grenade"],
      }),
    );
    await assertFails(
      setDoc(doc(db("admin"), "competitions/practice/public/standings"), {
        points: 5,
      }),
    );
  });
  it("denies wrong station, forged actor, inactive member and invented team", async () => {
    await assertFails(write(op("wrong", { eventId: "other" })));
    await assertFails(
      write(op("forged", { actorUid: "scorer-b" }), "scorer-a"),
    );
    await assertFails(write(op("unknown", { teamId: "fake" })));
    await privileged("competitions/practice/members/scorer-a", {
      active: false,
    });
    await assertFails(write(op()));
  });
  it("rejects field injection, incorrect versions, bounds, receipt time and payload keys", async () => {
    for (const data of [
      { ...op(), points: 100 },
      { ...op(), schemaVersion: 2 },
      { ...op(), payload: { value: 50, reason: "", points: 10 } },
      { ...op(), payload: { value: 101, reason: "" } },
      { ...op(), parentIds: "op" },
    ])
      await assertFails(
        setDoc(ref("op1"), { ...data, receivedAt: serverTimestamp() }),
      );
    await assertFails(setDoc(ref("op1"), { ...op(), receivedAt: new Date(0) }));
    await assertFails(
      setDoc(ref("different"), { ...op(), receivedAt: serverTimestamp() }),
    );
  });
  it("allows own undo/replacement, denies other authors and ordinary scorer corrections", async () => {
    await write(op("a"));
    await assertFails(
      write(
        op("bad", {
          kind: "result.correct",
          parentIds: ["a"],
          payload: { value: 20, reason: "fix" },
        }),
      ),
    );
    await assertFails(
      write(
        op("other-void", {
          actorUid: "scorer-b",
          kind: "result.void",
          parentIds: ["a"],
          payload: { reason: "undo" },
        }),
      ),
    );
    await assertSucceeds(
      write(
        op("v", {
          kind: "result.void",
          parentIds: ["a"],
          payload: { reason: "undo" },
        }),
      ),
    );
    await assertSucceeds(
      write(
        op("r", {
          kind: "result.correct",
          parentIds: ["v"],
          payload: { value: 20, reason: "replace" },
        }),
      ),
    );
    await assertFails(
      write(
        op("bad-replace", {
          actorUid: "scorer-b",
          kind: "result.correct",
          parentIds: ["v"],
          payload: { value: 20, reason: "replace" },
        }),
      ),
    );
  });
  it("validates same-entity parents, parent counts, missing dependencies and duplicates", async () => {
    await write(op("a"));
    await write(op("b", { teamId: "B" }));
    for (const parentIds of [
      [],
      ["missing"],
      ["b"],
      ["a", "a"],
      ["../a"],
      ["a", "b", "c", "d", "e"],
    ])
      await assertFails(
        write(
          op("bad", {
            actorUid: "admin",
            kind: "result.correct",
            parentIds,
            payload: { value: 20, reason: "fix" },
          }),
        ),
      );
    await assertFails(
      write(op("bad", { kind: "result.submit", parentIds: ["a"] })),
    );
  });
  it("preserves both reconnect orders and permits explicit admin resolution within 4-parent budget", async () => {
    for (const order of [
      ["a", "b"],
      ["b", "a"],
    ]) {
      await env.withSecurityRulesDisabled(async (ctx) => {
        for (const id of ["a", "b", "r"])
          await deleteDoc(
            doc(ctx.firestore(), "competitions/practice/journal/" + id),
          );
      });
      const operations = order.map((id) =>
        op(id, { actorUid: id === "a" ? "scorer-a" : "scorer-b" }),
      );
      for (const o of operations) await assertSucceeds(write(o));
      expect(resolve(operations).state).toBe("CONFLICT");
      const r = op("r", {
        actorUid: "admin",
        kind: "result.resolve",
        parentIds: ["a", "b"],
        payload: { value: 70, reason: "review" },
      });
      await assertSucceeds(write(r));
      expect(resolve([...operations, r]).value).toBe(70);
    }
    await write(op("c"));
    await write(op("d"));
    await assertSucceeds(
      write(
        op("four", {
          actorUid: "admin",
          kind: "result.resolve",
          parentIds: ["a", "b", "c", "d"],
          payload: { value: 75, reason: "four-parent budget test" },
        }),
      ),
    );
  });
  it("allows backlog intake while closing, denies locked and official competitions", async () => {
    await privileged("competitions/practice/events/grenade", {
      state: "closing",
    });
    await assertSucceeds(write(op("closing")));
    await privileged("competitions/practice/events/grenade", {
      state: "locked",
    });
    await assertFails(write(op("locked")));
    await privileged("competitions/practice/events/grenade", { state: "open" });
    await privileged("competitions/practice", { mode: "official" });
    await assertFails(write(op("official")));
  });
  it("online create transaction reconciles duplicate retries without updates", async () => {
    const database = db();
    const target = doc(database, "competitions/practice/journal/once");
    const save = () =>
      runTransaction(database, async (tx) => {
        const existing = await tx.get(target);
        if (!existing.exists())
          tx.set(target, { ...op("once"), receivedAt: serverTimestamp() });
      });
    await assertSucceeds(save());
    await assertSucceeds(save());
    expect((await getDoc(target)).data()?.opId).toBe("once");
  });
});
