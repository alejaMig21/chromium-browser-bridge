# 05: Docs, ADR and check with the real browser

**What to build:** the project docs describe the broker; a new ADR records that the token moved from per-process to a discovery file (what that protects against and what it no longer does); and the feature is checked once with two real Claude sessions on the user's own Vivaldi.

**Blocked by:** 03, 04

**Status:** resolved

- [x] `CLAUDE.md` and `GLOSSARY.md` define broker, session, owned tab and unclaimed tab.
- [x] ADR 0002 supersedes the token part of ADR 0001 and states the same-user limitation.
- [x] With two real sessions open on the user's Vivaldi, both attach and work on different tabs; the result is reported with evidence.
- [x] Tickets 01-04 are marked resolved and the browser-parity ticket 07 points to this spec.

## Answer
Real check 2026-11-18 on the user Vivaldi: two Claude sessions on one broker (browser_status: sessions 2). This session worked on its own tab; the other session opened its own new tab after the empty-tab fix (bugfix/vivaldi-empty-created-tab); this session lists only its own tab. Cross-browser caveats: .scratch/browser-parity/cross-browser.md.
