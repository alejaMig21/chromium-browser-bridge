# 09: The matrix runner picks the browser with `browser_attach`

**What to build:** the cross-browser matrix runner chooses the browser it tests with `browser_attach` and checks the list of connected browsers, instead of the maintainer restarting the broker until the right browser wins. It still refuses to file results under another browser's name, now by comparing against the connected browser it attached to.

**Blocked by:** 04, 07

**Status:** resolved

Spec: stories 31, 32 in `.scratch/multi-browser/spec.md`.

- [ ] The runner's unit tests (fake browser) cover choosing by name and refusing when the browser is not connected
- [ ] A run for a browser that is not connected is recorded as a refused run with the list of connected browsers, and nothing else is filed
- [ ] With the new extension in Chrome, Edge and Vivaldi, a run for each passes without restarting the broker (needs the user to reload the extension first; see ticket 10)
- [ ] Results are never filed under a name other than the attached browser's

## Answer

Done (commit efe32e5; `matrix.mjs`, `matrix.test.mjs` only). The `attach` row calls `browser_attach` with `{ browser }` and reads the chosen name from the reply line `Browser: <name> (requested)`; no broker restart is involved. If the attach fails, the runner calls `list_connected_browsers` and files one row, "attached browser is the one asked for", as `fail` with `asked for X, but it is not connected. Connected: a, b.`; no tab is opened and nothing else is filed. The check keeps its place (after tab creation and the UA read), now also fails when the attached name does not contain the requested one, keeps the brand and Chromium-major checks, and no longer carries the "one browser at a time" advice. 3 new tests in `matrix.test.mjs` (17 total), the fake seam gained `connected`/`attachesTo`; no existing test edited. Full `npm test`: 123/123.

The third checkbox (real Chrome, Edge and Vivaldi without broker restarts) is verified in ticket 10, after the user reloads the extension.
