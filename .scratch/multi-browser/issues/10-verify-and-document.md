# 10: Verify with two real browsers, and document

**What to build:** the integration check and the documentation of the whole feature. The live test gets a second stand-in Edge with another profile, both running the new extension, and checks the behaviour end to end. The plugin skill and the project notes describe the new choice and the one manual step.

**Blocked by:** 03, 05, 06, 07, 08, 09

**Status:** ready-for-agent

Spec: stories 34, 35, 36 and the "Testing Decisions" of `.scratch/multi-browser/spec.md`.

- [ ] Live test: two stand-in Edge profiles appear as two connected browsers with distinct suffixed names
- [ ] Live test: two MCP sessions, each attached to one of them, work at the same time; closing one browser leaves the other session working
- [ ] Live test: `browser_attach` with no argument and two browsers fails with the list
- [ ] Unit tests, live test (Chrome and the stand-in) and matrix tests all pass; the old single-browser tests were not edited to pass
- [ ] The plugin usage skill explains `browser_attach` with `browser`, the choice order and `list_connected_browsers`
- [ ] The project notes say that the extension must be reloaded once in each browser, and the glossary and ADRs agree with the final behaviour
- [ ] With the user's extension reloaded, the matrix runs on the real Chrome, Edge and Vivaldi pass (the agent runs them; the user only reloads the extension)
