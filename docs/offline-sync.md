# Local acknowledgement and upload

A handler creates its ID/intent before awaiting storage/network. idb add and
transaction completion must both succeed before SAVED_LOCALLY_PENDING_SYNC.
A failed write is NOT_SAVED_LOCAL; use paper. Duplicate local IDs never overwrite.
Transaction errors and completion rejections are both observed.

Outbox namespace is competition+actor, with original session on each operation.
Sign-out does not erase it. Account switch cannot substitute the author.
Data is not encrypted. Only the original actor's queue is displayed/exported
while signed in; recovery after permanent account loss needs an owner-approved
local export workflow (not implemented). Browser profile access can read data.

Web Locks grants a single upload pass per namespace across same-origin tabs.
No Web Locks means no uploading, with retained capture/export. SDK multi-tab
caching is separate. Every online transaction checks the original actor again.

Transport states: pending, waiting_for_dependency, upload_in_flight, synced,
needs_review. Save-in-progress/failure are handler states because a failed
transaction cannot reliably persist its own failure. Void is its own journal
operation; void_pending message is separate from adjudicated VOID.

Read existing ID from server; exact canonical client payload match means already
accepted. Ignore only receivedAt during comparison. A mismatch is retained for
review. Wait for accepted parents; independent chains progress. Transaction
rechecks existing ID before creation and uses top-level serverTimestamp.
Never use setDoc outside the ONLINE transaction for app captures. This avoids
creating an SDK offline write queue alongside the app outbox. Transaction retry
always reuses the captured ID/payload. Acceptance followed by a crash before
local acknowledgement is recovered by the next server read.

Transient unavailable/deadline/aborted/unauthenticated/quota errors back off
exponentially up to 60 seconds. Unknown, shape, permission and integrity errors
stop in needs_review. No actor/epoch/parent rewriting. No service-worker upload
or navigator.onLine correctness claim. Current pass visits the retained queue
and skips synced/review rows; retention compaction is future work.

Short undo is a 15-second monotonic UI convenience, not a server-enforced offline
deadline. Rules allow own-void within open/closing intake independent of wall
time. Own-void replacement links to that void. Racing branches remain conflicts.
