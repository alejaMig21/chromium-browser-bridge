# chromium-browser-bridge

MCP server (`server.mjs`) that mirrors the Claude in Chrome tool set (computer, navigate, read_page, find, form_input, get_page_text, javascript_tool, tabs_*, console/network readers, resize_window, gif_creator, upload_image, file_upload, browser_batch) over CDP. It needs no Claude extension and no Claude account, because the CLI only trusts an extension signed in to the same account.

- `browser_attach` connects to a browser the user already has open, through the "Local Browser Bridge" extension (`extension/`, loaded once with "Load unpacked") and the local relay `bridge.mjs`, hosted by one shared broker (`broker.mjs`, port 9340, started on demand by `broker-client.mjs`, found through `broker.json`; several Claude sessions each get their own tabs, ADR 0002). Attached browsers are never launched, restarted, closed or navigated away. The work tab is pinned at attach, captures never take focus, and an overlay (glow, cursor, badge) marks the tab the agent acts on. Terms: `GLOSSARY.md`; plan: `.scratch/browser-parity/`. Several connected browsers (choosing one, instance ids, the replacement rule): spec and tickets in `.scratch/multi-browser/`, ADR `docs/adr/0003-several-browsers-on-one-broker.md`.
- The broker serves several browsers at once, one entry per extension connection (ADR 0003): `browser_attach({ browser })` picks one (only one connected, else the system default, else it fails listing them), `list_connected_browsers` shows them, a session works in one browser at a time. After updating the extension, reload it once in each browser so it announces its instance id (two profiles of one browser become `chrome-xxxx`); until then it works as a legacy entry named after its program.
- The tool owns the browser lifecycle (`launcher.mjs`): `browser_launch`, `browser_status`, `browser_reconnect`, `browser_close`. It starts the browser with a dedicated `profile-<name>/` folder and a loopback-only CDP port (Chromium ignores the debug port on the default profile), closes the browser after 10 minutes without tool calls (`BROWSER_IDLE_MS`, 0 disables; the MCP server process itself stays up), records the pid in the temp dir, and only ever kills a process whose command line carries that profile folder.
- `policy.mjs` blocks internal schemes and sensitive domains; set `allowedDomains` in `policy.json` for strict allowlist mode. Covered by `npm test`.
- `live-test.mjs` launches its own headless browser on port 9301 through `browser_launch` and drives it end to end, including crash recovery (`LIVE_BROWSER=vivaldi|chrome|edge|brave`; `ALLOW_NO_TAB_CREATE=1` for Vivaldi, which cannot create tabs over CDP). Unit tests: `npm test`.
- Captures follow the official Claude extension (read from its code): the whole viewport from the surface, never a clip (a clip makes the browser resize the page while it captures, which shrank the user's page); a hidden tab is woken with tiny captures; no tab is activated and no window restored unless `BROWSER_REVEAL_TABS=1`. The server turns the capture into CSS pixels itself (`cssImage` in `server.mjs`).
- `matrix.mjs --browser <name> --drive` runs the cross-browser matrix on a real browser that already has the extension installed, with no questions: it minimizes and restores the window (`matrix-window.ps1`, Windows only, no focus taken), switches tabs through the extension and opens and closes a second session (`--auto` skips those rows). Results: `.scratch/cross-browser/results.md`.
- Packaged as the `browser-cdp` plugin (`plugin/`, local marketplace `browser-local`: `.mcp.json` runs `server.mjs`, plus a usage skill) and switched on by the local preset `browser-control` (`presets.local/browser-control.json` in preset-manager). Change it through `preset`, never with `claude mcp add`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Agent reports

Problems found by other agents using this MCP for real work live in `.scratch/agent-reports/` (read its `README.md` first). The prompt "fix the errors reported by other agents" means: work every ticket there marked `ready-for-agent`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
