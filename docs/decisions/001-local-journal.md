# ADR 001 — Practice journal and online-only transport (2026-10-31)

Accepted for M1. Use idb rather than Dexie: a small wrapper exposes explicit
transaction completion and needs only three stores here. Preserve independent
outbox, append-only backend journal and complete-outcome correction graph.

Transport uses online Firestore transactions rather than offline setDoc.
Reason: a single app retry owner is easier to reason about than two persisted
mutation queues. Tradeoff: more reads per upload; include both preflight and
transaction reads in quota estimate. Offline capture itself never awaits these.

Locks are Web Locks (origin/competition/actor), not Firestore persistence locks.
No fallback leader algorithm is claimed. Unsupported clients can retain/export,
but cannot upload; physical supported-browser matrix remains pending.

Do not auto-create official config or use production project credentials.
M1 narrows implementation to numeric 0-100 practice; all remaining event types
remain explicit milestones. No service worker until controlled-update and
migration safety can be tested; this build is not yet an installable offline PWA.
