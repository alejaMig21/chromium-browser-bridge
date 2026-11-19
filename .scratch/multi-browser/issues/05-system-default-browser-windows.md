# 05: The system default browser (Windows)

**What to build:** the "use the system default browser" step of ticket 04 reads the real setting on Windows (the program that opens web links) and matches it to a connected browser by program. On this maintainer machine it must resolve to Vivaldi. On other systems the step is skipped and the choice falls through to the list.

**Blocked by:** 04

**Status:** ready-for-agent

Spec: story 6 in `.scratch/multi-browser/spec.md`.

- [ ] The component returns the default browser's program name from the Windows setting (verified on this machine: Vivaldi)
- [ ] It is the default component of the choice in ticket 04
- [ ] A setting that is missing or points to a program that is not connected makes the choice fall through to the list, not fail with an error of its own
- [ ] The match between the setting and a connected browser uses program names, with no list of browsers
- [ ] On a system that is not Windows the step is skipped
