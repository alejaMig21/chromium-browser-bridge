// Browser lifecycle for server.mjs: find, start, probe and stop the browser that exposes the CDP port.
// Only a process whose command line carries OUR profile directory is ever killed.
import { spawn, execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { BROWSER_NAMES, browserPaths, commandLineCommand, killTree, listCommand, parseProcessList, pickBrowserPid } from './platform.mjs';

const fwd = s => s.replaceAll('\\', '/');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// A known browser name is looked for in its usual places for this system (platform.mjs); anything else is a path.
export function resolveBrowser(which, exists = existsSync, where = {}) {
  const known = BROWSER_NAMES.includes(which);
  const candidates = known ? browserPaths(which, where.platform, where.env, where.home) : [which];
  const exe = candidates.find(exists);
  if (!exe) throw new Error(`Browser not found: ${candidates[0]}`);
  return { name: known ? which : basename(fwd(exe)).replace(/\.exe$/i, ''), exe };
}

// Chromium ignores the debug port on the default profile, hence one dedicated profile dir per browser.
export function launchArgs({ name, port, root, headless }) {
  return [
    `--user-data-dir=${fwd(root)}/profile-${name}`,
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--no-first-run',
    '--no-default-browser-check',
    ...(headless ? ['--headless=new'] : []),
  ];
}

export const ownsProcess = (commandLine, name, root) => fwd(commandLine).includes(`--user-data-dir=${fwd(root)}/profile-${name}`);

export async function cdpUp(endpoint) {
  try { const r = await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(1500) }); return r.ok ? await r.json() : null; } catch { return null; }
}

export async function waitForCdp(endpoint, ms = 20000) {
  for (const t = Date.now(); Date.now() - t < ms; await sleep(300)) { const v = await cdpUp(endpoint); if (v) return v; }
  throw new Error(`Browser did not open its debug port at ${endpoint} within ${ms / 1000}s.`);
}

// Vivaldi never announces targets created after Playwright connects, and it swaps its first tab while starting up.
// So wait until at least one tab exists and the set of tabs has not changed for `stableMs`, then attach.
export async function waitForPage(endpoint, ms = 25000, stableMs = 3000) {
  let last = '', since = Date.now();
  for (const t = Date.now(); Date.now() - t < ms; await sleep(500)) {
    const list = await fetch(`${endpoint}/json/list`, { signal: AbortSignal.timeout(1500) }).then(r => r.json(), () => []);
    const key = list.filter(x => x.type === 'page').map(x => x.id).sort().join(',');
    if (key !== last) { last = key; since = Date.now(); }
    if (key && Date.now() - since >= stableMs) return;
  }
  throw new Error(`Browser at ${endpoint} did not settle on a tab within ${ms / 1000}s.`);
}

// Vivaldi's launcher exits and hands over to another process, so the pid we spawned is not the browser's.
export async function findBrowserPid(name, port) {
  const { file, args } = listCommand(process.platform);
  return pickBrowserPid(parseProcessList(await run(file, args)), name, port);
}

export function startBrowser(exe, args) {
  const p = spawn(exe, args, { detached: true, stdio: 'ignore' });
  p.unref();
  return p.pid;
}

const run = (file, args) => new Promise(res => execFile(file, args, { windowsHide: true }, (err, stdout) => res(err ? null : String(stdout).trim())));
export const commandLineOf = pid => { const { file, args } = commandLineCommand(pid, process.platform); return run(file, args); };

// 'ours' = the pid runs a browser with our profile dir, 'dead' = no such process, 'foreign' = pid was reused by something else.
export async function ownership({ pid, name }, root) {
  const cl = await commandLineOf(pid);
  if (!cl) return 'dead';
  return ownsProcess(cl, name, root) ? 'ours' : 'foreign';
}
export const isOwned = async (state, root) => (await ownership(state, root)) === 'ours';

// Kill the browser tree we launched, after proving by its command line that the pid still is ours.
export async function killOwned(state, root) {
  if (!(await isOwned(state, root))) return false;
  await killTree(state.pid, { run });
  return true;
}

// One state file per debug port, so two servers (or a test run) never overwrite each other's record.
export const statePath = port => join(tmpdir(), `claude-browser-cdp-state-${port}.json`);
export const loadState = port => { try { return JSON.parse(readFileSync(statePath(port), 'utf8')); } catch { return null; } };
export const saveState = s => writeFileSync(statePath(s.port), JSON.stringify(s));
export const clearState = port => rmSync(statePath(port), { force: true });
