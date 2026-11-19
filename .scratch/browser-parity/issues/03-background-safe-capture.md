# 03 Capture without stealing focus

Status: resolved
Blocked by: 02

No `bringToFront`. Capture directly; if it fails, restore a minimized window without focusing it (new extension API `chrome.windows.update`) and retry once.

Acceptance: no `bringToFront` call in the capture path (live check counts `Page.bringToFront` commands via bridge trace); screenshot of a non-active tab still succeeds. Minimized-window behaviour is checked live on the user's real window (headless cannot minimize).

## Answer
Done 2026-11-18. Verified by live-test.mjs (Chrome 97/97, Vivaldi 96/96) and npm test (18/18). Details in the checks named with this ticket number.
