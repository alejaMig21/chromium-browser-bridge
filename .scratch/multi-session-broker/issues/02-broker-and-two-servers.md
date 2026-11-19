# 02: Broker running, two real MCP servers share one browser

**What to build:** a single broker process owns port 9340 and the extension connection; the first MCP server that needs the browser starts it, and every MCP server connects to it through a discovery file that holds the port and a token readable only by the user. Two real MCP servers can each `browser_attach` to the same stand-in browser and work, each on its own tab, at the same time.

**Blocked by:** 01

**Status:** resolved

- [x] The MCP server no longer binds the bridge port itself; it finds the broker through the discovery file and starts it detached if none answers, with a bounded retry and a clear error if it still fails.
- [x] The discovery file is written with owner-only permissions and carries port and token.
- [x] Live test: two MCP servers against one stand-in browser; one session works on the tab the user is on, the other opens its own tab; both read and click without interfering.
- [x] `browser_launch` (own browser with debug port) is unchanged.
- [x] The extension is unchanged and reconnects to a restarted broker by itself.
