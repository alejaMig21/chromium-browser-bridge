# 07: The `list_connected_browsers` tool and `browser_status`

**What to build:** a new read-only MCP tool, `list_connected_browsers`, like the official extension's. For each connected browser it shows the name, the full path of its program, the instance id when there are several of the same name, the title of its active tab, and whether a session is using it. `browser_status` also reports the connected browsers. The path makes a program that is not a browser easy to spot.

**Blocked by:** 06

**Status:** resolved

Spec: stories 17, 18, 19, 20, 33 in `.scratch/multi-browser/spec.md`.

- [ ] The tool is listed with the other tools and takes no arguments
- [ ] With two connected browsers the answer has one row each with name, path, active tab title and in-use flag
- [ ] With two profiles of the same browser the rows show their ids (or suffixes)
- [ ] With no connected browser the answer says so and points to `browser_attach`
- [ ] The tool changes nothing (it opens no tab, attaches nothing)
- [ ] `browser_status` shows the same connected browsers

## Answer

Done (commit 3c23000, merged). `describeBrowsers(list)` and `brokerClient.browsers()` in `broker-client.mjs`; `browsers()` never starts a broker and returns `[]` when none runs, so the tool works before any attach. `server.mjs` registers `list_connected_browsers` (no arguments, read-only) and `browser_status` has a `connectedBrowsers` field built with the same formatter. 5 tests in `broker-client.list.test.mjs` (port 9460). Output for two browsers (title in quotes, `(none)` when empty):

```
Connected browsers (2):
- chrome: C:\Apps\chrome\chrome.exe; active tab: "Inbox"; in use: no
- msedge: C:\Apps\edge\msedge.exe; active tab: (none); in use: no
```

Two profiles of one browser read `- chrome-aaaa (id aaaa1111): <path>; ...`. None: `No browser is connected. Install the Local Browser Bridge extension in the browser the user has open, then call browser_attach.`
