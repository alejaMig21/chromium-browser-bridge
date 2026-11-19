# 06: Profiles: instance id, replacement rules, old extension

**What to build:** two profiles of the same browser can be connected at once, as in the official extension. The extension generates a random instance id the first time it runs, keeps it, and announces it when it connects. Two entries of the same browser show as the name plus the first four characters of the id, with the title of their active tab. A live entry (seen in the last 45 seconds) is replaced only by a connection with the same instance id from the same program; a different program claiming a live id is refused and logged; a silent entry (over 45 seconds) can be replaced by anyone. An extension that has not been updated keeps working as a single entry identified by its program.

**Blocked by:** 02

**Status:** resolved

Spec: stories 12, 13, 14, 15, 16, 23, 24 in `.scratch/multi-browser/spec.md`.

- [x] The extension's instance id survives a restart of the extension (kept in its own storage) and is announced on every connect
- [x] Two fake extensions with the same injected program and different ids are both connected and named with distinct suffixes
- [x] The listing of connected browsers shows the active tab title of each
- [x] The same id from the same program replaces its own stale connection at once (service worker restart)
- [x] The same id from a different program is refused while the entry is live, and the refusal is logged
- [x] After 45 seconds of silence the entry can be replaced by another connection
- [x] A legacy extension (no id) connects as before and works with one browser and no argument

## Answer

Replacement rule in `bridge.mjs` `onExtension` (`staleMs` option, default 45000, injectable). Same id and same program replaces a live entry at once; other program on a live id is refused (`extension already connected`) and logged; silent entry is taken by anyone (entry program updated); legacy (no id) unchanged. Title: the extension sends `{ method: "extension.title", params: [title] }` (empty string for a non-http tab; a non-string is ignored, absent means `""`); `browsers` now lists `title`. Extension keeps a `crypto.randomUUID()` in `chrome.storage.local` (new `storage` permission) and connects as `/extension?i=<id>`. Tests: `bridge.profiles.test.mjs` (ports 9440+). ADR 0001 update paragraph revised. Needs the user browser: reload the extension, check the id persists across a service worker restart and two profiles show as `name-xxxx` with titles.
