# 02: Several browsers connected at once, named by program

**What to build:** two (or more) extensions can be connected to the broker at the same time and none is refused. Each connection is a **connected browser** named after the program that opened it (program file name without extension, lower case). Two entries with the same name are shown with a four-character suffix of their id. An extension that sends no instance id works as a single entry identified by its program. The program that opened a connection comes from a replaceable component passed in when the bridge is built; its default answer is `browser`. A control request lists the connected browsers, and a session's CDP connection says which entry it wants.

**Blocked by:** 01

**Status:** resolved

Spec: stories 1, 5, 13, 15, 29, 30 in `.scratch/multi-browser/spec.md`.

- [ ] Two fake extensions with different injected program names connect and both stay connected
- [ ] A request for `edge` matches the entry whose program is `msedge`; `chrome` does not match `chromium`
- [ ] Two entries with the same program name get distinct suffixed names
- [ ] A legacy extension (no instance id) connects as one entry named after its program
- [ ] The control request that lists connected browsers returns name, program path and whether a session uses it
- [ ] A session connected to one entry cannot see or command the tabs of another entry
- [ ] With the default component every entry is named `browser` and a single connected browser still works with no argument

## Answer

Done in `bridge.mjs` + new `bridge.browsers.test.mjs` (commit 9b5814f). 85/85 tests (77 old untouched, 8 new). Interfaces later tickets use:

- **Program lookup (03):** `startBridge({ identify })`; `identify({ req, remoteAddress, remotePort })` returns a program path string or nothing, may be async, awaited before the handshake completes. A throw or non-string means unknown, entry is named `browser`. Default answers nothing.
- **Instance id (06):** the extension connects to `/extension?i=<id>`, id matches `[\w-]{1,64}`. Missing or malformed id = legacy entry keyed by program.
- **Entry on CDP (04):** `/cdp?t=..&s=..&b=<name>`. `b` is matched case-insensitively against the full entry name (`chrome-3f9a`) or the program name, exact first, then substring. Zero or several matches close the socket 1008 with `no connected browser matches "x". Connected: a, b`. No `b` and one entry: that entry. Several entries and no `b`: close reason `several browsers are connected, say which one. Connected: a, b`. None connected: `extension not connected`.
- **Entry on control (07, 08):** `/control?...&b=<name>` same rules. A session already attached to an entry always uses it and `b` is ignored. Several entries and no choice: `unclaimed`, `tabs`, `reveal`, `hide` fail with `Say which browser (several are connected: ...)`.
- **List request:** control method `browsers`, `{id, method:'browsers', params:[]}` returns `[{ name, program, instance?, inUse }]`; `instance` only when the name is shared; `program` is `''` when unknown. Active tab title (story 14) NOT included yet (ticket 06).
- **Status:** `status` also returns `browsers` (a count).

Left for later: a second live connection with the same key is still refused with `extension already connected` (replacement rules = ticket 06); disconnect closes that entry's sessions with the old `extension disconnected` reason (message naming lost and remaining browsers = ticket 08); `server.mjs` and `broker-client.mjs` send no `b` yet (ticket 04). Suffixed names are computed on demand (`chrome` becomes `chrome-aaaa` when a second `chrome` connects).
