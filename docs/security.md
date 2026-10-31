# M1 security boundary

Deny by default. Rules emulator suite exercises real SDK calls, not UI mocks.

| Actor | Read | Create | Update/delete |
| --- | --- | --- | --- |
| Unauthenticated | None in M1 | None | None |
| Active scorer | Own membership, roster/config, assigned station journal | Assigned submits, own void, own-void replacement | None |
| Active admin | Private practice data | Submit/correct/void/2-4-parent resolve | None |
| Project owner | Privileged maintenance outside app | Not restricted by client Rules | Not restricted by client Rules |

Queries include eventId equality. Unfiltered scorer journal queries are denied.
Absent-ID reads allow idempotency checks but do not disclose existing forbidden
station records. Parents must be accepted, same entity/version and result family.
Rules cannot prove no other descendants exist; delayed branches remain evidence.
Journal create validates path identity, actor, keys, types, bounds, eligible roster
version, open/closing station, practice mode and request.time. Official mode is
denied, even for admins. Policy/member/setup mutations are denied to all clients.

Maximum unique dependent documents for four-parent create: member + competition
+ event + team + four parents = 8 (below the per-write 10 access-call limit).
Repeated gets may be cached by Rules. Four-parent allow test exercises the real
expression budget; initial repeated parent function expansion exceeded 1000
expressions and was replaced with a local parent binding. App uploads one op
per transaction; no unbounded batched writes. Rules counters are not billing
measurements. Production quota must include dependent reads and transaction reads.

No public read/write path exists until M4. Do not add a public journal. Future
publication envelope and linked metadata must be enforced atomically; strict
runtime per-row sanitization plus documented nested Rules limits are required.

Synthetic account setup uses fixed loopback emulators and demo project ID;
there is no production switch. rules-unit-testing is a development dependency,
never imported by src. No Admin SDK/service accounts, real roster, App Check
secrets or auth tokens are exported. VITE variables are public. There is no
production deployment workflow or credentials in CI.
