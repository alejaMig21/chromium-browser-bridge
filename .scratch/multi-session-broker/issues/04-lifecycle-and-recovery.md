# 04: Broker lifecycle and recovery

**What to build:** the broker stops by itself after a long period with no sessions; if it was killed or crashed, the next `browser_attach` starts a new one and the extension reconnects; a session that exits or crashes releases its tabs; closing one session's browser access does not cut another's; tests only kill a broker they started themselves.

**Blocked by:** 02

**Status:** resolved

- [x] Broker exits after the idle period with zero sessions (period configurable for tests) and records its process id for ownership-checked cleanup.
- [x] After killing the broker, a session's next `browser_attach` recovers and works.
- [x] A session killed without `browser_close` frees its tabs for another session.
- [x] `browser_close` in one session leaves the other session's tabs attached.
- [x] Live test cleanup stops the broker it spawned only if the recorded process is its own, and the temp root is unchanged after the run.
