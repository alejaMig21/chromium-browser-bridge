# 02: Several browsers connected at once, named by program

**What to build:** two (or more) extensions can be connected to the broker at the same time and none is refused. Each connection is a **connected browser** named after the program that opened it (program file name without extension, lower case). Two entries with the same name are shown with a four-character suffix of their id. An extension that sends no instance id works as a single entry identified by its program. The program that opened a connection comes from a replaceable component passed in when the bridge is built; its default answer is `browser`. A control request lists the connected browsers, and a session's CDP connection says which entry it wants.

**Blocked by:** 01

**Status:** ready-for-agent

Spec: stories 1, 5, 13, 15, 29, 30 in `.scratch/multi-browser/spec.md`.

- [ ] Two fake extensions with different injected program names connect and both stay connected
- [ ] A request for `edge` matches the entry whose program is `msedge`; `chrome` does not match `chromium`
- [ ] Two entries with the same program name get distinct suffixed names
- [ ] A legacy extension (no instance id) connects as one entry named after its program
- [ ] The control request that lists connected browsers returns name, program path and whether a session uses it
- [ ] A session connected to one entry cannot see or command the tabs of another entry
- [ ] With the default component every entry is named `browser` and a single connected browser still works with no argument
