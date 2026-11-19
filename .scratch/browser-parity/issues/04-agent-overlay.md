# 04 Agent overlay (glow, cursor, badge)

Status: resolved
Blocked by: 02

Closed shadow root, `pointer-events:none`, injected by the server on the work tab. Cursor glides to every click/hover/drag point; glow + badge show while the agent acts and fade after 10 s idle. Hidden during screenshots. Removed on `browser_close`.

Acceptance: after a click the overlay host exists and the cursor sits at the click point; the screenshot PNG does not contain it (host hidden at capture time); after `browser_close` it is gone.

## Answer
Done 2026-11-18. Verified by live-test.mjs (Chrome 97/97, Vivaldi 96/96) and npm test (18/18). Details in the checks named with this ticket number.
