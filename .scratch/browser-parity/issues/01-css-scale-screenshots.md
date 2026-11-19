# 01 Screenshots in CSS pixels

Status: resolved
Blocked by: none

Screenshot PNG size must equal the CSS viewport size reported in the tool text, so coordinates from the image land where the model aimed. Evidence: grill.md Q2 (744x453 image vs 595x362 viewport at DPR 1.25).

Acceptance: at DPR 1.25 the `screenshot` image dimensions equal `innerWidth x innerHeight`; `zoom` regions use the same unit.

## Answer
Done 2026-11-18. Verified by live-test.mjs (Chrome 97/97, Vivaldi 96/96) and npm test (18/18). Details in the checks named with this ticket number.
