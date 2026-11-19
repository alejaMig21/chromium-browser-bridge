# 07: The `list_connected_browsers` tool and `browser_status`

**What to build:** a new read-only MCP tool, `list_connected_browsers`, like the official extension's. For each connected browser it shows the name, the full path of its program, the instance id when there are several of the same name, the title of its active tab, and whether a session is using it. `browser_status` also reports the connected browsers. The path makes a program that is not a browser easy to spot.

**Blocked by:** 06

**Status:** ready-for-agent

Spec: stories 17, 18, 19, 20, 33 in `.scratch/multi-browser/spec.md`.

- [ ] The tool is listed with the other tools and takes no arguments
- [ ] With two connected browsers the answer has one row each with name, path, active tab title and in-use flag
- [ ] With two profiles of the same browser the rows show their ids (or suffixes)
- [ ] With no connected browser the answer says so and points to `browser_attach`
- [ ] The tool changes nothing (it opens no tab, attaches nothing)
- [ ] `browser_status` shows the same connected browsers
