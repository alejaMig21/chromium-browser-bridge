# 0001 Local trust boundary of the bridge

Status: accepted, 2026-11-18

## Context

The bridge listens on `127.0.0.1:9340`. Two clients: the extension (`/extension`) and the MCP server (`/cdp`). A web page cannot reach either (Origin and Host checks). A local program can send any headers.

## Decision

- `/cdp` needs a random per-process token, known only to the server process. Other local programs cannot drive the browser through it.
- `/extension` cannot hold a secret (the extension has no private channel to learn one), so it is identified by its public id. A live extension connection is never replaced; a local program can only claim the slot while no extension is connected or after 45 s of silence.

## Consequences

- A local program that claims a free `/extension` slot can read what the agent sends and feed it fake results, but it cannot drive the user's browser.
- A local program with the user's privileges can already read the profile folder; this boundary does not try to stop that.
- Closing the slot fully needs a secret shared with the extension (native messaging). Tracked as a ticket if the threat model grows.

Update 2026-11-18: the per-process token part is superseded by ADR 0002 (token now lives in the broker discovery file).

Update 2026-11-19: the single extension slot is superseded by ADR 0003 (one entry per connected browser; a live entry is still never replaced by a different program).
