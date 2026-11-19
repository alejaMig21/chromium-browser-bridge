# 06 After an agent session, the user's page renders in a shrunken area and the user's clicks stop working

**Status:** fixed, pending a real-world recheck by the user

**Priority:** highest. This breaks the user's own browser, which `CLAUDE.md` promises never to disturb.

**Report (user, 2026-11-18 23:36, with screenshot):** the agent was attached to the user's Vivaldi on `https://admin.shopify.com/store/example-store/app/grant?...` (the Shopify "Install app" approval page). The user could not click "Install": their clicks did nothing and the page looked wrong. The screenshot shows the page content drawn in a rectangle of about 1530 x 800 px, with white (unpainted) area to the right and below, inside a window of 1920 px width; the tab was marked as being captured/debugged (green tab with a cast icon). Vivaldi also showed "Restart Required" in the toolbar (probably unrelated; not checked).

**What the agent did in that tab before the report:** `navigate`, `get_page_text`, `read_page`, `find`, `javascript_tool`, `computer wait`, and several failing `computer zoom` / `screenshot` calls (ticket 01: `Only screenshots from surface are allowed.`). On the earlier `admin.shopify.com/.../settings/apps/development` page one `zoom` call succeeded.

**Fix applied during the session (workaround):** `browser_close {keepBrowser: true}` ("Detached from the user's own browser"). Whether this restored the page is not yet confirmed by the user; the recheck is below.

**Hypotheses (not verified):**
1. A viewport or device-metrics override stays active on the tab after a `zoom` / `screenshot` attempt (Playwright applies one when it captures over CDP). A failed capture may leave it set. The repo has no direct `Emulation.*` call (searched `*.mjs`), so the override would come from the Playwright layer in `server.mjs`, or from the bridge's `chrome.debugger` path.
2. The overlay (glow, cursor, badge) intercepts pointer events or resizes the page.
3. The debugger stays attached (tab still marked) and blocks input.

**Acceptance:**
- Reproduce on a real attached Vivaldi tab: record viewport size and `window.innerWidth/innerHeight` before, after a successful capture, after a failed capture, and after `browser_close`.
- After any tool call (including a failed capture) and after detach, the tab's layout, painting and the user's mouse clicks are as before. Add a check to `live-test.mjs` (click a button by real mouse event after a capture) and a unit test for the bridge detach path.
- Capture code restores whatever it changed in a `finally`, on every exit path.
- On detach (`browser_close`, `/mcp` reconnect, session end) clear all emulation, the overlay and any debugger attachment; add a line to `browser_status` showing debugger attached yes/no.
- Never leave the tab unusable: if cleanup fails, the tool says so and tells the user the exact step to recover (reload the tab).
- Update `plugin/browser-cdp/skills/browser-cdp/SKILL.md`: tell agents to call `browser_close {keepBrowser: true}` before asking the user to click something themselves.

**Recheck (user):** with Vivaldi open on any page, ask an agent to take a screenshot and fail it on a background tab, then click something yourself; clicks must work and the page must fill the window.

## Answer

Not premeditated: a side effect of captures. Playwright always sends `Page.captureScreenshot` with a `clip` whose `scale` is below 1 under `scale:"css"` at DPR 1.25 (that option is ours, ticket 01 of browser-parity) and, for a region past the viewport (the reporter's `zoom` [0,0,1280,720]), `captureBeyondViewport`. Chromium resizes the page while such a capture runs and restores it when it ends. A capture that never ends (tab painted nothing, ticket 01) or two that overlap leave the page resized until the debugger detaches, which is why `browser_close` helped. Confirmed in a headless Chrome experiment: three overlapping clip captures left `visualViewport.width` at 984 instead of 968.8. Not reproduced on a real covered Vivaldi window.

Fix, all in `bridge.mjs` (the one path every capture takes): captures of one tab run one at a time; a capture that failed or timed out at any step is followed by `Emulation.clearDeviceMetricsOverride` (or the size the agent set on purpose with `resize_window`, remembered per tab and forgotten on a fresh attach). `browser_status` reports `debuggerAttached`. SKILL.md tells agents to `browser_close {keepBrowser:true}` before asking the user to click.

Tests (red first): five in `bridge.sessions.test.mjs` (clear after a retried capture, nothing extra on a clean one, no overlap, agent size kept, size forgotten on re-attach); `live-test.mjs` checks size unchanged and a real click lands after clip, beyond-viewport and overlapping captures, plus `debuggerAttached`. The live checks cannot fail in headless (nothing hangs there), so they only guard regressions. `npm test` 69/69; Vivaldi live 120/120.

**Recheck (user):** `/mcp`, then with Vivaldi covered or minimized ask an agent for a screenshot and a `zoom` with a large region; then click something yourself: the page must fill the window and clicks must work.

### Addendum (2026-11-19)

Root cause removed instead of cleaned up: no capture uses a clip any more (see ticket 01, addendum 2), so nothing resizes the page while a capture runs. `Session.capture` no longer needs to clear or restore a size override.
