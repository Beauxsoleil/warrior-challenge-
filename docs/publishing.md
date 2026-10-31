# Publication — planned M4

No publication writes or public reads are permitted in M1. Required implementation:
server-backed complete input baseline; deterministic projection; private canonical
fingerprint; captured generation, authority session/epoch and expected sequence;
online transaction rechecks control/config/sequence and writes sanitized public
snapshot plus new immutable private metadata atomically. Never rebase stale rows
onto new authority/sequence inside retry. No publication outbox.

Takeover is deliberate online audited control transition. TV stores last downloaded
public snapshot and displays publication age separately from reader connection.
No liveness heartbeat. Sanitizer must construct every field and validate every
row; Rules envelope alone cannot validate arbitrary nested arrays. 80-team size
target <100 KiB needs a measured fixture before M4 completion.
