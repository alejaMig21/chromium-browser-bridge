# 02 Work tab stays put

Status: resolved
Blocked by: none

Default tab = the work tab, set at `browser_attach`. User tab switches never change it. `tabs_create_mcp` and calls with an explicit `tabId` move it. `tabs_context_mcp` marks it.

Acceptance: after attach, create a second tab as the "user switch"; a call without `tabId` still acts on the original work tab.

## Answer
Done 2026-11-18. Verified by live-test.mjs (Chrome 97/97, Vivaldi 96/96) and npm test (18/18). Details in the checks named with this ticket number.
