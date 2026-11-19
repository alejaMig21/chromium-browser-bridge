# 03 `computer` key and click actions return no feedback

**Status:** resolved

**Report:** same session as ticket 01. With the "Release" button hidden (ticket 02) and screenshots refused (ticket 01), the agent fell back to the keyboard: `key Tab` (repeat 3) then `key Enter`.

**Evidence (exact):** the tool answered only `Pressed Tab`, `Pressed Enter`, `Clicked at (876, 139)`. After Tab x3 + Enter, and a wait of 60 s, the dialog was still open and the agent could not tell which element had focus, whether the click landed, or whether the form was submitting. The agent had to stop.

**Acceptance:**
- After `key`, `left_click`, `type`, `scroll`, return one extra line: the focused element (role, accessible name), whether a dialog is open (name), and the URL if it changed. Example: `focus: button "Cancel" | dialog: "Release version" | url: unchanged`.
- Keep it to one short line (agents pay per token).
- Include shadow-root elements (depends on ticket 02 for the walk; share the helper).
- Covered by a fixture-page test; the plugin skill mentions the line.

**Not verified:** whether `Tab` x3 in the real dialog reached "Release" or "Cancel". That is exactly the information the missing feedback hides.

## Answer

Every `computer` action that acts (click, double/triple/right click, hover, type, key, scroll, scroll_to, drag) now ends with one line: `focus: <role "name"> | dialog: <"name" or none> | url: <unchanged or the new url>`. It reuses the role/name helpers of `pageTree` through a `focusOnly` mode (one cheap look, no tree walk), follows focus into shadow roots, and reads `:modal` for the dialog. A page that is loading gives `focus: unknown (page is loading)` instead of an error; the call waits 100 ms so a click that navigates reports the new url.

Tests: 5 checks in `live-test.mjs` (key Tab into a shadow-root button inside a modal, click, type, scroll, navigating click); red before, green after. Chrome live 134/134, unit 69/69. SKILL.md documents the line.

Status of the Tab x3 question in the report ("did it reach Release or Cancel?"): answered by the line itself from now on; the old session cannot be replayed.

**Recheck (user):** none needed beyond the shared Dev Dashboard check of ticket 02.
