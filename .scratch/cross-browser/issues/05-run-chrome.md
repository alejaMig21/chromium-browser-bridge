# 05: Matrix run on Chrome

**What to build:** run the matrix on the user's Chrome (extension installed by hand with "Load unpacked"; branded Chrome ignores the command-line load switch), record the column, and fix whatever fails by testing behaviour, never the browser's name, noting where each workaround was first seen.

**Blocked by:** 02, 04

**Status:** resolved

- [ ] The user has installed the extension in Chrome and done the manual steps the runner lists.
- [ ] The Chrome column is saved in the results file with version and system.
- [ ] Every failure is either fixed (with a test) or recorded with its cause in the cross-browser audit note.

## Update 2026-11-19

The manual rows no longer need you: after the one human step (install the extension with "Load unpacked", `extension/` folder, in this browser), run `node matrix.mjs --browser chrome --drive`. The runner then minimizes and restores the window (Windows only, no focus taken), switches tabs through the extension, opens a second session and closes it, and writes the table itself. Proven on the real Vivaldi (see `results.md`). Installed on the maintainer machine.

## Answer 2026-11-19

Run with `node matrix.mjs --browser Chrome --drive` on the maintainer machine (Chrome 154, Windows 11): 10 of 10 rows pass, see `results.md`. The runner found and fixed along the way: (1) the screenshot size in the reply (innerHeight 672) disagreed with the image (674) on Chrome at 125% scaling; the reply now reports the size of the image; (2) attach failed when the tab in front was a browser page (the new-tab page, `edge://extensions`); it now attaches with no tab and the session opens its own; (3) a minimized window is judged by the system, not by `screenX` (Chrome keeps reporting 0). Limit found: the broker serves ONE browser at a time (the first extension to connect keeps the slot), so with several browsers open the runner checks which one holds it and refuses to file results under another name.
