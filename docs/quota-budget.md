# Access plan and current documentation

Checked 2026-10-31. No real-project usage or quota measurements were performed.
M1 is emulator-only. Baseline remains Spark, email/password, Standard Firestore,
classic Hosting; no billing or paid resources.

Implemented access plan: own membership listener, roster listener, one assigned
event document listener, one event-filtered journal listener. Uploader existence
read + dependency reads + transaction existence read + create; successful repeat
needs only existence read and payload comparison. Synced/review entries generate
no further uploads. Backoff and parent waiting can still incur reads; M5 must
model reconnects, retries, Rules reads and retention. Admin in this checkpoint
reads the same one station; the global publisher is not implemented.

Future workload worksheet (fill from measured rehearsal): initial reads ___;
listener updates ___; reconnects ___; dependent Rules reads ___; upload retry
reads ___; publication transactions ___; TV downloads ___; exports/final fresh
reconciliation ___; writes ___; bytes ___; App Check assessments ___. Target
expected profile approximately <=35,000 reads/day, not a capacity guarantee.

Sources:
- https://firebase.google.com/pricing — Spark no payment method; provider App
  Check quotas apply. General table still says Hosting 360 MB/day.
- https://firebase.google.com/docs/hosting/usage-quotas-pricing — product page
  says 10 GB/month transfer. Documentation discrepancy remains; verify console
  with owner before production. Never auto-enable billing at exhaustion.
- https://firebase.google.com/docs/firestore/manage-data/enable-offline — web
  memory cache default; explicit persistentLocalCache and multi-tab manager used.
- https://firebase.google.com/docs/emulator-suite/install_and_configure — general
  prerequisite page still lists older minimums; installed CLI 15.34.2 explicitly
  rejects Java <21. Use Java 21, not the general page's older minimum.
- https://firebase.google.com/docs/emulator-suite/connect_firestore — emulator
  connection / demo project guidance.
- https://nodejs.org/en/about/previous-releases — Node 24 listed as LTS; pinned
  tested runtime 24.22.1.

SDK/tool versions resolved from npm with exact versions in package-lock.json.
Before implementing timing/PWA/App Check, verify their current official references
and record dates. This is not a complete production pricing or browser audit.
