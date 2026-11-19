# 09 Intercept documents only

Status: needs-triage
Blocked by: none

`c.route('**/*')` hops every request of attached tabs through Playwright. Measure the cost on a heavy page first; if real, enforce policy with `Fetch.enable` patterns limited to `resourceType: Document`.
