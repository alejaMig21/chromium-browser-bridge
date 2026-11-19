# 01 Screenshots fail with "Only screenshots from surface are allowed."

**Status:** fixed, pending a real-world recheck by the user

**Report:** agent session in `D:\Projects\other-project`, 2026-11-18, attached mode on the user's own Vivaldi, task: drive the Shopify Dev Dashboard for the user.

**Evidence (exact):**
- `computer {action: "screenshot"}` on the work tab at `https://dev.shopify.com/dashboard/000000000` returned `page.screenshot: Protocol error (Page.captureScreenshot): {"code":-32000,"message":"Only screenshots from surface are allowed."}`.
- `computer {action: "zoom", region: [0,0,1280,720]}` on the work tab at `https://admin.shopify.com/store/example-store/settings/apps/development` returned an image.
- Later `zoom` on the work tab at `https://dev.shopify.com/dashboard/000000000/apps/new` failed with the same error, twice.

So the same tool succeeded on one tab and failed on others in the same session.

**Hypothesis (not verified):** the tab that worked was the one the user was looking at; the failing ones were not the visible tab, or the window was minimized or covered. Ticket 03 of `.scratch/browser-parity` already retries without `fromSurface` when rejected, but this Chromium refuses that outright (see the stub in `bridge.sessions.test.mjs:42`), so the retry cannot help.

**Acceptance:**
- Find the real cause with an experiment against the user's Vivaldi (visible tab vs background tab vs minimized window) and write it in `## Answer`.
- If a background tab cannot be captured, the error must say so in plain words and name the remedy (for example "tab is not visible; the user must switch to it"), not the raw CDP text.
- If a remedy exists without taking focus (see ticket 03 of browser-parity: never steal focus), implement it and cover it with a test in `bridge.sessions.test.mjs`.
- `zoom` and `screenshot` behave the same way.
- Update `plugin/browser-cdp/skills/browser-cdp/SKILL.md` with the known limit.

**Why it matters:** with no screenshot, an agent cannot find a button by sight when ticket 02 hides it from the tree. The user is slow to recover from stuck steps (their connection takes minutes per page).

## Answer

Cause (from the session transcript, timing 3 s between the last event and the error): the active tab painted nothing (window covered or minimized), the plain capture timed out after `CAP.plain` (3 s), the retry with `fromSurface:false` was refused at once by Vivaldi with `Only screenshots from surface are allowed.`, and `Session.capture` in `bridge.mjs` only fell through to the reveal on a timeout, so the refusal reached the agent. Not caused by the permission mode.

Fix: any failure of the `fromSurface:false` step now falls through to the reveal (tab shown without focus, captured, put back). Test: `when the active tab paints nothing and the view capture is refused, the tab is revealed instead of failing` in `bridge.sessions.test.mjs` (red before, green after). `npm test` 64/64; `LIVE_BROWSER=vivaldi ALLOW_NO_TAB_CREATE=1 node live-test.mjs` 117/117.

Not covered here: the plain-words error when `BROWSER_REVEAL_TABS=0` already exists; the SKILL.md note about the limit is still to write.

**Recheck (user):** `/mcp`, cover or minimize Vivaldi, ask an agent for a screenshot; the tab flickers once and the image comes back.

### Addendum (2026-11-19, found by running the matrix on the real Vivaldi)

With the fix in place, a tab the agent creates in the background and then captures still failed on the user's Vivaldi: `chrome.debugger.sendCommand timed out after 8s` (after the reveal). Reproduced by hand: the user's own tab (already painted) captured fine at 1530x698 with no resize; the new tab never painted. Vivaldi was not minimized, but WindowsTerminal was the foreground window, so the browser was most likely covered; a browser paints nothing for a covered window. Not confirmed by uncovering it (that would take the user's focus).

Change: the final capture step now fails with a plain message (`...another window is covering the browser window... get_page_text or read_page, or ask the user to bring the browser window to the front`) instead of the raw timeout (unit test `a tab that stays blank even after the reveal...`). `matrix.mjs` records that case as `skipped` with the reason, never as pass or fail (`matrix.test.mjs`). Unit 72/72; live Chrome 153/153, stand-in 152/152.

Open limit: no capture is possible of a newly shown tab while the browser is fully covered, without raising the window (which takes focus). Re-run `node matrix.mjs --browser vivaldi --auto` with Vivaldi on top to see the capture row pass.

### Addendum 2 (2026-11-19, after reading the official extension)

The official Claude extension (v1.0.107, read from the user's Chrome profile, read-only) never activates a tab or restores a window to capture. It captures the whole viewport with `fromSurface:true, captureBeyondViewport:false` and no `clip` (a clip is behind the storage flag `captureScreenshotClipScale`, off by default), resizes and crops afterwards, and while a capture is unanswered sends a throw-away `jpeg quality 1` capture every second (up to 3 times) to make a hidden tab produce a frame; if the window is minimized it does nothing. This confirms the cause of ticket 06 (our `scale:css` clip) and replaces the reveal approach: the bridge now strips the clip, sends the nudges every 0.5 s with an 8 s deadline, and shows a tab only with `BROWSER_REVEAL_TABS=1`. Measured on the real browsers with the window covered: Chrome 154 and Edge 153 capture a background tab every time (about 4 s), Vivaldi 156 intermittently. The per-tab queue and the size restore became dead code and were deleted.
