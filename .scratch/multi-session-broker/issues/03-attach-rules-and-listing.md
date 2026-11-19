# 03: Attach rules and tab listing per session

**What to build:** attaching when another session already owns the tab the user is looking at gives a clear message and a way forward (open your own tab) instead of failing silently; `tabs_context_mcp` lists the session's own tabs plus unclaimed ones, marked as such; a tab the user switches to goes to a session that owns no tab, otherwise stays unclaimed; `browser_status` shows the broker connection and the session count.

**Blocked by:** 02

**Status:** resolved

- [x] Attach with the foreground tab owned elsewhere succeeds with no tab and a message telling the model to use `tabs_create_mcp`.
- [x] `tabs_context_mcp` marks the work tab, own tabs and unclaimed tabs, and omits tabs owned by other sessions.
- [x] A user-switched tab is attached only to a session with no tab; with every session owning one it is listed as unclaimed.
- [x] `browser_status` reports broker connected and the number of sessions.
- [x] Overlay appears only on the acting session's tabs.
