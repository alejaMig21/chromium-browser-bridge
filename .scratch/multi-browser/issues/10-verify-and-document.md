# 10: Verify with two real browsers, and document

**What to build:** the integration check and the documentation of the whole feature. The live test gets a second stand-in Edge with another profile, both running the new extension, and checks the behaviour end to end. The plugin skill and the project notes describe the new choice and the one manual step.

**Blocked by:** 03, 05, 06, 07, 08, 09

**Status:** claimed

Spec: stories 34, 35, 36 and the "Testing Decisions" of `.scratch/multi-browser/spec.md`.

- [ ] Live test: two stand-in Edge profiles appear as two connected browsers with distinct suffixed names
- [ ] Live test: two MCP sessions, each attached to one of them, work at the same time; closing one browser leaves the other session working
- [ ] Live test: `browser_attach` with no argument and two browsers fails with the list
- [ ] Unit tests, live test (Chrome and the stand-in) and matrix tests all pass; the old single-browser tests were not edited to pass
- [ ] The plugin usage skill explains `browser_attach` with `browser`, the choice order and `list_connected_browsers`
- [ ] The project notes say that the extension must be reloaded once in each browser, and the glossary and ADRs agree with the final behaviour
- [ ] With the user's extension reloaded, the matrix runs on the real Chrome, Edge and Vivaldi pass (the agent runs them; the user only reloads the extension)

## Answer (partial: waits for the user's extension reload)

Done and verified by the agent and again by the maintainer's session (commits c90458c, 5385439): `npm test` 123/123; headless live test chrome 171 checks (baseline 155) and vivaldi 170 (baseline 154), both exit 0, temp root unchanged after each run. Two stand-in Edge profiles with the current extension show as two `msedge-xxxx` entries with distinct ids and tab titles; `browser_attach` with no argument fails and lists both; two sessions work at once; a session switches browser and its previous tab is released; killing one browser gives `msedge-xxxx disconnected. Still connected: msedge.` and the other session keeps working.

Product fix found by the live test: after a browser went away the next call hung 60 s (Playwright waits out `connectOverCDP` and hides the close reason). `server.mjs` `lostBrowserNote()` rebuilds the sentence from the broker's list. Test harness fix: the run now redirects TEMP/TMP of its servers under its own run folder (they leaked `playwright-artifacts-*`). Docs updated: plugin SKILL.md, CLAUDE.md, GLOSSARY.md, ADR 0003.

Pending: the user reloads the extension in Chrome, Edge and Vivaldi, then `node matrix.mjs --browser <chrome|edge|vivaldi> --drive` runs for each with no broker restart. The "different program on a live id" refusal is covered by unit tests only (both live stand-ins are Edge).
