# 01: One entry per extension connection (still only one)

**What to build:** prefactor, no behaviour change. Everything the broker keeps about the extension today (the pending calls to it, which session owns each tab, which tabs are offered to a session, the capture state) lives in an **entry**, and each session points to its entry. There is still exactly one entry, so a user with one browser sees no difference. This makes the next tickets small.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: `.scratch/multi-browser/spec.md`. ADR: `docs/adr/0003-several-browsers-on-one-broker.md`.

- [ ] Tab ownership is keyed by entry and tab id; a tab id is only unique inside one entry
- [ ] Control requests (status, unclaimed tabs, reveal, hide, tabs by prefix) are answered for the session's entry
- [ ] The existing unit tests, the live test (Chrome and the Edge stand-in) and the matrix unit tests pass unchanged, with no edits to their expectations
- [ ] No new behaviour is visible to a client: same messages, same refusals
