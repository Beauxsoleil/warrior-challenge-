# Current follow-up: shared PIBASE integration (2026-10-31)

Branch: feat/pibase-partition, based on the M1 draft branch. Companion PIBASE
branch: feat/warrior-challenge-partition, based on main
1a28b17e2f51006a040a4f852f2d2a73460100be.

Prepared target pi-base-a3a09 with warriorChallenges namespace and separate
memberships, named Auth instance and project-scoped local stores. Combined Rules
preserve PIBASE strict policy; old permissive root Rules replaced with an exact
mirror in PIBASE. No production changes, live enrollment inspection or billing
inspection occurred. See pibase-integration.md for activation prerequisites.

Actual checks so far: npm run verify (10 unit + 7 integration, lint/typecheck/build)
passed; combined Warrior Rules 9 passed; PIBASE role/isolation tests 15 passed;
PIBASE shared helpers/PWA/reminder smoke scripts passed. A PIBASE-target build
also passed without contacting Firebase. Final shared Rules rerun: Warrior 9 passed; PIBASE 15 passed.
All 5 Chromium browser flows passed against the new namespace (21.5 seconds).
Both Rules copies and PIBASE root mirror are byte-identical.
The M1 milestone limitations still apply; this does not make the event ready.

---

# Implementation checkpoint — 2026-10-31

Repository: Beauxsoleil/warrior-challenge-. Branch: feat/m1-durable-scoring.
Baseline: main at 6eab2fcebb137b2ebe63092aa4272946ac0c3206 (README only).
No existing app or unrelated working-tree changes were replaced. No AGENTS.md
found. No production Firebase project, deployment, billing or real data used.

## Milestone checklist

- [x] M0 discovery, safe branch, pinned scaffold, initial contracts/ADRs/checklist.
- [x] M0 marked practice policy object and hard block on official capture.
- [x] M1 emulator email/password + station assignment + numeric practice capture.
- [x] M1 IndexedDB commit acknowledgement, retained independent outbox/export.
- [x] M1 real create-only Rules, exact fields, assigned roles and accepted parents.
- [x] M1 retry ID/payload preservation, collision detection, dependency handling.
- [x] M1 deterministic branches, admin complete-outcome resolution, own undo/replacement.
- [x] M1 two independent offline browser clients, both reconnect orders (Chromium).
- [x] M1 actual Web Lock contention across two tabs (Chromium).
- [x] M1 rejected capture survives reload/account switch; private export downloads.
- [ ] WebKit browser acceptance (environment dependencies unresolved).
- [ ] M2 full ranking/status/eligibility engine and exact six-team fixture.
- [ ] M2 approved/frozen policies/roster, closing/reconciliation/lock/reopen controls.
- [ ] M3 timing, all Ruck evidence/assignment/order/handoff paths.
- [ ] M4 single publisher, atomic private/public projection, TV cache and paging.
- [ ] M5 whole-event forms, all configured events, CSV, full export/restore,
      controlled PWA updates/migrations, full-scale quota/accessibility validation.
- [ ] M6 actual hardware/venue rehearsal and organizer sign-off (owner required).

M1 checkpoint passes the implemented Chromium/local/Rules gate. It does NOT
complete the application or approve it for any official event. Practice bounds
are one numeric 0-100 station and two synthetic teams; future scope remains
all required configured stations (up to 15), not a one-station product.

## Actual command evidence

Run locally with Node 24.22.1, npm 11.9.0 and downloaded Temurin JRE 21.0.13.
Dependencies resolved/pinned in package-lock.json, including Firebase 13.1.0,
CLI 15.34.2, idb 8.0.4, Vite 8.3.5, TypeScript 6.0.3, Playwright 1.64.1.

| Command | Actual result |
| --- | --- |
| npm install (exact deps), npm install --package-lock-only | Succeeded; npm transitive deprecation notices recorded in console, not a security audit |
| npm run verify | Passed lint, strict typecheck, 7 unit + 7 local integration tests, production build |
| npm run test:rules (Java 21 on PATH) | 9 passed against Firestore emulator 1.22.0 Standard |
| emulator exec: seed then Playwright --project=chromium | 5 passed, 22.2 seconds; Chrome Headless Shell 156.0.8078.4 |
| Playwright Chromium --grep "rejected intent" after export-content assertion | 1 passed; downloaded JSON parsed and original ID/payload/rejection verified |
| Playwright --project=webkit --max-failures=1 | Blocked at browser launch by missing host libraries; 1 failed, 4 not run |
| git diff --check | Passed |

The browser command used the same CLI command documented below, with environment
selectors for this sandbox's locally downloaded Java and Chrome executable:

```sh
npx firebase emulators:exec --only auth,firestore --project demo-warrior-challenge \
  'npm run seed:emulator && npx playwright test --project=chromium'
```

`CHROMIUM_EXECUTABLE_PATH` is an optional local runtime override. Normal installs
use Playwright's browser cache. Both tests use the real Auth/Firestore emulators;
no production secret or mock cloud acceptance. Network warnings during intentional
offline intervals and permission-denied during the locked-event test are expected.

## Failures found and corrected

- Aborted/duplicate IndexedDB writes initially left unhandled completion
  rejections. Capture now observes request and transaction completion failures;
  tests fail honestly without unhandled rejections.
- Four-parent Rules validation initially exceeded 1000 expression evaluations.
  Binding each parent once brought the real four-parent test within the budget.
- General Firebase install docs listed old Java minimums; current CLI rejected
  installed Java 17. System package install failed in this sandbox; a local JRE
  21 download was used without changing production infrastructure.
- Playwright CDN browser download was truncated. Chrome was obtained from its
  official Google storage URL with a resumed transfer; version was verified.
  WebKit downloaded but reports missing host shared libraries. No WebKit pass
  or physical iOS acceptance is claimed.
- Build emits a >500 kB chunk advisory (~744 kB uncompressed Firebase/app chunk).
  This is not a failed build; optimize before PWA/phone release.

## Residual limits and next smallest step

No service worker/offline cold shell yet; same-device cached data is not a promise
of storage durability. SDK persistence is explicit; app outbox startup failure
is a no-go. Physical quota exhaustion, OS/browser eviction, device sleep and
power loss remain untested. No full ranking, clocks, official controls, sanitized
publisher, public board or lossless full restore exists yet. Public/control paths
are denied, rather than insecure placeholders. Device migration tests await a
second database version. No live quota/cost or latency-to-TV measurement exists.

Account switch retains queues, but exporting a permanently inaccessible prior
account's namespace needs an explicit local recovery UI. Role-revoked rejected
records can be exported while the original account is still authenticated.

Next: review this M1 draft; add the full policy-driven outcome/ranking engine with
the exact six-team fixture and terminal-vs-withheld semantics, then M2 audited
approval/freeze/closing/reopening. First harden local recovery for lost account
access and run WebKit on a host with its dependencies. Do not jump to timer/TV
polish before these controls. Keep production and official readiness blocked.

## 2026-10-31 — Pages repair checkpoint

Observed live HTML serving raw /src/main.tsx from repository root. Added explicit
PIBASE Pages build, repository asset base, manual-only dist deployment workflow,
and a production-bundle Chromium smoke test in PR verification.

Executed `npm run test:pages`: 1 passed (login render, local database readiness,
reload, no page/HTTP errors). External requests were blocked; no live data touched.
Deployment and live login remain pending. See docs/github-pages.md for the required
Pages source setting and owner-authorized publication steps. No Rules changes.

Executed `npm run verify`: lint, strict typecheck, 10 unit tests, 7 local-store/sync
integration tests and standard build passed. Existing large-chunk advisory remains.
Rules and emulator end-to-end tests were not rerun locally for this frontend
deployment-only change; CI retains both gates.
