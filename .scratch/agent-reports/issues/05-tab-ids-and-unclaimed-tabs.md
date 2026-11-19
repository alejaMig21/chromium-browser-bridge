# 05 Tab ids change between calls; a tab opened by the work tab is left unclaimed

**Status:** fixed, pending a real-world recheck by the user

**Report:** same session as ticket 01, attached Vivaldi, one real tab.

**Evidence (exact, `tabs_context_mcp` outputs in order):**
- `Tab ID: 1 | Home · Dev Dashboard | https://dev.shopify.com/dashboard/000000000 | work tab`
- after one `navigate` in that tab: `Tab ID: 2 | Apps · Dev Dashboard | ...` with no `work tab` mark
- later `Tab ID: 3 | Create an app ... | work tab`, then `Tab ID: 4 | Shopify | https://admin.shopify.com/store/example-store/...` after the user's own navigation
- after clicking a button on tab 4 that opened the Dev Dashboard in a new tab: `Tab ID: 4 ... | work tab` plus `Unclaimed tab | https://dev.shopify.com/dashboard/000000000 | not attached to any session` (no id shown)
- `browser_attach` again moved the work tab to the new tab (`Tab ID: 5`); the old tab dropped out of the list.

The number kept changing although the user had one tab open, so an id the agent remembered was stale on the next call. The unclaimed tab had no usable id.

**Hypothesis (not verified):** a new id is minted on every cross-origin navigation (new CDP target), and a tab opened by the work tab (`target=_blank`) is not recognised as a child of the owned tab.

**Acceptance:**
- Reproduce with a test page: navigate across origins in the work tab and assert the id the agent holds stays valid (stable id mapped to the current target).
- A tab opened by the work tab (`window.open`, `target=_blank`) is claimed by the same session at once, listed with its id, and usable with `tabId`; the work tab does not move unless the agent asks.
- `Unclaimed tab` rows always show an id.
- `browser_attach` called again while the work tab is alive keeps it (no silent re-pointing); the reply says which tab is the work tab.
- Live check on the user's Vivaldi (see `GLOSSARY.md`: Owned tab, Unclaimed tab, Work tab).

## Answer

Cause (from the transcript, not the ticket hypothesis): tab ids changed per **reconnection**, not per navigation. In attached mode `doTrack` gave every tracked page `nextId++`, so each new Playwright connection renumbered the tabs: the agent called `browser_attach` again at 04:15:22, 04:22:43 and 04:24:02 and the ids went 3, 4, 5; the first jump (1 to 2) came after a 6 hour gap, a silent reconnect. Cross-origin navigation does NOT mint a new id: a live check navigates 127.0.0.1 to localhost and the id stays. A tab the page opens had no id because the bridge only claimed tabs the user activated, and only for a session with no tab.

Fix:
- `browser_attach` while a live attachment exists changes nothing and answers `Already attached ... Work tab: Tab ID N` (`server.mjs`).
- A tab keeps its number across reconnects: remembered by url (`idByUrl`), taken only if no live tab already has it. Limit: if the tab navigated while disconnected it gets a new number.
- A tab opened by an owned tab is claimed by the same session at once (`claimOpened` in `bridge.mjs`, on `tabs.onCreated` and `onActivated`, using `openerTabId`, which the extension now forwards in `slim`). The work tab does not move.
- `Unclaimed tab (browser tab N)` rows always carry the browser tab id.

Tests (red first): bridge unit tests for the opener claim and the id on unclaimed tabs; 10 checks in `live-test.mjs`. Unit 70/70; Vivaldi/Edge-stand-in live 152/152; Chrome live 153/153.

**Recheck (user), needs one step first:** the extension changed (`extension/bg.js`), so open the browser's extensions page and press Reload on "Local Browser Bridge" (without it, the opened-tab claim does not work in your Vivaldi; the other fixes do), then `/mcp` in every session. Then ask an agent to click a `target=_blank` link: the new tab must appear with its own id and the work tab must not move.
