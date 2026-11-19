# 03: Identify the connecting program (Windows)

**What to build:** on Windows the broker learns from the operating system which program opened each extension connection (its file name and full path), so the names in ticket 02 are real. Verified beforehand: the browser's network process shows as the browser's own executable (for example Vivaldi's). On other systems, or when the lookup fails, the answer stays `browser`.

**Blocked by:** 02

**Status:** ready-for-agent

Spec: stories 29, 30 in `.scratch/multi-browser/spec.md`.

- [ ] A test connects from the test process to the broker and the real component answers the Node program with its full path (Windows only, skipped elsewhere)
- [ ] The component is the default of the bridge; tests that inject their own are unaffected
- [ ] A lookup that fails or times out gives `browser` and never blocks or breaks the connection
- [ ] The program path appears in the control request that lists connected browsers
