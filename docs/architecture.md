# Architecture / M0 decision

Inspected 2026-10-31: Beauxsoleil/warrior-challenge-, default main,
base commit 6eab2fcebb137b2ebe63092aa4272946ac0c3206. Only README.md existed;
no AGENTS.md, application, package manager, tests or CI existed. Local clone
was clean before branch feat/m1-durable-scoring. README heading is preserved.

React + strict TypeScript + Vite; modular Firebase Web SDK; idb; Zod;
Vitest, Rules Unit Testing and Playwright. Exact dependencies and npm lockfile.
Node 24 LTS; Java 21. No real Firebase project has been selected or created.

Capture -> IndexedDB outbox -> immutable private journal -> deterministic
resolver. The M1 UI implements numeric capture and private review only.
Admin-derived ranking -> atomic sanitized publication -> board is planned M2/M4.
The entire configured event (up to 15 stations) remains the product goal.
One numeric practice station is a checkpoint, not a scope reduction.

Admins are trusted adjudicators, not a server guarantee of honest arithmetic.
Firestore Rules restrict application clients, not project owners. Device IDs
are correlation labels. Unsynced captures can be lost with device destruction.
The public board must never authenticate as a private workstation.

No database substitution: owner permits considering alternatives, but no
existing infrastructure or measured advantage warrants changing the specified
Spark architecture. No billing, Functions, Cloud Run, Storage or App Hosting.
