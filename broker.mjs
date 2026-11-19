// The broker: one process that owns the bridge port and the connection to the browser extension, shared by every
// Claude session's MCP server. Started on demand by broker-client.mjs; stops itself after BROKER_IDLE_MS with nobody
// attached or talking to it (0 = never stop).
//   node broker.mjs --dir <discovery dir> [--port 9340]
import { mkdirSync, renameSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startBridge } from './bridge.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const dir = arg('dir');
const port = Number(arg('port', 9340));
const idleMs = Number(process.env.BROKER_IDLE_MS ?? 30 * 60 * 1000);
const IDLE_MS = Number.isFinite(idleMs) && idleMs >= 0 ? idleMs : 30 * 60 * 1000;
if (!dir) { console.error('broker.mjs needs --dir'); process.exit(2); }

// One bad message must not take every session's browser access down.
process.on('uncaughtException', e => console.error('uncaughtException:', e));
process.on('unhandledRejection', e => console.error('unhandledRejection:', e));

const bridge = startBridge({ port, log: (...a) => console.error('[broker]', ...a) });
// Another broker already owns the port: leave quietly, the sessions will use that one.
try { await bridge.listening; } catch (e) { console.error(`broker not started: ${e.message}`); process.exit(0); }

// Sessions find the broker through this file (port + token). It is written only after the port is ours, so a
// second broker that lost the race never overwrites it, and atomically, so a reader never sees half of it.
// The folder is under the user's local app data, whose ACL is the user's alone (mode 0600 helps on other systems).
mkdirSync(dir, { recursive: true });
const file = join(dir, 'broker.json');
writeFileSync(`${file}.${process.pid}.tmp`, JSON.stringify({ port, token: bridge.token, pid: process.pid }), { mode: 0o600 });
renameSync(`${file}.${process.pid}.tmp`, file);

let idleSince = Date.now();
const timer = IDLE_MS === 0 ? null : setInterval(() => {
  if (bridge.busy()) idleSince = Date.now();
  else if (Date.now() - idleSince >= IDLE_MS) stop();
}, Math.min(5000, Math.max(250, IDLE_MS / 4)));

function stop() {
  clearInterval(timer);
  try { if (JSON.parse(readFileSync(file, 'utf8')).pid === process.pid) rmSync(file, { force: true }); } catch { /* already gone */ }
  bridge.close();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
