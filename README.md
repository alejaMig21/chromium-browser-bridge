# Chromium Browser Bridge

An MCP server that lets any MCP-capable agent (Claude Code, OpenCode, Codex, or anything else that speaks MCP) drive the Chromium browser you already have open: your real profile, tabs and logins, with no account and no cloud service in between.

It mirrors the tool set of the official Claude in Chrome extension (`computer`, `navigate`, `read_page`, `find`, `form_input`, `get_page_text`, `javascript_tool`, `tabs_*`, console and network readers, `resize_window`, `gif_creator`, `upload_image`, `file_upload`, `browser_batch`) over the Chrome DevTools Protocol (CDP).

## How it works

```text
agent (MCP client)
  └─ server.mjs                     one MCP server per agent session
       └─ broker (port 9340)        one shared local process, started on demand
            ├─ entry "vivaldi"      one entry per connected browser, named after
            ├─ entry "chrome-3f9a"  the program that opened the connection
            └─ entry "msedge"       (two profiles of one browser: name + id prefix)
                 └─ "Local Browser Bridge" extension, loaded once in each browser
```

- **Attach, never launch.** `browser_attach` connects to a browser that is already open. It is never launched, restarted, closed or navigated away. The work tab is pinned at attach, captures never take focus, and an overlay marks the tab the agent acts on.
- **Several browsers at once.** Every browser with the extension is connected at the same time. A session works in one of them, chosen with `browser_attach`, and `list_connected_browsers` shows what is available. Two sessions can work in two different browsers together.
- **Choice order of `browser_attach`:** the browser you name; else the only one connected; else the system default browser if it is connected (Windows); else it fails and lists the connected browsers.
- **Launch mode.** `browser_launch` can also start a browser with a dedicated profile and a loopback-only debug port when you want a throwaway one.

## Supported browsers

| Status | Browsers |
|---|---|
| Tested | Chrome, Edge, Vivaldi (cross-browser matrix: `.scratch/cross-browser/results.md`) |
| Expected to work, not tested | Brave, Opera and other Chromium-based browsers |
| Not supported | Firefox, Safari and their derivatives (LibreWolf, Waterfox, Tor Browser) |

Firefox and Safari are not supported because the bridge needs the `chrome.debugger` extension API and CDP, which they do not provide: Firefox does not implement `chrome.debugger` and has retired its CDP support in favour of WebDriver BiDi. Supporting Firefox would need a second backend, not a small patch. `browser_attach` answers a request for one of these with a clear "not supported" message.

Reading the connecting program and the system default browser is implemented for Windows. On other systems an entry is named `browser` and everything works while only one browser is connected.

## Quick start

1. Install dependencies: `npm install` (developed and tested on Node 24).
2. In each browser, open its extensions page, turn on developer mode and "Load unpacked" the `extension/` folder ("Local Browser Bridge"). After updating the extension, reload it once in each browser.
3. Register the MCP server in your agent. Any MCP client works with a stdio server, for example:

   ```json
   { "mcpServers": { "browser": { "command": "node", "args": ["/absolute/path/to/server.mjs"] } } }
   ```

   For Claude Code there is also a ready-made plugin in `plugin/` (`browser-cdp`) with a usage skill.
4. Ask the agent to call `browser_attach` (optionally with `browser: "edge"`, `"chrome"`, `"vivaldi"`...).

## Safety

- The broker listens on loopback only and requires a token kept in a discovery file. A live extension connection is only replaced by the same instance id from the same program; a different program claiming it is refused and logged.
- `policy.mjs` blocks browser-internal schemes and sensitive domains (banking, payment, identity providers); set `allowedDomains` in `policy.json` for a strict allowlist.
- Decisions and trade-offs: `docs/adr/` (trust boundary, broker, several browsers on one broker). Vocabulary: `GLOSSARY.md`.

## License

[MIT](LICENSE).

## Development

- `npm test`: unit tests (`node --test`).
- `LIVE_BROWSER=chrome node live-test.mjs`: end-to-end check against a headless browser it launches itself on its own port (`LIVE_BROWSER=vivaldi ALLOW_NO_TAB_CREATE=1` for Vivaldi).
- `node matrix.mjs --browser <chrome|edge|vivaldi> --drive`: cross-browser matrix on a real browser that already has the extension.
- Specs, tickets and notes live as Markdown under `.scratch/`; `CLAUDE.md` describes the project for agents.
