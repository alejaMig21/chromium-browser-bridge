# 03: Launched mode on macOS and Linux

**What to build:** `browser_launch` finds and starts Chrome, Edge, Brave, Opera, Vivaldi or Chromium with a debug port on macOS and Linux, using the platform layer, with the rule that only a process carrying this tool's own marker is ever stopped. Real verification on a Mac or Linux machine stays a manual step.

**Blocked by:** 01

**Status:** resolved

- [x] Browser discovery covers the usual locations on macOS (application bundles) and Linux (packages and bundles) for each supported browser.
- [x] Starting, status and closing the launched browser use the platform layer's process handling; ownership is proven by command line before any stop.
- [x] Unit tests with the platform injected cover discovery, start arguments and the ownership refusal for a foreign process. (macOS and Linux were not run on a real machine: manual step, see ticket 09.)
- [x] Windows behaviour is unchanged (existing live test passes).
