# 01: The bridge serves several sessions

**What to build:** several Claude sessions can be connected to the bridge at the same time. Each session has its own set of tabs; a tab belongs to at most one session; a command for a tab another session owns is refused with a message that says it is owned by another Claude session; a session's tabs are released when it disconnects. Verified with scripted sessions against a fake extension, no browser needed.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Two sessions connect with different session ids; a duplicate id is refused.
- [x] Each session attaches only tabs it is allowed to; a tab owned by one session cannot be attached or commanded by the other, and the error names "owned by another Claude session".
- [x] When a session disconnects, its tabs are released (debugger detached) and another session can attach them.
- [x] Token, Origin, Host and live-extension guards still pass their existing tests.
