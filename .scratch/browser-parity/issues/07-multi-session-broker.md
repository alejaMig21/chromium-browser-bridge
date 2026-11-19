# 07 Several Claude sessions at once

Status: superseded by .scratch/multi-session-broker/spec.md (resolved)
Blocked by: none

Each MCP server binds 9340; the second cannot attach. Needs one broker process that owns the extension socket and hands each session its own tab set. Do not solve with multiple ports: `attachOnce` would detach another session's debugger.
