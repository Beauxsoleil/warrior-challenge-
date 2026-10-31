> Shared-project update: see [PIBASE integration](pibase-integration.md).
> Warrior paths use `warriorChallenges`; the combined Rules also preserve PIBASE permissions.

# M1 contract (implemented subset)

Runtime source of truth: src/domain/operations.ts; server mirror: firestore.rules.
Unknown top-level and payload keys are rejected. IDs are ASCII letters, digits,
underscore/hyphen, 1-80 characters. Entity identity is the JSON tuple
[competitionId,eventId,teamId], not an ambiguous delimiter concatenation.

Journal required keys: opId, competitionId, eventId, teamId, schemaVersion=1,
rulesVersion=practice-v1, actorUid, deviceId, sessionId, capturedAtClientMs,
kind, parentIds, payload, plus top-level receivedAt server timestamp on backend.
No receivedAt is manufactured in the local operation. Safe integer wall metadata
is untrusted. Payload scores are integers 0-100 in this first numeric fixture.

submit: zero parents; {value,reason}. correct: one parent; complete {value,reason}.
void: one parent; {reason}. resolve: two-four distinct parents; {value,reason}.
Reasons max 500 characters; non-submit operations require a reason. Runtime
rejects whitespace-only correction reasons. Rules require nonempty text (not
trimmed); trusted reviewer assesses meaningfulness. No result patches or totals.
The resolver accepts result-family operations only; timing/control kinds must
use separate schemas in future versions. Accepted dependencies must exist.

warriorChallenges/practice: mode, rulesVersion, rosterVersion, policyApproval.
teams/{id}: label, string bib, eligible, rosterVersion.
events/{id}: name, numeric kind, minimum=0, maximum=100, state.
members/{uid}: active, scorer/admin role, eventIds.
M1 client writes only journal. All setup records are synthetic emulator seeds.
Unknown paths and all publication/control/approval writes are denied.

IndexedDB v1: outbox (compound serialized namespace/op ID key, namespace index),
metadata (installation device ID), configuration (reserved for M2 explicit
readiness bundles). SDK separately persists assigned roster/config snapshots.
M1 does not claim cached shell/offline cold launch or complete config readiness.
Outbox contains immutable operation plus mutable state/attempt/error metadata.

Future public and control schemas are intentionally NOT accepted by Rules until
M2/M4 tests implement the complete contracts in the owner's assignment.
