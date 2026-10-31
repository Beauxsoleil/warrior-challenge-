import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { z } from "zod";
import { auth, db, competitionId, remoteFor } from "../firebase/client";
import {
  clientOperation,
  operationSchema,
  resolve,
  type Operation,
} from "../domain/operations";
import { LocalStore, namespace, type Entry } from "../persistence/store";
import { browserOwnership, uploadPass } from "../sync/uploader";
const memberSchema = z.object({
  active: z.boolean(),
  role: z.enum(["admin", "scorer"]),
  eventIds: z.array(z.string()),
});
const teamSchema = z.object({
  label: z.string(),
  bib: z.string(),
  eligible: z.boolean(),
  rosterVersion: z.string(),
});
type Team = z.infer<typeof teamSchema> & { id: string };
function download(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "private-practice-outbox.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function App() {
  const [user, setUser] = useState<User | null>(null),
    [login, setLogin] = useState("scorer-a@practice.invalid"),
    [password, setPassword] = useState("");
  const [store, setStore] = useState<LocalStore>(),
    [storage, setStorage] = useState("Checking local storage"),
    [member, setMember] = useState<z.infer<typeof memberSchema>>();
  const [teams, setTeams] = useState<Team[]>([]),
    [team, setTeam] = useState("A"),
    [score, setScore] = useState("50"),
    [reason, setReason] = useState("");
  const [journal, setJournal] = useState<Operation[]>([]),
    [rows, setRows] = useState<Entry[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false),
    [source, setSource] = useState("No journal downloaded"),
    [sessionId] = useState(() => crypto.randomUUID());
  const [eventOpen, setEventOpen] = useState(false);
  const [last, setLast] = useState<{ op: Operation; deadline: number }>(),
    [tick, setTick] = useState(0);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setMember(undefined);
        setTeams([]);
        setJournal([]);
        setRows([]);
        setLast(undefined);
        setEventOpen(false);
      }),
    [],
  );
  useEffect(() => {
    let alive = true;
    let local: LocalStore | undefined;
    LocalStore.open()
      .then(async (s) => {
        local = s;
        await s.deviceId();
        const persistent = await navigator.storage
          ?.persist?.()
          .catch(() => false);
        if (alive) {
          setStore(s);
          setStorage(
            "Local database ready; persistent storage " +
              (persistent ? "granted" : "not guaranteed"),
          );
        }
      })
      .catch((e) =>
        setStorage(
          "NO-GO: local storage unavailable. Use paper backup. " + String(e),
        ),
      );
    return () => {
      alive = false;
      local?.db.close();
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!user) return;
    const unsubscribeMember = onSnapshot(
      doc(db, "competitions", competitionId, "members", user.uid),
      (snapshot) => {
        try {
          const m = memberSchema.parse(snapshot.data());
          if (!m.active || !m.eventIds.includes("grenade"))
            throw new Error("Assignment unavailable");
          setMember(m);
        } catch (e) {
          setMember(undefined);
          setMessage("Capture unavailable: " + String(e));
        }
      },
      (e) => {
        setMember(undefined);
        setMessage(String(e));
      },
    );
    const unsubscribeTeams = onSnapshot(
      collection(db, "competitions", competitionId, "teams"),
      (s) => {
        try {
          setTeams(
            s.docs.map((d) => ({ id: d.id, ...teamSchema.parse(d.data()) })),
          );
        } catch (e) {
          setTeams([]);
          setMessage(String(e));
        }
      },
      (e) => setMessage(String(e)),
    );
    const unsubscribeJournal = onSnapshot(
      query(
        collection(db, "competitions", competitionId, "journal"),
        where("eventId", "==", "grenade"),
      ),
      { includeMetadataChanges: true },
      (s) => {
        if (s.metadata.hasPendingWrites) return;
        try {
          setJournal(s.docs.map((d) => clientOperation(d.data())));
          setSource(
            s.metadata.fromCache
              ? "Cached journal — server not confirmed"
              : "Server-confirmed journal",
          );
        } catch (e) {
          setMessage("Invalid journal: " + String(e));
        }
      },
      (e) => setMessage("Journal unavailable: " + String(e)),
    );
    const unsubscribeEvent = onSnapshot(
      doc(db, "competitions", competitionId, "events", "grenade"),
      (snapshot) => {
        const e = snapshot.data();
        setEventOpen(
          e?.state === "open" &&
            e?.kind === "numeric" &&
            e?.minimum === 0 &&
            e?.maximum === 100,
        );
        if (e?.state !== "open")
          setMessage(
            "Station is not open for new attempts. Retained backlog can sync during closing.",
          );
      },
      (e) => {
        setEventOpen(false);
        setMessage(String(e));
      },
    );
    return () => {
      unsubscribeMember();
      unsubscribeTeams();
      unsubscribeJournal();
      unsubscribeEvent();
    };
  }, [user]);
  useEffect(() => {
    if (!user || !store) return;
    let stopped = false,
      running = false;
    const ns = namespace(competitionId, user.uid);
    async function refresh() {
      if (running || stopped) return;
      running = true;
      try {
        if (!paused && navigator.onLine)
          await uploadPass(
            store!,
            ns,
            remoteFor(user!.uid),
            browserOwnership,
            () => !stopped && auth.currentUser?.uid === user!.uid,
          );
        if (!stopped) setRows(await store!.list(ns));
      } catch (e) {
        if (!stopped)
          setMessage("Sync stopped; captures retained. " + String(e));
      } finally {
        running = false;
      }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 1000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [user, store, paused]);
  const result = resolve(journal.filter((op) => op.teamId === team));
  const selected = teams.find((t) => t.id === team);
  async function capture(kind: Operation["kind"], parents: string[] = []) {
    if (
      !store ||
      !user ||
      !member ||
      !selected ||
      busy ||
      (kind === "result.submit" && !eventOpen)
    )
      return;
    // Capture intent before any await; this is numeric input, never a timing source.
    const raw = {
      opId: crypto.randomUUID(),
      competitionId,
      eventId: "grenade",
      teamId: team,
      schemaVersion: 1,
      rulesVersion: "practice-v1",
      actorUid: user.uid,
      deviceId: "pending",
      sessionId,
      capturedAtClientMs: Date.now(),
      kind,
      parentIds: parents,
      payload:
        kind === "result.void"
          ? { reason: "Own undo requested" }
          : { value: score.trim() === "" ? NaN : Number(score), reason },
    };
    setBusy(true);
    setMessage("LOCAL_SAVE_IN_PROGRESS");
    try {
      const op = operationSchema.parse({
        ...raw,
        deviceId: await store.deviceId(),
      });
      await store.capture(op);
      if (auth.currentUser?.uid !== user.uid) return;
      void store
        .list(namespace(competitionId, user.uid))
        .then(setRows)
        .catch(() =>
          setMessage(
            "Saved locally; queue display failed. Retain this browser and export for review.",
          ),
        );
      setMessage(
        kind === "result.void"
          ? "VOID_PENDING — saved locally; outcome awaits sync/review"
          : "SAVED_LOCALLY_PENDING_SYNC",
      );
      if (kind !== "result.void")
        setLast({ op, deadline: performance.now() + 15000 });
      else setLast(undefined);
    } catch (e) {
      setMessage(
        "NOT_SAVED_LOCAL — use paper backup or correct input. " + String(e),
      );
    } finally {
      setBusy(false);
    }
  }
  void tick;
  return (
    <>
      <header>
        <span className="badge">DRAFT POLICY / PRACTICE</span>
        <h1>Warrior Challenge</h1>
        <p>Durable scoring trial · M1 · synthetic teams only</p>
      </header>
      <main>
        <section aria-label="Readiness">
          <h2>Device readiness</h2>
          <p>{storage}</p>
          <p>
            {navigator.onLine
              ? "Browser reports online (not proof of backend reachability)"
              : "Browser reports offline"}
          </p>
          <p>{source}</p>
          <p>Schema 1 · practice-v1 · official start disabled</p>
        </section>
        {!user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void signInWithEmailAndPassword(auth, login, password).catch(
                (e) => setMessage(String(e)),
              );
            }}
          >
            <h2>Practice sign in</h2>
            <label>
              Email
              <input
                type="email"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button>Sign in</button>
            <p>
              First sign-in needs the local Auth emulator. See README for
              synthetic accounts.
            </p>
          </form>
        ) : (
          <>
            <section>
              <h2>
                {member?.role === "admin" ? "Admin review" : "Assigned station"}
              </h2>
              <p>{user.email} · Practice numeric station</p>
              <button onClick={() => void signOut(auth)}>
                Sign out (retain captures)
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={paused}
                  onChange={(e) => setPaused(e.target.checked)}
                />{" "}
                Pause uploader for practice outage
              </label>
            </section>
            <section>
              <h2>Record a result</h2>
              <label>
                Team
                <select
                  value={team}
                  disabled={busy}
                  onChange={(e) => {
                    setTeam(e.target.value);
                    setLast(undefined);
                  }}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.bib} — {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <h3>Selected: {selected?.label ?? "No roster downloaded"}</h3>
              <label>
                Score (whole points, 0–100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </label>
              <label>
                Correction / resolution reason
                <textarea
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                disabled={!store || !member || !selected || !eventOpen || busy}
                onClick={() => void capture("result.submit")}
              >
                Confirm and save score
              </button>
              {last &&
                last.op.teamId === team &&
                performance.now() < last.deadline && (
                  <button
                    disabled={busy}
                    onClick={() => void capture("result.void", [last.op.opId])}
                  >
                    Undo this entry (
                    {Math.max(
                      0,
                      Math.ceil((last.deadline - performance.now()) / 1000),
                    )}
                    s)
                  </button>
                )}
              <p>
                Accepted outcome:{" "}
                <strong data-testid="outcome">
                  {result.state}
                  {result.value !== undefined ? " · " + result.value : ""}
                </strong>
              </p>
              {result.state === "VOID" &&
                result.heads[0].actorUid === user.uid && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void capture("result.correct", [result.heads[0].opId])
                    }
                  >
                    Replace own void (reason required)
                  </button>
                )}
              {member?.role === "admin" && result.heads.length === 1 && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void capture("result.correct", [result.heads[0].opId])
                  }
                >
                  Append official correction
                </button>
              )}
              {member?.role === "admin" && result.heads.length >= 2 && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void capture(
                      "result.resolve",
                      result.heads.slice(0, 4).map((h) => h.opId),
                    )
                  }
                >
                  Resolve {Math.min(4, result.heads.length)} competing heads
                </button>
              )}
              <h3>Immutable accepted history</h3>
              <ul>
                {journal
                  .filter((o) => o.teamId === team)
                  .map((o) => (
                    <li key={o.opId}>
                      {o.kind} ·{" "}
                      {"value" in o.payload ? o.payload.value : "VOID"} ·{" "}
                      {o.actorUid}
                      <br />
                      <code>{o.opId}</code>
                      <br />
                      Parents: {o.parentIds.join(", ") || "root"}
                      <br />
                      Reason: {o.payload.reason || "—"}
                    </li>
                  ))}
              </ul>
            </section>
            <section>
              <h2>Retained device captures</h2>
              <button
                onClick={() => {
                  if (store)
                    void store
                      .export(namespace(competitionId, user.uid))
                      .then(download)
                      .catch((e) => setMessage(String(e)));
                }}
              >
                Export private outbox JSON
              </button>
              <p>
                Includes this account’s synced, pending and rejected captures.
                Other accounts’ queues remain retained separately.
              </p>
              <ul>
                {rows.map((row) => (
                  <li key={row.key}>
                    <strong>{row.state}</strong> · Team {row.operation.teamId} ·{" "}
                    {row.operation.kind}
                    <br />
                    <code>{row.operation.opId}</code>
                    {row.error && (
                      <p role="alert">
                        {row.error} · Original payload retained. Export for
                        admin review.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        <section role="status" aria-live="polite">
          <strong>{message || "Ready for a prepared practice session."}</strong>
        </section>
      </main>
      <footer>
        Not event-ready. Timing, Ruck, publication and official controls are
        later milestones.
      </footer>
    </>
  );
}
