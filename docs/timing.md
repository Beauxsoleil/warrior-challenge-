# Timing — planned M3, not available

No timer exists in this checkpoint. Required injectable clock model captures
performance.now synchronously on START/FINISH, ceil-normalizes elapsed to integer
milliseconds, then applies approved upward comparison precision. Display ticks
do not measure time. START/outbox/active-run/sequence commit atomically.

Continuous -> interrupted on new clock context, uncertain lifecycle or clock
delta disagreement; never automatically back to continuous. Wall-clock recovery
can only be estimated. Independent official evidence may authorize
verified_from_independent_evidence, with preserved history/reason. Unavailable
elapsed time is distinct from verified finish order. Wake-lock request/release
must be visible and is not a sleep guarantee. Physical tests remain blank.
