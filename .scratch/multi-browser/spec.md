# Several browsers on one broker

Status: ready-for-agent

Source of the decisions: `docs/adr/0003-several-browsers-on-one-broker.md` (read it first), vocabulary in `GLOSSARY.md` (**Connected browser**, **Instance id**, Broker, Session, Extension, Owned tab, Unclaimed tab, Work tab).

## Problem Statement

I keep Vivaldi, Chrome and Edge open, each with the Local Browser Bridge extension. The broker has room for only one extension connection, so the first browser that connects wins and the other two are refused. Which browser my agent controls depends on a reconnect race: after every broker restart I have to retry until the browser I wanted wins. Two Claude sessions cannot work in two different browsers at the same time, and two profiles of one browser (for example Chrome "Personal" and Chrome "Work") cannot both be connected. The official Claude extension handles all of this; this project must do the same. On top of that, my cross-browser matrix runner has to restart the broker until the right browser wins before it can test it.

## Solution

Every extension that connects to the broker becomes a **connected browser**. The broker keeps one entry per connected browser. A session chooses the browser it works in when it attaches, and a new read-only tool shows which browsers are connected. The broker names each browser after the program that opened the connection (read from the operating system, because a browser's own name for itself is unreliable: Vivaldi calls itself Google Chrome), so there is no list of browsers in the code. Two profiles of the same browser are told apart by an instance id each extension generates once. Nothing changes for someone with one browser: it works with no argument, as today.

## User Stories

1. As a user with several browsers open, I want every browser with the extension to be connected at once, so that none is refused because another got there first.
2. As a user, I want to pick the browser my agent works in, so that the choice no longer depends on a reconnect race.
3. As a user with one browser connected, I want `browser_attach` to work with no argument, so that nothing I already do changes.
4. As an agent, I want to call `browser_attach` with a browser name, so that I work in the one the user asked for.
5. As an agent, I want a name like `edge` to find the browser whose program is `msedge`, so that I do not need to know program file names.
6. As an agent, I want `browser_attach` called with no argument and several browsers connected to use the system default browser when it is connected, so that I get the browser the user normally uses.
7. As an agent, I want that same call to fail and list the connected browsers when the default is not connected, so that I never guess.
8. As an agent, I want the reply of `browser_attach` to name the browser I got and say whether it was chosen or the default, so that I know where I am working.
9. As a user, I want two Claude sessions to work in two different browsers at the same time, so that one agent in Vivaldi and another in Edge do not disturb each other.
10. As a user, I want one session to use one browser at a time, so that its tab numbers and work tab stay unambiguous.
11. As an agent, I want to switch browser by calling `browser_attach` with another browser name, and the tabs of the previous browser to be released, so that no tab stays held by a session that left.
12. As a user, I want two profiles of the same browser to be connected at once, as in the official extension, so that Personal and Work are both reachable.
13. As an agent, I want two entries of the same browser named with a short suffix (`chrome-3f9a`), so that I can ask for the right one.
14. As an agent, I want each entry to show the title of its active tab, so that I can tell two profiles apart by what they show.
15. As a user, I want an extension that has not been updated to keep working as a single entry identified by its program, so that nothing breaks before I reload it.
16. As a user, I want the extension to keep the same instance id for as long as it is installed, so that names and reconnects are stable.
17. As an agent, I want the new read-only tool `list_connected_browsers`, so that I can see what is connected before choosing.
18. As an agent, I want that tool to show each browser's name, the full path of its program, the instance id when there are several, the active tab title and whether a session is using it, so that a program that is not a browser is easy to spot.
19. As a user, I want a program that is not a browser to be visible in that list by its path, so that I notice an impostor.
20. As a user, I want the default choice to pick only the system default browser, so that an impostor entry is never chosen by accident.
21. As an agent who asks for a browser that is not connected, I want to wait up to 35 seconds when the broker has just started, so that extensions that are still reconnecting have time to appear.
22. As an agent who asks for a browser that is not connected, I want an immediate failure with the connected browsers and the install guide when the broker is older than 45 seconds, so that I do not wait for nothing.
23. As a user, I want a live entry to be replaced only by a connection with the same instance id from the same program, or after 45 seconds of silence, so that a service worker restart reconnects cleanly and a copied id from another program is refused.
24. As a user, I want a different program that claims a live instance id to be refused and logged, so that it cannot take over a browser.
25. As a user, I want that when one browser closes only the sessions attached to it are closed, so that agents working in other browsers are not interrupted.
26. As an agent whose browser closed, I want the message to say which browser was lost and which are still connected, so that I can attach to another.
27. As a user, I want a tab to belong to one session per browser (a tab id is only unique inside one browser), so that a Chrome tab and a Vivaldi tab with the same number never collide.
28. As a user, I want unclaimed tabs to be offered and listed per browser, so that the foreground tab of the browser I chose is the one offered.
29. As a user on Windows, I want the broker to identify the program that opened each connection, so that names are reliable.
30. As a user on another operating system, I want the entry to be named `browser` plus its id and everything to work when only one is connected, so that the feature degrades instead of breaking.
31. As a maintainer, I want the cross-browser matrix runner to choose the browser with `browser_attach` instead of restarting the broker until it wins, so that testing each browser is deterministic.
32. As a maintainer, I want the matrix runner's check that the attached browser is the one asked for to rely on the browser list, so that results are never filed under the wrong name.
33. As a user, I want `browser_status` to report the connected browsers, so that I can see the state at a glance.
34. As a maintainer, I want the plugin skill to explain choosing a browser and the default order, so that agents use it correctly.
35. As a user, I want the extension update to be the only step I do by hand (reload it in each browser), so that the rest needs no action.
36. As a maintainer, I want the discovery and trust notes in the ADRs to stay true, so that the next reader sees one story.

## Implementation Decisions

- **Broker (bridge).** The single extension slot becomes a collection of entries keyed by browser. Each entry holds the extension socket, its program name and path, its instance id (or none), its last-seen time, and the sessions attached to it. All per-browser state that is global today becomes per entry: pending extension calls, the owner of each tab, the tabs offered to a session, and the capture state. A tab id is only unique inside one entry, so ownership is keyed by entry and tab.
- **Identifying the program.** When an extension socket opens, the broker asks a small, replaceable component which program owns the connecting end (on Windows from the system's TCP table; verified that the browser's network process shows as the browser's own `.exe`). The component is passed in when the bridge is built, so tests inject names and a separate test exercises the real one. If it cannot answer (other systems, no permission), the entry is named `browser`.
- **Name rules.** The entry name is the program file name without extension, lower case (`vivaldi`, `msedge`). A request matches an entry when the entry's program name contains the requested name (so `edge` finds `msedge`, `chrome` does not find `chromium`). When two entries have the same name, each is shown as the name plus the first four characters of its instance id. There is no list of browsers; any program is accepted and its full path is shown.
- **Extension.** On connect it announces an instance id: a random id generated the first time and kept in the extension's own storage. Everything else the extension does is unchanged. Extensions that do not announce an id are legacy entries keyed by program only.
- **Replacement rule (ADR 0001 revised).** A live entry (seen in the last 45 s) is replaced only by a connection that carries the same instance id from the same program path. A connection from a different program claiming a live id is refused and logged. A silent entry (over 45 s) can be replaced by anyone, as before.
- **Choosing a browser.** The sessions' CDP connection names the entry it wants. `browser_attach` takes the optional `browser` argument and resolves in this order: the requested browser; the only connected one; the system default browser if connected (read from the system's default-browser setting on Windows; elsewhere this step is skipped); otherwise failure listing the connected browsers. The reply names the browser attached and how it was chosen. Asking for a browser that is not connected waits up to 35 s while the broker is younger than 45 s, and otherwise fails at once with the list and the existing install guide for the requested browser.
- **One browser per session.** A session is attached to one entry at a time. Attaching to another releases the tabs held in the first.
- **Disconnects.** When an entry's extension disconnects, only the sessions attached to that entry are closed, with a message naming the lost browser and the connected ones. Other entries and their sessions are untouched.
- **Control channel.** New requests: the list of connected browsers (name, program path, instance id when ambiguous, active tab title, whether a session uses it), used by the new tool, by `browser_status` and by the matrix runner. The existing requests (extension status, unclaimed tabs, reveal and hide, tabs by prefix) take the browser entry they apply to. The status request reports the number of connected browsers instead of one extension flag.
- **MCP server.** New read-only tool `list_connected_browsers`. `browser_attach` gets the `browser` argument (it already accepts one to tailor install help; the new meaning is the choice, and the install-help behaviour stays when the browser is not connected). Tab numbering stays per session.
- **Matrix runner.** Chooses the browser with `browser_attach`, checks the connected list instead of restarting the broker until the right one wins, and keeps refusing to file results under another browser's name.
- **Documentation.** The plugin usage skill explains the choice order and `list_connected_browsers`; the project notes mention the extension update and reload.
- **Compatibility.** With one browser connected and no argument, behaviour is unchanged. An old extension works as one legacy entry. Nothing in the data stored on disk changes (the discovery file keeps its fields).

## Testing Decisions

- A good test drives the broker through its sockets (the extension socket, a session's CDP socket, the control socket) and checks only what a client sees: replies, events, refusals, lists, closes. It does not read the broker's internal tables.
- **Main seam: the broker against a fake extension**, with the "which program opened this connection" component injected. Covers: two fake browsers connect and both stay; names from injected programs; requested name matching (`edge` finds `msedge`, `chrome` does not match `chromium`); two entries of the same name get suffixes; a legacy extension without an id; choosing by argument, by the only entry, by the default (injected), and the listed failure; the 35 s wait versus the immediate failure (with short injected deadlines); replacement rules (same id and program replaces, different program refused, silence replaces); one browser closing closes only its sessions and the message names it; a tab id that exists in two browsers does not collide; unclaimed and offered tabs per browser; the list request and the status request. Prior art: the existing broker tests that use a fake extension, a scripted session client and a control client.
- **One test of the real component**, Windows only: connect from the test process to the broker and check the answer is the Node program with its path; skipped elsewhere.
- **Live test with two real browsers**: the existing live test gets a second stand-in Edge with another profile, both running the new extension, checking that both appear as two entries with suffixes, that two MCP sessions work in one each at the same time, that closing one leaves the other working, and that `browser_attach` with no argument fails with the list. Prior art: the live test's existing stand-in browser and its second-session checks.
- **Matrix runner**: its existing unit tests with a fake browser get the new selection behaviour; the real runs on Chrome, Edge and Vivaldi must pass with no broker restarts.
- Regression: with one browser, the existing unit and live tests pass unchanged.

## Out of Scope

- Reading the connecting program on operating systems other than Windows (the entry is named `browser` there). To be done later.
- A name chosen by the user for each profile (the official extension asks for one when connecting). To be done later if needed.
- A session controlling two browsers at once.
- A list of known browsers or any check that the program is a browser.
- Brave and Opera runs of the matrix (not installed on the maintainer machine).
- A secret shared between the extension and the broker (native messaging), still the open item of ADR 0002.

## Further Notes

- The extension must be reloaded once in each browser to announce its instance id; until then it works as a legacy entry.
- User rule for this project: whatever the official Claude extension does, this project does too; the official extension's multi-browser tools (`list_connected_browsers`, `select_browser`) are the reference. Its pairing prompt and `switch_browser` are not needed here.
- The order of the matrix runner's checks is unchanged; only how it picks the browser changes.
