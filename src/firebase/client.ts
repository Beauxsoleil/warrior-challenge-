import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { canonical, clientOperation } from "../domain/operations";
import type { Remote } from "../sync/uploader";
import { selectTarget, databaseNameFor } from "./target";
const target = selectTarget(import.meta.env, location.hostname);
export const storageDatabaseName = databaseNameFor(target.config.projectId);
// A named app avoids reusing PIBASE's default Auth/cache instance on a shared origin.
export const app = initializeApp(target.config, "warrior-challenge");
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
});
if (target.emulator)
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
if (target.emulator) connectFirestoreEmulator(db, "127.0.0.1", 8080);
export const competitionId = "practice";
export function remoteFor(uid: string): Remote {
  const ref = (id: string) =>
    doc(db, "warriorChallenges", competitionId, "journal", id);
  return {
    async read(id) {
      if (auth.currentUser?.uid !== uid)
        throw Object.assign(new Error("Account changed"), {
          code: "unauthenticated",
        });
      const snapshot = await getDocFromServer(ref(id));
      return snapshot.exists() ? clientOperation(snapshot.data()) : null;
    },
    async accept(op) {
      // Online transaction only: unlike setDoc, this never enters an offline mutation queue.
      await runTransaction(db, async (tx) => {
        if (auth.currentUser?.uid !== uid || op.actorUid !== uid)
          throw Object.assign(new Error("Account changed"), {
            code: "unauthenticated",
          });
        const snapshot = await tx.get(ref(op.opId));
        if (snapshot.exists()) {
          if (canonical(clientOperation(snapshot.data())) !== canonical(op))
            throw Object.assign(new Error("ID collision"), {
              code: "integrity-error",
            });
          return;
        }
        tx.set(ref(op.opId), { ...op, receivedAt: serverTimestamp() });
      });
    },
  };
}
