# Agent reports

Field reports from agents that used this MCP for real work (not from `live-test.mjs`). One file per report in `issues/NN-slug.md`, numbered from `01`.

## For the maintainer session

User prompt: "fix the errors reported by other agents". Do this:

1. List `issues/` and take every file whose `**Status:**` is `ready-for-agent` (first number first).
2. Read the ticket, reproduce the failure with a test (Strict TDD), fix it, run `npm test`, then run `live-test.mjs` against the real browser named in the ticket.
3. Append the proof under `## Answer`, set `**Status:** resolved`. When the fix needs the user's real browser (attached mode), set `**Status:** fixed, pending a real-world recheck by the user` and write the exact recheck steps.
4. Tickets marked `ready-for-human` need the user; list them at the end with the exact step.

## For an agent that hit a problem

Add `issues/NN-slug.md` with: **Status:** `needs-triage`, **Report** (who, when, what task), **Evidence** (exact tool calls and error text), **Hypothesis** (label it as such), **Acceptance** (testable). Do not fix it in the same session unless asked. Use the terms in `GLOSSARY.md`.

## Index

| # | Problem | Status |
|---|---|---|
| 01 | Screenshots fail with "Only screenshots from surface are allowed." on some attached tabs | fixed, pending recheck by the user |
| 02 | Dialog and web-component controls are invisible to `read_page` and `find` | fixed, pending recheck by the user |
| 03 | `computer` key and click actions return no feedback | resolved |
| 04 | No way to wait for a slow page; empty reads do not say the page is loading | resolved |
| 05 | Tab ids change between calls; a tab opened by the work tab is left unclaimed | fixed, pending recheck by the user |
| 06 | After a session the user's page renders in a shrunken area and their clicks stop working (do first) | fixed, pending recheck by the user |
