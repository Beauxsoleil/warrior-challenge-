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
// Deliberate M1 safety gate. No production project configuration is accepted.
if (!["localhost", "127.0.0.1"].includes(location.hostname))
  throw new Error(
    "M1 requires a local browser with loopback emulators. Remote preview is not connected.",
  );
export const app = initializeApp({
  projectId: "demo-warrior-challenge",
  apiKey: "demo-not-a-secret",
  authDomain: "localhost",
});
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
});
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
connectFirestoreEmulator(db, "127.0.0.1", 8080);
export const competitionId = "practice";
export function remoteFor(uid: string): Remote {
  const ref = (id: string) =>
    doc(db, "competitions", competitionId, "journal", id);
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
