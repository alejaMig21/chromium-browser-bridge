# 0002 One broker for all sessions; token in a discovery file

Status: accepted, 2026-11-18. Supersedes the "per-process token" part of 0001.

## Context

Each Claude session runs its own MCP server. When every server hosted the bridge, only the first could bind port 9340 and the others could not attach. Chromium allows one debugger per tab, so letting sessions share the port naively would let one session break another's tab.

## Decision

- One **broker** process (`broker.mjs`) owns port 9340 and the extension connection. MCP servers are clients: a CDP socket per session (for Playwright) and a control socket (extension status, window restore around captures, unclaimed tabs).
- A tab belongs to at most one session. Commands for another session's tab are refused ("owned by another Claude session"). Tabs are released when the session disconnects, whether it closed its browser access or died.
- The foreground tab is offered to a session only if free. A tab the user switches to goes to a session that owns no tab, otherwise it stays unclaimed and is only listed.
- The broker starts on demand (first `browser_attach`), stops itself after `BROKER_IDLE_MS` with no sessions, and is found through `broker.json` (port, token, pid) under the user's local app data folder.
- The token is per broker and lives in that file. The file is created with mode 0600; on Windows the folder inherits the user's own ACL.

## Consequences

- Protects against web pages (Origin and Host checks), other Windows users and processes that cannot read the user's files. It no longer protects against another process running as the same Windows user: it can read the file and use the token. Such a process can already read the browser profile; this boundary does not try to stop that.
- Closing that gap needs a secret shared with the extension (native messaging), tracked in the roadmap.
- A live extension connection is still never replaced by a second one claiming its id (0001). Update 2026-11-19: ADR 0003 keeps one such connection per connected browser instead of a single one.
- Tests start their own broker under the run folder and stop it only after the command line proves the pid is that broker.
