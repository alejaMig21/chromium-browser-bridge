# Spec: browser-parity

Goal: close the experience gap with the official extension and keep the advantages (no account, local, any Chromium). See `grill.md` for evidence.

## User stories

1. As the user, what the model sees in a screenshot matches where its clicks land, on any display scale.
2. As the user, I can switch tabs or minimize the browser and the agent keeps working on its own tab, without being pulled back to the foreground.
3. As the user, I see where the agent is: a glow around the page, a moving cursor and a "Claude is working" badge, on the work tab only.
4. As the user, no other program on my PC can drive my browser through the bridge.
5. As the user, pages that need popups (OAuth) still work in my real browser.
6. As a maintainer, the docs say what the code does.

## Decisions

- Screenshots use `scale: 'css'`. Viewport size reported in the tool text stays CSS pixels.
- The work tab is set at `browser_attach` (the foreground tab) and moves only when the agent acts with an explicit `tabId` or creates a tab. Switching tabs by the user adds offered tabs but never changes the work tab. `tabs_context_mcp` lists all attached tabs and marks the work tab.
- Capture never calls `bringToFront`. Order: plain capture with a short timeout; on failure, restore a minimized window without focusing it (extension API `chrome.windows.update {state:'normal', focused:false}`), retry once. Focus emulation stays on for attached pages.
- Overlay is injected by the server with `evaluate` on every tool call (and again after `navigate`), built with DOM APIs and a constructed stylesheet (CSP and Trusted Types safe), closed shadow root, `pointer-events:none`, `aria-hidden`. Hidden while a screenshot is taken (counter for parallel captures), faded after 10 s without actions, removed when the work tab moves away and on disconnect. No extension change.
- `/cdp` requires a random per-process token in the URL query; `cdpEndpoint()` includes it and error messages redact it. A live extension connection is never replaced by a second one claiming its id (ping silence over 45 s frees the slot).
- `tabs_create_mcp` opens tabs inactive: the user is never pulled off their tab.
- Closing a side tab does not move the work tab. The work tab moves only to a tab that passed the internal-page and policy checks.
- `window.open` patch only in launched mode.
- Out of scope now (tickets 07-09): multi-session broker, per-site permission prompts, document-only request interception.

## Verification

Unit tests for the token. Live checks (headless Edge stand-in) for CSS-scale dimensions, work-tab pinning, no focus theft calls, overlay present/absent in screenshots, popup patch absent in attached mode. Real-window checks (minimize, tab switch) are done live with the user on their own Vivaldi after everything else passes: the user reloads the extension and `/mcp`, minimizes the window, and the agent takes a screenshot and clicks.
