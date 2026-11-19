// What an MCP server uses to reach the broker: find it through the discovery file, start it if nobody answers,
// and talk to its control channel. The CDP socket itself is opened by Playwright against cdpEndpoint().
import { spawn } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { commandLineOf } from './launcher.mjs';
import { discoveryDir } from './platform.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const defaultDir = () => process.env.BROKER_DIR ?? discoveryDir();
const readInfo = dir => { try { return JSON.parse(readFileSync(join(dir, 'broker.json'), 'utf8')); } catch { return null; } };
// A broker this young may not have heard from the extension yet: the extension retries every few seconds, at least every 30.
const EXTENSION_GRACE_MS = 45000;

// Start a broker that outlives the session that started it. On Windows, closing a session kills its MCP server's whole
// process tree, and a merely "detached" child is still in that tree (its parent id is recorded), so the broker would die
// and every other session would lose the browser. Starting it through an intermediary that exits at once leaves it with a
// parent that no longer exists, which is outside the tree (verified with a tree-kill experiment). Elsewhere detached is enough.
export function spawnBroker({ dir, port = 9340 }) {
  const script = join(here, 'broker.mjs');
  if (process.platform !== 'win32') return spawn(process.execPath, [script, '--dir', dir, '--port', String(port)], { detached: true, stdio: 'ignore' }).unref();
  const q = s => `'"${String(s).replaceAll("'", "''")}"'`; // PowerShell single-quoted string holding a double-quoted argument
  const node = String(process.execPath).replaceAll("'", "''");
  const command = `Start-Process -FilePath '${node}' -ArgumentList ${[script, '--dir', dir, '--port', port].map(q).join(',')} -WindowStyle Hidden`;
  spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'ignore', windowsHide: true }).unref();
}

export function brokerClient({ sessionId, port = 9340, dir = defaultDir(), log = () => {} }) {
  let info = null, ctl = null;
  const waiting = new Map();
  let n = 0;

  const open = i => new Promise(resolve => {
    const ws = new WebSocket(`ws://127.0.0.1:${i.port}/control?t=${i.token}&s=${sessionId}`, { handshakeTimeout: 3000 });
    ws.once('open', () => resolve(ws));
    ws.once('error', () => resolve(null));
    ws.once('unexpected-response', () => resolve(null));
  });
  function adopt(ws) {
    ctl = ws;
    ws.on('message', d => { try { const m = JSON.parse(d.toString()); waiting.get(m.id)?.(m); waiting.delete(m.id); } catch { /* ignore a bad frame */ } });
    ws.on('error', () => {});
    ws.on('close', () => { if (ctl === ws) ctl = null; for (const f of waiting.values()) f({ error: 'The browser broker disconnected.' }); waiting.clear(); });
  }

  // Connect to the running broker; with start=true, start one if nobody answers and wait (bounded) until it does.
  async function ensure(start = true) {
    if (ctl?.readyState === WebSocket.OPEN) return;
    const found = readInfo(dir);
    let ws = found && await open(found);
    if (ws) info = found;
    else {
      if (!start) throw new Error('The browser broker is not running.');
      spawnBroker({ dir, port });
      for (let i = 0; i < 40 && !ws; i++) { await sleep(250); const f = readInfo(dir); ws = f && await open(f); if (ws) info = f; }
      if (!ws) throw new Error(`The browser broker did not start (port ${port}). Is another program using it?`);
    }
    adopt(ws);
    log('connected to the broker on port', info.port);
  }

  async function rpc(method, params = [], { start = true } = {}) {
    await ensure(start);
    const id = ++n;
    const reply = new Promise(r => waiting.set(id, r));
    if (ctl?.readyState !== WebSocket.OPEN) throw new Error('The browser broker disconnected.');
    ctl.send(JSON.stringify({ id, method, params }));
    let timer;
    const m = await Promise.race([reply, new Promise(r => { timer = setTimeout(() => r({ error: `${method} timed out waiting for the broker` }), 20000); })]);
    clearTimeout(timer);
    waiting.delete(id);
    if (m.error) throw new Error(m.error);
    return m.result;
  }

  return {
    ensure,
    // The broker may have just started, so the extension gets a bounded time to reconnect to it; one that has been up
    // longer and still has no extension means the extension is really not there.
    async waitForExtension(ms) {
      for (let end = Date.now() + ms; ; await sleep(500)) {
        const st = await rpc('status');
        if (st.extension) return true;
        if (st.uptimeMs > EXTENSION_GRACE_MS || Date.now() >= end) return false;
      }
    },
    cdpEndpoint: () => `ws://127.0.0.1:${info.port}/cdp?t=${info.token}&s=${sessionId}`,
    // Reading state never starts a broker: with none running these report that, instead of resurrecting one.
    status: () => rpc('status', [], { start: false }).catch(() => ({ connected: false })),
    unclaimed: () => rpc('unclaimed', [], { start: false }).catch(() => []),
    // For the cross-browser matrix runner only (see bridge.mjs): which tab is whose, and the extension's reveal/hide.
    tabs: prefix => rpc('tabs', [prefix], { start: false }),
    reveal: tabId => rpc('reveal', [tabId], { start: false }),
    hide: shown => rpc('hide', [shown], { start: false }),
    // Dropping the control socket lets an idle broker stop; the next call reconnects.
    close: () => ctl?.close(),
  };
}

// True when the command line has `--dir <value>` with exactly this value (quoted or not) and runs broker.mjs.
export function sameDir(commandLine, dir) {
  const norm = p => p.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
  const m = /"?--dir"?\s+(?:"([^"]+)"|(\S+))/.exec(commandLine ?? '');
  return commandLine.includes('broker.mjs') && !!m && norm(m[1] ?? m[2]) === norm(dir);
}

// Stop the broker that owns `dir`, only after its command line proves the pid is a broker started with this dir.
export async function stopBroker(dir = defaultDir()) {
  const i = readInfo(dir);
  if (!i) return false;
  if (!sameDir((await commandLineOf(i.pid)) ?? '', dir)) return false;
  try { process.kill(i.pid); } catch { return false; }
  rmSync(join(dir, 'broker.json'), { force: true });
  return true;
}
