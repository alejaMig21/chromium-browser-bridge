# 09: The matrix runner picks the browser with `browser_attach`

**What to build:** the cross-browser matrix runner chooses the browser it tests with `browser_attach` and checks the list of connected browsers, instead of the maintainer restarting the broker until the right browser wins. It still refuses to file results under another browser's name, now by comparing against the connected browser it attached to.

**Blocked by:** 04, 07

**Status:** ready-for-agent

Spec: stories 31, 32 in `.scratch/multi-browser/spec.md`.

- [ ] The runner's unit tests (fake browser) cover choosing by name and refusing when the browser is not connected
- [ ] A run for a browser that is not connected is recorded as a refused run with the list of connected browsers, and nothing else is filed
- [ ] With the new extension in Chrome, Edge and Vivaldi, a run for each passes without restarting the broker (needs the user to reload the extension first; see ticket 10)
- [ ] Results are never filed under a name other than the attached browser's
