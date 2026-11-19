# Cross-browser audit: what is general, what was proven only on Vivaldi

Date: 2026-11-18. Goal of the project: any Chromium-based browser (Chrome, Edge, Brave, Vivaldi, Opera, Arc...), not Vivaldi in particular. This note separates what was designed for all of them from what was only observed on one.

## Proven on which browser

| Behaviour | Where it was actually exercised |
|---|---|
| Whole tool set, attach through the extension, multi-session, overlay, CSS-scale screenshots | Headless Edge with the extension (stand-in "user browser") + launched Chrome and launched Vivaldi |
| Minimized-window capture (view capture, then restore-without-focus and minimize again) | Real Vivaldi only, by hand. Headless cannot minimize |
| Empty tab after `chrome.tabs.create` fixed by `Page.navigate` | Real Vivaldi only. Unit test uses a fake extension; no real Chrome/Edge/Brave run |
| Two sessions on one broker | Real Vivaldi (two Claude sessions) + stand-in Edge in the live test |

## Fixes that are general by design (triggered by a condition, not by browser name)

- Navigate an empty tab: runs only when the new tab's URL is empty. In a browser that already loads the URL it does nothing. Risk: a browser that reports an empty URL for a tab that is still loading would get a second navigation to the same URL (harmless but wasteful). Not observed.
- Capture fallback chain: plain capture, then capture from the view, then restore the window. Each step runs only if the previous one times out. `fromSurface: false` is a Chromium CDP parameter, but its behaviour on macOS and Linux is not checked.
- Overlay, work tab, ownership, token, policy: plain DOM and CDP, no browser-specific code.

## Things that are NOT portable today (be honest about them)

- **Windows only.** `launcher.mjs` finds browsers by Windows paths, reads `LOCALAPPDATA`, and uses PowerShell for process checks; `broker-client.mjs` stores the discovery file under `LOCALAPPDATA`. macOS and Linux are untested and partly unsupported.
- **Chromium only.** The extension needs `chrome.debugger`; Firefox and Safari do not offer it.
- **Branded Chrome ignores `--load-extension`:** the live test uses Edge as stand-in, and for Chrome the user must install the extension by hand (Load unpacked). Not exercised.
- Minimized-window detection in the notes uses `screenX` -25600 (a Windows value); the code itself asks the extension for the window state, so it does not depend on that number.

## Verification matrix to run later (ticket 10)

For each of Chrome, Edge, Brave, Opera, Vivaldi, on a real window with the real extension: attach; two sessions; create a tab with a URL; capture while minimized; switch tabs while working; popup (OAuth) still opens. Record pass/fail per cell here. Then macOS/Linux once the launcher is made portable.

## Added 2026-11-18 (broker start)

- Starting the broker so it survives the tree-kill of the session that started it uses a Windows-only technique (an intermediary process). On macOS and Linux the plain detached start is used; whether a session close takes the broker down there is unverified. Matrix row to add: close the session that started the broker and check the other session on each system.
- Chromium browsers differ in how they treat `chrome.tabs.create`: Vivaldi leaves the tab empty. The fix is conditional on the empty URL; other browsers are expected to be unaffected, not yet confirmed.

## Added 2026-11-18 (matrix, first real run)

- **Background tabs cannot be captured on any Chromium browser** (a hidden tab paints nothing). Seen first on Vivaldi: a tab opened by the broker (inactive) timed out on every capture, and `Page.bringToFront` through the debugger did not activate it. Fix is general by design: a tab that is not the active one of its window is revealed (made active, window restored without focus) for the capture and the user's tab and window are put back. It flickers the user's tab for a moment; `BROWSER_REVEAL_TABS=0` turns it off. Confirmed on Vivaldi after the fix: see `.scratch/cross-browser/results.md`. Other browsers: unverified.
- **Relay ordering bug** (replies overtaken by events) was found on the headless Edge stand-in, not on a real browser; it affects any browser.
- `Target.attachToBrowserTarget` is refused on purpose, so `newCDPSession` does not work through the extension on any browser.
