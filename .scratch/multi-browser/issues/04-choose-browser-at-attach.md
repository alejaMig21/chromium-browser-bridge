# 04: Choose the browser when attaching

**What to build:** `browser_attach` takes the optional `browser` argument and picks the connected browser in this order: the one asked for; the only connected one; the system default browser if it is connected; otherwise it fails and lists the connected browsers. The reply always names the browser attached and how it was chosen. Asking for a browser that is not connected waits up to 35 seconds while the broker is younger than 45 seconds (extensions are still reconnecting) and fails at once, with the connected browsers and the existing install guide for the requested browser, when the broker is older. The "system default browser" comes from a replaceable component (tests inject it; ticket 05 makes it real on Windows); with no component it is skipped. With one browser connected and no argument, behaviour is unchanged.

**Blocked by:** 02

**Status:** resolved

Spec: stories 2, 3, 4, 6, 7, 8, 21, 22 in `.scratch/multi-browser/spec.md`.

- [ ] One connected browser and no argument: attaches as today
- [ ] Several connected, a name given: attaches to that one and the reply names it
- [ ] Several connected, no name, default connected: attaches to the default and the reply says it was the default
- [ ] Several connected, no name, default not connected or unknown: fails listing the connected browsers
- [ ] A requested browser that is not connected and a young broker: waits and succeeds if it appears within 35 seconds, fails with the list otherwise (short deadlines injected in tests)
- [ ] The same request with an old broker fails immediately with the list and the install guide
- [ ] Two sessions attached to two different browsers work at the same time

## Answer

Done (commit ef831a6). `chooseBrowser({ browser, waitMs, graceMs })` in `broker-client.mjs`, called by `browser_attach` in `server.mjs`; `cdpEndpoint()` appends `&b=<chosen name>`. Reply prefix: `Browser: <name> (requested).` / `(the only one connected).` / `(the system default browser).` followed by the unchanged text. `defaultBrowser` is an option of `brokerClient({ ..., defaultBrowser })`: a function returning a program name or nothing, matched against connected names (exact, then substring); a throw, nothing or no match means unknown and the call fails listing the connected browsers. `server.mjs` passes none yet (ticket 05 wires it). Broker age: the existing `status` reply `uptimeMs` is read against `graceMs` (default 45000); the wait is `waitMs` (default 35000, env `BROWSER_EXT_WAIT_MS`). A requested browser that is not connected throws `notConnected` with the list and `server.mjs` appends the install guide; several connected with no usable default, or a name matching several, fail at once with the list. 9 new tests in `broker-client.choose.test.mjs` (port 9420).
