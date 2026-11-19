# What comes after parity

Goal: a better product than the official extension, not a copy. Ordered by value.

1. **Session broker (ticket 07).** One process owns the extension; every Claude session gets its own tab set. Official handles one agent at a time; this would run several in parallel without fighting over the debugger.
2. **Stop and take over.** A Stop button on the badge and a hotkey that pauses the agent; the user drives, then hands back. The overlay already marks the page.
3. **Per-site permissions (ticket 08)** with a prompt in the extension popup, remembered per domain, plus an audit log the user can open (every navigation and form submit the agent made).
4. **Agent tab group.** Put the agent's tabs in a named, coloured tab group so the user sees at a glance which tabs are the agent's (official does this).
5. **Cheaper reads.** Page text and accessibility tree through `Accessibility.getFullAXTree` / `DOMSnapshot` instead of walking the DOM in JS: fewer tokens, shadow DOM and iframes included.
6. **Recorded runs.** Replay a run as a GIF with the cursor path drawn on it, and as a script the user can re-run without the model.
7. **Document-only interception (ticket 09)** once measured.
8. **Packaging.** Native-messaging host so the extension finds the server without a fixed port, auto-update of the extension, one-click install for Chrome, Edge, Brave and Vivaldi.
