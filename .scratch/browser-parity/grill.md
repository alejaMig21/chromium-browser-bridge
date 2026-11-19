# Self-grill: where does this project stand against the official extension?

Date: 2026-11-18. Method: read all source, read the official extension's manifest and strategy strings (read-only, from the user's own Chrome profile), probe with a headless Edge carrying the extension (`probe.mjs`, scratchpad). Evidence is marked CONFIRMED (measured) or CODE (read in source, not measurable here).

## Q&A

**Q1. Is the capability set equal?** Tool names match. Official also has side panel, per-site permissions, tab groups, Stop button, notifications, sounds, scheduled tasks, accessibility-tree content script in all frames. Here: none of those. Parity on tools, not on experience.

**Q2. Do screenshots and clicks use the same coordinates?** NO. CONFIRMED: at devicePixelRatio 1.25 the PNG is 744x453 while the CSS viewport is 595x362. The tool text reports the CSS size, the image is device pixels, so a model clicking where it sees something misses by 25%. On the user's real screen: image 1913 wide, viewport 1530.

**Q3. Does work continue if the user switches tab or minimizes?** NO. CODE: `tab()` with no id picks whichever page is visible, so work jumps to the tab the user switched to; `shot()` calls `bringToFront()`, which pulls the user back to the agent's tab and, on a minimized window, restores it. Headless cannot reproduce hidden or minimized windows (every tab reports `visible`), so the fix is built from the official strategy (focus emulation, `fromSurface` capture, restore minimized without focus) and the final check needs the user's real window.

**Q4. Can the user see what the agent is doing?** NO. No cursor, no highlight, no badge. Official ships `cursor-motion` and `agent-visual-indicator` content scripts.

**Q5. Who can talk to the CDP socket?** CODE: any local process without an `Origin` header can connect to `/cdp` and drive the user's real tabs. Web pages are blocked, local programs are not. Official pairs through its own channel.

**Q6. Two Claude sessions at once?** NO. CODE: each MCP server binds port 9340; the second logs "Bridge not listening" and `browser_attach` there fails. A broker is needed; naive multi-port would let one session steal another's debugger (`attachOnce` detaches on "already attached").

**Q7. Does the project damage the user's pages?** CODE: in attached mode `addInitScript` replaces `window.open` with a no-op and rewrites `target=_blank`, which breaks OAuth popups in the user's real tabs. The reason (Vivaldi wedge) only applies to launched mode. Also `c.route('**/*')` intercepts every request of attached tabs just to check document navigations (cost not measured; the per-request hop is certain, magnitude unknown).

**Q8. Is the documentation true?** NO. `CLAUDE.md` still says attach uses `DevToolsActivePort`; it uses the extension.

## Strengths (verified)

- No account, no network except loopback: runs under the user's terminal account (the original blocker).
- Origin + Host + extension-id checks on both sockets (unit tests).
- Only tabs the user looked at are offered; browser-internal pages never offered.
- Lifecycle owned by the tool (launch, reconnect, close, idle shutdown) with ownership checks before any kill.
- Policy on every top-level navigation, optional allowlist.
- Works on Vivaldi/Edge/Brave, where the official extension does not exist or is untrusted.
- 85/85 live checks on Chrome, 84/84 on Vivaldi.

## Weaknesses (ranked)

1. Coordinate mismatch (Q2) — breaks every coordinate click on a scaled display.
2. Work jumps with the user's tab; focus theft (Q3) — the user's explicit complaint.
3. No visible agent presence (Q4) — the user's explicit complaint.
4. Unauthenticated local CDP socket (Q5).
5. Popups broken in attached mode (Q7).
6. Single session only (Q6).
7. No per-site permission prompts; blocklist only.
8. Stale docs (Q8).
