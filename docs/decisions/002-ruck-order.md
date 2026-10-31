# ADR 002 — Canonical Ruck order (design only, 2026-10-31)

Proposed for M3: primary stream marks have local atomically allocated sequence,
independent timing quality and optional later assignment operations. Assignment
forks use explicit resolution; no last-write-wins. Backup/emergency streams are
retained evidence and excluded from automatic scoring until adjudicated.

Unknown earlier mark, sequence gap, duplicate team, ambiguous group, assignment
fork or unapproved authority overlap withholds affected Ruck scoring (conservative
first implementation: all Ruck points) rather than promoting known finishers.
Voids are explicit linked decisions. Order-only evidence never invents elapsed
time. Handoff records old/new boundary and epoch with physical evidence.

Implement and test this model before building the Ruck UI. No timing/Ruck code
is present in M1; organizer finish/equipment/evidence policies remain unapproved.
