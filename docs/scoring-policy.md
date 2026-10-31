# Draft policy, not approval

src/domain/policy.ts records proposed defaults. Official opening/publication is
hard blocked in M1 UI/Rules. No organizer decisions are inferred from tests.

M2 will freeze eligible N=1..80 per division (not number of valid results).
Points=N-place+1. Ordinal competition places 1,2,2,4 under either payout.
For k tied at p: competition pointsHalf=2*(N-p+1); split pointsHalf=first+last.
Pending/conflict/unverified awards are null; DNS/DNF/event-DQ zero if approved.
Award eligibility, valid completions, accounted-for and required counts differ.
Overall: points, wins (shared first counts), Ruck place, shared competitive place.
Opaque IDs stabilize display only. Timed precision/round-up must be approved
before comparison. Ruck ranking uses defensible observed order, not timestamps.

Approval gate design: immutable version record, authenticated approver and
accepted server time, frozen roster reference, explicit approvals of every
relevant rule, rejected post-open edits except an audited revision/reprocess.
These controls and all-terminal outcome schemas are NOT implemented in M1.

M2 regression target: exact six-team fixture in owner prompt totals A16,C15,
B14,D10,E5,F4. M1 contains only graph tests, no claim of full scoring completion.
