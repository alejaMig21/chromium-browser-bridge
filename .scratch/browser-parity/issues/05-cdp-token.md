# 05 Token on the CDP socket

Status: resolved
Blocked by: none

`/cdp` needs `?t=<random per process>`; `cdpEndpoint()` returns it. Without or with a wrong token: 403.

Acceptance: unit test handshake without token and with a wrong token is 403, with the right token passes the auth gate.

## Answer
Done 2026-11-18. Verified by live-test.mjs (Chrome 97/97, Vivaldi 96/96) and npm test (18/18). Details in the checks named with this ticket number.
