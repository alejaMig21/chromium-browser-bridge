# 03: Identify the connecting program (Windows)

**What to build:** on Windows the broker learns from the operating system which program opened each extension connection (its file name and full path), so the names in ticket 02 are real. Verified beforehand: the browser's network process shows as the browser's own executable (for example Vivaldi's). On other systems, or when the lookup fails, the answer stays `browser`.

**Blocked by:** 02

**Status:** resolved

Spec: stories 29, 30 in `.scratch/multi-browser/spec.md`.

- [ ] A test connects from the test process to the broker and the real component answers the Node program with its full path (Windows only, skipped elsewhere)
- [ ] The component is the default of the bridge; tests that inject their own are unaffected
- [ ] A lookup that fails or times out gives `browser` and never blocks or breaks the connection
- [ ] The program path appears in the control request that lists connected browsers

## Answer

Done (commit 8cd758f). `programOfConnection` in `platform.mjs` is the default `identify` of `startBridge`. Windows only: `netstat -ano -p tcp` finds the row whose local port is the peer's port and foreign port is the bridge's, then one `powershell (Get-Process -Id N).Path` gives the path. Any failure, garbage or no answer within 2 s gives `undefined` (entry named `browser`); non-loopback peers skipped; off Windows nothing runs. Latency 446-512 ms per lookup (median ~470 ms), so each extension connect waits about half a second before its handshake completes; `Get-NetTCPConnection` took 1.7 s and `wmic` is deprecated. Real test in `identify.test.mjs` (ports 9410-9419): the `browsers` control request returns `program` = `process.execPath`, name `node`. One existing test in `bridge.browsers.test.mjs` got a one-line edit (`identify: () => undefined`) because its premise, "the default answers nothing", changed on purpose.
