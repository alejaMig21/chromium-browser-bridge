# 04 No way to wait for a slow page; empty reads do not say the page is loading

**Status:** resolved

**Report:** same session as ticket 01. The user said (2026-11-18): their country's connection is very slow and every page can take minutes to open, so an agent must not expect answers in seconds.

**Evidence (exact):**
- `navigate` answers at once (`Navigated to <url> (<title>)`, sometimes with an empty title), long before the page is usable.
- `https://admin.shopify.com/store/example-store-2` and `.../settings/apps/development`: `get_page_text` returned only the header with an empty body, and `read_page` returned `(no matching elements)`, even after `computer wait` of 3, 4 and 14 s. The agent could not tell "still loading", "blocked" and "unreadable" apart.
- `computer wait` takes a fixed `duration`, so the agent polls blindly.

**Acceptance:**
- New tool (or `computer` action) `wait_for` with `text`, `selector` or `loaded` (document complete and network quiet for N s), and a `timeout` up to 300 s. It returns as soon as the condition holds, or a clear timeout message with the last `document.readyState`, URL and number of pending requests.
- `navigate` accepts `waitUntil` (`commit` | `load` | `networkidle`) and `timeout` (default stays quick; the long values are opt-in).
- `get_page_text` and `read_page`, when the body is empty, say `page empty: readyState=<x>, pending requests=<n>` instead of an empty result.
- Tool descriptions state that slow networks exist and name `wait_for`; the plugin skill gets a "slow connection" paragraph.
- Tests with a local server that delays its response (for example 3 s), proving `wait_for` returns on arrival and times out with the diagnostic.

## Answer

Added `wait_for` (`text`, `selector`, `loaded`; `timeout` default 30 s, at most 300; returns as soon as it holds; on timeout it fails with `readyState`, `url` and `pending requests`). `loaded` means document complete and no request open for 1 s (event streams are not counted). `navigate` takes `waitUntil` (`commit|domcontentloaded|load|networkidle`, default unchanged) and `timeout`. `get_page_text` and `read_page` of an empty page answer `page empty: readyState=<x>, pending requests=<n>`. Descriptions of navigate, read_page and wait_for name the slow-network path; SKILL.md has a "Slow connection" paragraph.

The per-call wrapper in `reg` cut every tool at 90 s, which would have killed a long `wait_for`: a tool with a `timeout` argument now gets that plus 30 s. Verified with a real 95 s wait (`wait_for timed out after 95s`, not the old 90 s message).

Tests: 8 checks in `live-test.mjs` against a server that paints text after 3 s and keeps a request open for 4 s (red before, green after). Chrome live passes.

Not done on purpose: `computer wait` still caps at 30 s per call (use `wait_for`). Claude Code's own MCP tool timeout is a separate setting of the client.

**Recheck (user):** none needed.
