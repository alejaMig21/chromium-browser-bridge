# 04: Matrix runner

**What to build:** one command runs the cross-browser behaviours against a real browser that already has the extension installed, and writes one results table (browser, version, system, behaviour, pass or fail, evidence) saved in the repo. It never takes focus or moves the mouse; steps that need the user (install the extension, minimize the window, open a second session) are printed as a short checklist and waited for. Its first real run is on Vivaldi to prove nothing regressed.

**Blocked by:** 01

**Status:** resolved

- [x] The runner covers: attach, read, click, new tab with a URL, screenshot, screenshot while minimized (manual step), tab switch keeps the work tab, popup still opens, two sessions on one broker, closing the session that started the broker keeps the other working (manual step).
- [x] The table records browser version and operating system and is saved under one results file.
- [x] Tested against a scripted fake browser, including that it does not touch the user's screen.
- [x] First real run on the user's Vivaldi saved as the first column of the matrix.

## Answer
Runner built and tested against a scripted fake browser (matrix.test.mjs). First real run on the user Vivaldi 2026-11-18: 6 automatic behaviours pass (attach, create tab with URL, read, click, screenshot size incl. a background tab via reveal, popup native); the 4 manual rows are skipped with --auto and are run by the user with: node matrix.mjs --browser vivaldi (answers the questions in the terminal). Results: .scratch/cross-browser/results.md.
