# 08: Session lifecycle with several browsers

**What to build:** a session works in one browser at a time; attaching to another browser releases the tabs it held in the first. When a browser's extension disconnects (the browser closed), only the sessions attached to that browser are closed, with a message that names the browser that was lost and the ones still connected; sessions in other browsers keep working. A tab id that exists in two browsers never collides.

**Blocked by:** 04

**Status:** resolved

Spec: stories 9, 10, 11, 25, 26, 27, 28 in `.scratch/multi-browser/spec.md`.

- [ ] Two sessions in two browsers keep working when one of the two extensions disconnects (the other's session is unaffected)
- [ ] The session of the browser that went away is closed with a message naming that browser and listing the connected ones
- [ ] Attaching the same session to another browser releases its tabs in the first, which another session can then take
- [ ] Two tabs with the same id in two browsers are owned and commanded independently
- [ ] The foreground tab offered at attach is the foreground tab of the chosen browser, and unclaimed tabs are listed per browser

## Answer

Done (commit 7e9e6de, merged). New disconnect close reason (max 120 chars) in `bridge.mjs` `onExtension` close handler: `<lost name> disconnected. Still connected: <names, comma-separated, or "none">`, e.g. `msedge disconnected. Still connected: chrome, vivaldi`; it replaces `extension disconnected`. Only one existing expectation changed (`bridge.browsers.test.mjs`, "one browser going away closes only its own sessions"). 5 new tests in `bridge.lifecycle.test.mjs` (port 9450). Already delivered by tickets 02/04 and now pinned by tests: only the lost browser's sessions close; switching a session to another browser releases its tabs in the first; a tab id in two browsers never collides; foreground tab and unclaimed list per browser.

Extra, in `server.mjs` (no test seam there, only `node --check`): `browser_attach` answered "Already attached" even when another browser was named, so story 11 was impossible. It now remembers `attachedName` and switches when the named browser differs (`chooseBrowser` first, so a failed choice keeps the old attachment, then `disconnect()`). **Not exercised live yet: ticket 10's live test must cover the switch.**
