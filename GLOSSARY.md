# Glossary

- **Bridge**: the local relay in `bridge.mjs`. It speaks plain CDP to the MCP servers and talks to the extension.
- **Broker**: the one process (`broker.mjs`) that hosts the bridge and the extension connections for every Claude session. Started on demand, stops when idle.
- **Connected browser**: one browser, or one profile of a browser, whose extension is connected to the broker. Named after its program (`vivaldi`, `msedge`). A session attaches to exactly one connected browser at a time; different sessions may use different ones.
- **Instance id**: the random identifier an extension generates once and keeps, so two profiles of the same browser are told apart. Two entries of one name are shown as `chrome-3f9a`; a live entry is replaced only by the same id from the same program, or after 45 s of silence. An extension without an id is a legacy entry named after its program.
- **Session**: one Claude Code session and its MCP server, identified by a random id on the broker.
- **Owned tab**: a tab one session is attached to; no other session may command it.
- **Unclaimed tab**: a tab the user looked at that no session owns; listed, never attached without a free session.
- **Control channel**: the second socket (`/control`) an MCP server keeps to the broker for non-CDP requests (extension status, window restore, unclaimed tabs).
- **Discovery file**: `broker.json` (port, token, pid) that sessions read to find the broker.
- **Extension**: "Local Browser Bridge" (`extension/`), a thin MV3 extension that forwards `chrome.debugger` and `chrome.tabs` calls. No account, no network except `127.0.0.1`.
- **Attached mode**: the server controls the browser the user already has open, through the extension. Never launches, restarts or closes it.
- **Launched mode**: the server starts its own browser with a dedicated profile and a loopback debug port, and may close it.
- **Work tab**: the one tab the agent acts on by default. It stays the same when the user switches tabs.
- **Offered tab**: a tab the user has looked at, so the agent may attach to it.
- **Overlay**: the visual layer the agent draws on the work tab (glow border, animated cursor, status badge). Never captured in screenshots.
- **Official extension**: Anthropic's "Claude in Chrome". Used only as the parity reference.
- **Policy**: `policy.mjs`. Blocks internal schemes and sensitive domains on every top-level navigation.
- **CSS pixel**: the unit of the page viewport. Screenshots and click coordinates must both use it.
