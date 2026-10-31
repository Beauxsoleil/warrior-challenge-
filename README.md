# warrior-challenge-

Warrior Challenge: a practice-only first scoring slice, not an event-ready app.
All fixtures are synthetic. PIBASE integration is prepared but not deployed;
default development still uses local emulators. No live data or billing changed.

Implemented: email/password emulator login; assigned numeric station; explicit
IndexedDB save; immutable journal; retained rejected outbox/export; competing
result graph; admin resolution; own undo and linked replacement. The complete
competition, timing, Ruck, official controls and public TV remain later milestones.

## Local setup

1. Install Node **24.22.1** (see `.nvmrc`) and Java **21+**. Confirm `node -v`
   and `java -version`. The pinned Firebase CLI rejects Java 17.
2. Run `npm ci`. No credentials or `.env` values are needed for the default demo target.
   `.env.example` documents the separate, explicitly acknowledged PIBASE build.
3. Terminal one: `npm run emulators` (Auth 9099, Firestore 8080, loopback only).
4. Terminal two, from the repo:
   ```sh
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed:emulator
   npm run dev
   ```
5. Open `http://127.0.0.1:5173` on the **same machine**. A phone's localhost
   is not this machine. Remote preview is deliberately blocked; don't expose
   emulators publicly or switch to production to make a preview work.
6. Use `scorer-a@practice.invalid`, `scorer-b@practice.invalid` or
   `admin@practice.invalid`. Synthetic password: `synthetic-practice-only`.
   Open independent browser profiles for the two scorers.

Seed is fixed to a demo project and exact loopback endpoints. It resets synthetic
setup documents to practice/open, but does not delete journal records. Restart
without imported data for a fresh manual session. Automated tests clear only the
fixed emulator demo data. Never run tests against an event project.

## First practice

Sign in, wait for roster/storage readiness, select a team and confirm a 0–100
integer score. LOCAL_SAVE_IN_PROGRESS must precede local save acknowledgement;
` synced ` appears only after server acceptance. Pause uploader or disconnect,
record the same team from both profiles, reconnect: accepted outcome must be
CONFLICT. Admin supplies a full score/reason and resolves the heads. Inspect
all branches. Undo within the short UI window appends a void; replacing your own
void requires a linked correction/reason. Export the private outbox before any
manual recovery. Account switching retains original queues separately.

## Checks

```sh
npm run verify            # lint, strict types, unit, local-store integration, build
npm run test:rules        # owns local Firestore emulator; stop manual emulator first
npx playwright install chromium webkit
npm run test:e2e          # owns Auth/Firestore emulators and local Vite server
```

Linux browser dependencies may require `npx playwright install-deps` on your own
machine. Commands also exist individually: `npm run lint`, `npm run typecheck`,
`npm run test:unit`, `npm run test:integration`, `npm run build`.
CI runs inexpensive checks, emulator Rules and Chromium only; WebKit is a local
release check. No secrets/deploy steps. See docs/implementation-status.md for
actual evidence and remaining limitations, not just configured test commands.

## Limits and next milestones

This slice uses one numeric practice station and two synthetic teams. No PWA
service worker yet; no promise of offline cold launch. Firestore cache is explicit,
but the durable outbox is separate. No timer/real-time guarantees, full ranking,
policy approval, official lock/reopen UI, publisher, TV, or full restore yet.
A permanently lost account currently needs a separately designed local recovery
export; do not clear its browser. This is a known next-hardening task.

M2 adds full outcome/ranking policies and genuine official controls; M3 timing
and Ruck; M4 publisher/TV; M5 whole-event recovery/accessibility/quota validation;
M6 physical rehearsal and organizer approval. Build/test completion is separate
from policy approval and event readiness.

Production deployment is intentionally not supplied as a one-command action for
this incomplete build. Later release work must explicitly validate owner-approved
Spark project, rules/tests, HTTPS device rehearsal, export/rollback and build
freeze, then obtain deployment approval. Do not merge this draft automatically.

Documentation: [architecture](docs/architecture.md), [contract](docs/data-contract.md),
[offline/sync](docs/offline-sync.md), [security](docs/security.md),
[policy](docs/scoring-policy.md), [runbook](docs/runbook.md),
[backup](docs/backup-restore.md), [status](docs/implementation-status.md).

## Shared PIBASE project

See [PIBASE integration](docs/pibase-integration.md). The prepared live target is
`pi-base-a3a09`, with data under `warriorChallenges/{competitionId}`. Memberships,
Auth instance and local outbox are separated from PIBASE recruiting access.
The combined Rules must be reviewed against live state before activation.
