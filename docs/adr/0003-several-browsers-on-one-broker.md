# 0003 Several browsers on one broker

Status: accepted, 2026-11-19. Supersedes the "one live extension connection" part of 0001 and the single extension slot of 0002.

## Context

The broker keeps one extension connection. With the extension installed in Vivaldi, Chrome and Edge at once, the first one to connect keeps the slot and the others are refused, so which browser an agent gets depends on a reconnect race, and two Claude sessions cannot work in two different browsers. The official Claude extension supports several browsers (`list_connected_browsers`, `select_browser`) and several profiles of one browser (each installation has its own device id).

A browser cannot be named reliably by what it says about itself: Vivaldi announces itself as "Google Chrome". The extension socket cannot hold a secret (0001), so anything an extension declares about itself is only a label.

## Decision

- Every extension connection is a **connected browser** (or one profile of a browser). The broker keeps one entry per connected browser instead of one slot.
- The name of an entry is taken from the program that opened the connection (`vivaldi`, `msedge`), read by the broker from the operating system, not from the extension. There is no hardcoded list of browsers: any program is accepted, and `list_connected_browsers` shows its full path so a program that is not a browser is visible. Asking for a browser matches when the program name contains the requested name (`edge` finds `msedge`).
- Two profiles of the same browser are told apart by an **instance id** the extension generates once and announces when it connects. Two entries of the same name are shown as `chrome-3f9a`, with the title of the active tab. An extension that does not send an id (not yet updated) works as a single entry identified by its program.
- A session attaches to exactly one connected browser at a time; different sessions may use different ones. `browser_attach` chooses in this order: the browser the agent asked for, the only connected one, the system default browser if it is connected (Windows), otherwise it fails and lists the connected ones. The reply always names the browser it attached to.
- A browser that is asked for and not connected: while the broker is younger than 45 s (extensions reconnect on their own timers) it waits up to 35 s for it; an older broker fails at once with the connected browsers and the install guide.
- A live entry is replaced only by a connection with the same instance id from the same program, or after 45 s of silence. A different program claiming a live id is refused.
- When a browser goes away, only the sessions attached to it are closed; the others keep working and the message names the browser that was lost.
- New read-only tool `list_connected_browsers`: name, program path, instance id when there are several, active tab title, and whether a session is using it.
- The program that opened a connection is identified on Windows (and tested there). Elsewhere the entry is named `browser` plus its id; with one browser connected everything works as before.

## Consequences

- The reconnect race ends: the browser an agent works in is chosen, not lucky.
- Dropping the program list loses little: it only checked a file name, and 0002 already accepts that a process with the user's rights can do more than claim an extension slot. What it gives instead is visibility (path in the list) and a default that only picks the system default browser, so an impostor is never chosen by accident.
- The extension must be updated and reloaded once to announce its instance id; until then it behaves as before.
- Tab ownership is per browser: a tab id is only unique inside one browser.
- Not covered yet: operating systems other than Windows for reading the connecting program, and a name chosen by the user for each profile.
