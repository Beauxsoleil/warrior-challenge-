# PIBASE shared-project preparation — 2026-10-31

Owner selected the existing PIBASE project. The integration is implemented on a
feature branch; no live Rules, users, data, billing or hosting were changed.

Target: `pi-base-a3a09`, default Firestore database. Source of public client
configuration: Beauxsoleil/PIBASE firebase-config.js at
`1a28b17e2f51006a040a4f852f2d2a73460100be`. Its apiKey/appId are public project
identifiers, not authorization. No credentials were copied. Keep the two apps'
websites separate; sharing Firebase does not require merging their UIs/repos.

## Namespace and authority

Every Warrior Firestore path is now `warriorChallenges/{competitionId}/...`,
including Rules parents, roster, membership, journal and test fixtures. Logical
competitionId fields stay unchanged. PIBASE's root recruiting `events` collection
is separate from Warrior's nested `events`. No mutable result shortcut was added.

PIBASE membership uses `access/{uid}`; Warrior uses per-competition `members/{uid}`.
Roles do not inherit across apps. The owner can deliberately have both memberships,
but volunteer accounts should have only Warrior membership. Kiosk accounts get
no Warrior authority automatically. Shared Authentication is not a role grant.

Rules are the exact combined membership-based PIBASE policy plus the tested
Warrior journal policy. Source of truth for live deployment is PIBASE's
`security/muse/firestore.rules`. PIBASE root Rules now mirror that policy instead
of retaining the unsafe signed-in-only legacy version. This repo's copy is for
shared-policy emulator tests; never deploy an older standalone Warrior ruleset
into PIBASE. Review/synchronize both copies on future Rules changes.

## Runtime and local state

Default target stays emulator, requiring localhost/127.0.0.1. Target selection is
strict and never falls back to production for a typo or unreachable backend.
An authorized PIBASE build uses public configuration from src/firebase/target.ts:

```sh
VITE_FIREBASE_TARGET=pibase VITE_PIBASE_INTEGRATION_ACK=shared-rules-reviewed npm run build
```

The acknowledgement is a deliberate build switch, NOT proof of live policy
verification or a security boundary. Firestore Rules enforce authorization.
It does not deploy anything. A named `warrior-challenge` Firebase app avoids
PIBASE's default Auth/cache instance. IndexedDB database name includes project ID
and namespace, keeping demo outboxes from uploading to PIBASE. The old
`warrior-challenge-v1` database is left untouched. Export its captures using the
M1 build before retiring it; no automatic migration/actor rewrite is attempted.
Outbox exports now identify their local database. No existing cloud data moved.

## Before activation

Follow PIBASE's `security/warrior-challenge/README.md`:
- Compare/save the ACTUAL deployed Rules; current console state is unverified.
- Verify enabled owner/kiosk access records before any strict Rules deployment.
- Confirm project billing plan, shared quota headroom, Auth domains and any
  App Check enforcement. None were changed or measured here. Existing Blaze
  billing would not become Spark by adding this namespace.
- Approve/deploy the exact combined Rules from PIBASE only, then smoke-test the
  live phone/kiosk and volunteer denial using synthetic data.
- Owner pre-creates dedicated Auth users and practice config/roster/memberships.
  Never point seed:emulator at PIBASE. It still refuses non-loopback targets.
- Authorize a separate Warrior app deployment and practice smoke test. Current
  M1 UI remains practice-only, competitionId=practice, numeric station grenade,
  0-100 bounds; it is not a real-event release or all-station implementation.

There is no real-data import, Firebase account creation, new database, billing
change, hosting deployment or live Rules publication in this change.

## Tests and risks

The combined policy is tested by both repos: existing PIBASE role regression
suite plus Warrior isolation/dual-enrollment tests; Warrior journal Rules suite;
strict target/default and local database separation unit tests; existing outbox
integration and independent-client Chromium flows. See implementation-status.md
for exact current results. Phone/kiosk behavior in the deployed project is still
unverified. Physical iOS/Android acceptance and full event readiness remain open.
