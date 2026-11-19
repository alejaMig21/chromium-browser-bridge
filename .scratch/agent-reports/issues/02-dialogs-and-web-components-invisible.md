# 02 Dialog and web-component controls are invisible to `read_page` and `find`

**Status:** fixed, pending a real-world recheck by the user

**Report:** same session as ticket 01 (Shopify Dev Dashboard and Shopify admin, attached Vivaldi).

**Evidence (exact):**
1. `https://dev.shopify.com/dashboard/000000000/apps/new`: after pressing Enter in the form, a "Release version" dialog opened. `get_page_text` listed `Release version / App name / claude-admin / Description (optional) / Cancel / Release`. But `read_page {filter: "interactive"}` and `read_page {filter: "all", ref_id: <main>}` did not list the dialog, `find "Release button in dialog"` returned `No elements matching`. The "Release" button had no ref, so it could not be clicked.
2. The page's own top bar button "Create app" is also missing from the `read_page` tree and from `find "Create app"` (only the `main` landmark matched).
3. `https://admin.shopify.com/store/example-store/settings/apps/development`: `get_page_text` returned `Build apps in Dev Dashboard` and `Learn more`; `read_page {filter: "interactive"}` returned `(no matching elements)`; `find` found nothing. Earlier, the same page returned an empty body for `get_page_text` and `read_page` even after 14 s.

**Hypothesis (not verified):** these pages use web components with shadow roots, and a modal in the top layer; `pageTree` in `server.mjs` (around line 315) probably walks only the light DOM.

**Acceptance (write the failing test first against a local fixture page):**
- Fixture with an open shadow root containing a button, and a `<dialog>` opened with `showModal()` containing "Cancel" and "Release" buttons.
- `read_page {filter: "interactive"}` lists those buttons with refs; `find "Release"` returns the ref; `computer left_click {ref}` clicks it (including a click inside a shadow root).
- A role=dialog or `<dialog>` is shown as a dialog node in the tree, so an agent knows a modal is blocking the page.
- `form_input` works on controls inside shadow roots.
- Live check on the user's Vivaldi at the Dev Dashboard "Create app" flow: the "Release" button gets a ref.
- Update the plugin skill if any limit remains.

## Answer

Cause: `pageTree` in `server.mjs` walked only `el.children` (light DOM), and `vis` dropped any element without a box, which includes `display:contents` wrappers around web-component internals, so everything under them vanished. Reproduced first: `read_page` on a shadow-root fixture returned `(no matching elements)`, the exact report.

Fix: `pageTree` walks open shadow roots, treats `display:contents` as a visible container, shows `<dialog>` and `role=dialog|alertdialog` as `dialog "<name>" [ref]`, and starts with `NOTE: modal dialog open: "<name>" - the rest of the page is inert until it is closed.` when a `:modal` one is open. Refs, `find`, `computer left_click {ref}` and `form_input` work on those elements unchanged (they use the element handle).

Tests: 8 checks in `live-test.mjs` (fixtures `/shadow` and `/dialog`; red before, green after). Chrome live 129/129. Limit: a closed shadow root cannot be read from the page; the skill does not need a change for it beyond this note.

**Recheck (user):** at the Dev Dashboard "Create app" flow ask an agent for `read_page interactive` with the Release dialog open: the Release button must have a ref.
