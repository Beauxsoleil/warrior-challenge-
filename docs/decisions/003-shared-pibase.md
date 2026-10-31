# ADR 003 — Use existing PIBASE project with separate authority

Accepted as repository preparation, 2026-10-31, on owner's request.
Use pi-base-a3a09 default database; new warriorChallenges root. Share project Auth
and quota, not app roles. Named Firebase app and project-qualified IndexedDB
prevent accidental local context reuse. Demo remains the default target.

Combined least-privilege Rules must protect both apps. PIBASE's old root policy
allowed every signed-in identity to read/write recruiting data, so retaining it
as a deploy option is unsafe once volunteer accounts exist. Replace it with a
mirror of the configured strict policy plus Warrior-only paths. Verify original
owner/assistant/kiosk behavior and deny cross-app inheritance in emulators.

Tradeoff: quota, billing and project-owner administration remain shared. Live
console state may differ from repo. Require review of deployed Rules, current
access enrollment and plan before activation; do not infer live state from Git.
This ADR supersedes the earlier unselected-project state, not official policy
approval. No migration of participant/applicant data or real-data seed is needed.
