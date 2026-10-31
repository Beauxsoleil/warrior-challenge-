import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { operationSchema, type Operation } from "../domain/operations";
export type Transport =
  | "saved_locally_pending_sync"
  | "waiting_for_dependency"
  | "upload_in_flight"
  | "synced"
  | "needs_review";
export type Entry = {
  key: string;
  namespace: string;
  operation: Operation;
  state: Transport;
  attempts: number;
  nextAttemptMs: number;
  error?: string;
};
interface StoreSchema extends DBSchema {
  outbox: { key: string; value: Entry; indexes: { namespace: string } };
  metadata: { key: string; value: string };
  configuration: { key: string; value: unknown };
}
export const namespace = (competition: string, uid: string) =>
  JSON.stringify([competition, uid]);
export class LocalStore {
  constructor(readonly db: IDBPDatabase<StoreSchema>) {}
  static async open(name: string) {
    const db = await openDB<StoreSchema>(name, 1, {
      upgrade(db) {
        db.createObjectStore("outbox", { keyPath: "key" }).createIndex(
          "namespace",
          "namespace",
        );
        db.createObjectStore("metadata");
        db.createObjectStore("configuration");
      },
    });
    return new LocalStore(db);
  }
  async deviceId() {
    const tx = this.db.transaction("metadata", "readwrite");
    void tx.done.catch(() => undefined);
    let value = await tx.store.get("deviceId");
    if (!value) {
      value = crypto.randomUUID();
      await tx.store.put(value, "deviceId");
    }
    await tx.done;
    return value;
  }
  async capture(raw: Operation) {
    const operation = operationSchema.parse(raw);
    const ns = namespace(operation.competitionId, operation.actorUid);
    const entry: Entry = {
      key: JSON.stringify([ns, operation.opId]),
      namespace: ns,
      operation,
      state: "saved_locally_pending_sync",
      attempts: 0,
      nextAttemptMs: 0,
    };
    const tx = this.db.transaction("outbox", "readwrite");
    void tx.done.catch(() => undefined);
    await Promise.all([tx.store.add(entry), tx.done]); // No success acknowledgement before commit.
    return entry;
  }
  list(ns: string) {
    return this.db.getAllFromIndex("outbox", "namespace", ns);
  }
  async transport(
    key: string,
    patch: Partial<
      Pick<Entry, "state" | "attempts" | "nextAttemptMs" | "error">
    >,
  ) {
    const tx = this.db.transaction("outbox", "readwrite");
    void tx.done.catch(() => undefined);
    const entry = await tx.store.get(key);
    if (!entry) throw new Error("Missing retained capture");
    await tx.store.put({ ...entry, ...patch });
    await tx.done;
  }
  async export(ns: string) {
    return JSON.stringify(
      {
        schemaVersion: 1,
        kind: "private-device-outbox",
        storageDatabase: this.db.name,
        exportedAt: new Date().toISOString(),
        limitation: "Only this browser and actor; not a complete event backup.",
        entries: await this.list(ns),
      },
      null,
      2,
    );
  }
}
