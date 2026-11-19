# 06 Popups in attached mode, stale docs

Status: resolved
Blocked by: none

`window.open` / `target=_blank` patch only in launched mode. `CLAUDE.md` describes the extension flow, not `DevToolsActivePort`.

Acceptance: in attached mode `window.open` is native in the page; CLAUDE.md contains no `DevToolsActivePort`.

## Answer
Done 2026-11-18. Verified by live-test.mjs (Chrome 97/97, Vivaldi 96/96) and npm test (18/18). Details in the checks named with this ticket number.
