# Spec: multi-session-broker

Status: implemented, pending the real two-session check (ticket 05)
Supersedes: `.scratch/browser-parity/issues/07-multi-session-broker.md`

## Problem Statement

I often have several Claude Code sessions open at once (one per project, or a side task). Only the first one can use my browser: every session starts its own MCP server, each server tries to own port 9340, and the later ones log "Bridge not listening" and cannot `browser_attach`. I have to close one session to use another. Making the sessions share the port naively would be worse: Chromium allows one debugger per tab, so a second session would steal or break the first one's tab.

## Solution

One small long-lived local process, the **broker**, owns port 9340 and the connection to the Local Browser Bridge extension. Every Claude session's MCP server becomes a client of the broker. The broker gives each session its own set of tabs and never lets two sessions drive the same tab. The first session that needs the browser starts the broker; it exits by itself when nobody has used it for a while. From my side nothing changes: reload the extension once, then `browser_attach` works in every session, each on its own tab.

## User Stories

1. As a user with two Claude sessions open, I want both to attach to my browser, so that I do not have to close one to use the other.
2. As a user, I want each session to get its own work tab, so that two agents never click in the same page.
3. As a user, I want a session that attaches while another session already holds the tab I am looking at to get a clear message and a way forward (open its own tab), so that it does not silently fail or steal the tab.
4. As a user, I want `tabs_create_mcp` to give the creating session ownership of the new tab, so that the other session cannot touch it.
5. As a user, I want `tabs_context_mcp` to list only the tabs the calling session owns plus the tabs nobody owns, marked as such, so that a session never acts on another one's tab by accident.
6. As a user, I want a tab owned by one session to refuse commands from another with a message naming the situation ("owned by another Claude session"), so that the model understands and picks another tab.
7. As a user, I want a session's tabs released when that session closes the browser connection, exits or crashes, so that the next session can use them without restarting anything.
8. As a user, I want the debugger notice on a released tab to disappear, so that the browser does not look like it is still being controlled.
9. As a user, I want no extra step to start the broker, so that using the browser from a session stays one call (`browser_attach`).
10. As a user, I want the broker to start automatically when the first session needs it, so that I never run a daemon by hand.
11. As a user, I want the broker to stop on its own after a long period with no sessions, so that no process stays running forever.
12. As a user, I want a session to recover when the broker was killed or crashed (the next `browser_attach` starts a new one), so that one crash does not need manual cleanup.
13. As a user, I want the extension to keep working unchanged, so that I do not have to reload it for this feature.
14. As a user, I want the extension to reconnect to a restarted broker by itself, so that a broker restart is invisible.
15. As a user, I want the broker to refuse programs that do not hold its token, so that other users or sandboxed processes on the PC cannot drive my browser.
16. As a user, I want the token stored where only my Windows account can read it, so that the barrier is real.
17. As a user, I want web pages to stay unable to reach the broker, so that no site can drive my browser.
18. As a user, I want the existing guard that a live extension is never replaced to keep working, so that another program cannot take the extension's slot.
19. As a user, I want the user-switched tab to be offered to a session that owns no tab, and to stay unclaimed (and listed as such) when every session already owns one, so that two sessions never fight over it.
20. As a user, I want the agent's overlay (glow, cursor, badge) to appear only on tabs of the session that is acting, so that I see which agent is where.
21. As a user, I want `browser_status` to say whether the session is connected to the broker and how many sessions the broker has, so that I can understand what is happening.
22. As a user, I want `browser_close` to release only the calling session's tabs, so that closing one session's browser access does not cut the other.
23. As a user, I want the idle shutdown and the minimized-window capture to keep working per session, so that the earlier behaviour does not regress.
24. As a maintainer, I want the broker to reuse the existing bridge module rather than a second relay, so that there is one place where CDP is translated.
25. As a maintainer, I want the live test to run two real MCP servers against one stand-in browser, so that the multi-session behaviour is proven end to end.
26. As a maintainer, I want the broker started by tests to be killed only if its recorded process is ours, so that tests never kill a broker of the user's real sessions.
27. As a maintainer, I want the docs (CLAUDE.md, glossary, ADR) to describe the broker, so that the next reader is not misled.

## Implementation Decisions

- **Broker module**: a new entry point that hosts the existing bridge on port 9340 and is the only process that binds it. The bridge module is extended from "one CDP client" to "many CDP clients", each with its own session model, a session id, and a shared tab-ownership table.
- **Ownership rules**: a tab is owned by at most one session. Ownership starts when a session attaches the tab (at attach time, or on creating it) and ends when that session disconnects or the tab closes. Commands for a tab go only to its owner; any other session gets an error that names "owned by another Claude session".
- **Attach-time offer**: the foreground tab is offered to the session only if it is unowned. If it is owned, the session is attached with no tab and told to open its own with `tabs_create_mcp`.
- **User-switched tabs**: attached automatically only to a session that currently owns no tab; otherwise left unclaimed and listed as unclaimed. Claim-on-demand is out of scope.
- **Discovery**: sessions find the broker through a small file in a per-user location (port and token), written by the broker with owner-only permissions. A session that cannot reach the broker starts it detached and retries for a short, bounded time, then reports a clear error.
- **Broker lifecycle**: starts on demand; exits after a long idle period with zero sessions; records its process id for ownership-checked cleanup. The extension is untouched and already reconnects every 30 seconds.
- **Auth change**: the per-process token of ADR 0001 becomes a per-broker token stored in the discovery file. This weakens the guarantee against other processes running as the same Windows user (they can read the file); it still blocks web pages, other Windows users and sandboxed processes. Recorded in a new ADR that supersedes the relevant part of 0001.
- **Session identity**: each MCP server connects with a random session id; a reconnect with the same id replaces the old connection (the old socket's close may arrive late) and inherits its released tabs.
- **Unclaimed tab reporting**: only origin and path are reported (no query string or fragment), and the MCP server applies the URL policy before telling the agent.
- **Hardening decided after review**: a malformed request, frame or control call never stops the broker; a client that drops mid-attach leaves no owner and no debugger; browser-level target attach by name is refused; `BROKER_IDLE_MS=0` means never stop; sessions talking to the broker keep it alive.
- **Server changes**: the MCP server stops hosting a bridge and becomes a client of the broker; the work-tab pin, overlay, capture and policy logic stay per session and unchanged. `browser_status` reports broker connection and session count.
- **Backward compatibility**: `browser_launch` (own browser with debug port) does not use the broker and is unchanged. The tool names and arguments are unchanged.
- **Interfaces to settle in the tickets**: broker discovery file shape, the session-handshake query parameters, and the ownership error text.

## Testing Decisions

- A good test drives the system from outside (sockets, MCP tools, a real browser) and asserts observable behaviour: which session can act on which tab, what the user sees, what is cleaned up. It does not assert internal data structures.
- **Seam 1, the bridge protocol** (the highest seam that can be tested without a browser): unit tests that connect several CDP clients to the bridge with a scripted fake extension. Covers ownership, refusal, release on disconnect, token and origin checks. Prior art: `bridge.test.mjs` (handshake checks).
- **Seam 2, end to end**: the live test starts two real MCP servers against one stand-in browser with the extension and drives both through the MCP tools. Prior art: the attached section of `live-test.mjs` (stand-in Edge, debug port only as the test's hand).
- Cleanup tests: the broker spawned by a test is stopped on every exit path and only if its recorded process is the one the test started; the temp root is unchanged after the run.
- Real-window checks stay manual with the user's Vivaldi (two sessions open, minimized window).

## Out of Scope

- Claim-on-demand of a tab another session or the user left unclaimed.
- Showing the session name in the overlay badge.
- Per-site permission prompts and the Stop button (separate roadmap items).
- Cross-machine access, remote sessions, or any non-loopback listener.
- Replacing the token with a stronger mechanism (native messaging); noted for later in the ADR.

## Further Notes

- Chromium allows one debugger per tab, which is why the broker owns attachment instead of letting sessions share a port.
- The extension needs no change, so users who already reloaded it do not have to reload it again for this feature.
- Seams proposed above: bridge protocol (unit) and two-server run (live). The user is asked to object if they expected a different split.
