# 07: Matrix run on Brave

**What to build:** run the matrix on the user's Brave with the real extension, record the column, and fix failures by behaviour, noting where each workaround was first seen.

**Blocked by:** 02, 04

**Status:** ready-for-human

- [ ] The user has installed the extension in Brave and done the manual steps.
- [ ] The Brave column is saved with version and system.
- [ ] Every failure is fixed with a test or recorded with its cause.

## Update 2026-11-19

The manual rows no longer need you: after the one human step (install the extension with "Load unpacked", `extension/` folder, in this browser), run `node matrix.mjs --browser brave --drive`. The runner then minimizes and restores the window (Windows only, no focus taken), switches tabs through the extension, opens a second session and closes it, and writes the table itself. Proven on the real Vivaldi (see `results.md`). Not installed on the maintainer machine, so this ticket needs a machine that has it.
