# 06: Closing one session cut control of both sessions' tabs

**Status:** fixed, pending a real-world recheck by the user

**Report (user, 2026-11-18):** with two Claude sessions on Vivaldi, closing the other session removed the MCP's control over both tabs. Not known whether by chance.

**Cause (confirmed by experiment, not yet seen live):** the broker was started with a "detached" child process. On Windows a detached child is still in its parent's process tree (its parent id is recorded), so killing the tree of the session that started the broker (what closing a session does to its MCP server) also killed the broker, and every other session lost its browser access. Experiment: a detached dummy child died when its parent's tree was killed; a child started through an intermediary that exits at once survived.

**Fix:** the broker is now started through an intermediary on Windows so it has no live parent; elsewhere detached is kept. Unit test: a broker started by a process survives that process's tree-kill. The pre-existing broker on the user's machine was a direct child of a session's server until it was restarted.

**Recheck (user):** after `/mcp` in each session, close the session that started the broker and confirm the other session keeps working. Which session started the broker: `browser_status` does not say; look at the broker's parent process.

**Not verified:** that Claude Code really tree-kills a session's MCP processes on close (the experiment shows the mechanism). The `/mcp` reconnect of the session that started the broker is a free check of it.

**Also found while investigating:** a live-test run had leaked a broker and a test browser. Cleanup is now narrower (this run's folder only, browser and node processes only), has deadlines, runs on exit, sweeps stale runs of earlier crashed runs, and a leftover run folder fails the run.

**Windows-specific:** the intermediary is a Windows technique. macOS and Linux use the plain detached start; unverified there (see `.scratch/browser-parity/cross-browser.md`).

## Live evidence 2026-11-18 (the /mcp check)
The broker that was a direct child of the old server (started by the old detached start) was gone after the user ran /mcp, and broker.json pointed to a dead pid: Claude Code kills the server tree on /mcp, so the mechanism is confirmed live, not only in the experiment. The new broker was started orphaned (parent process gone). Still to repeat by the user: two real sessions, close the one that started the broker, the other keeps working.
