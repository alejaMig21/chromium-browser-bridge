// The broker as a real process, and the helpers sessions use to find it and stop it.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sameDir, stopBroker } from './broker-client.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const root = mkdtempSync(join(tmpdir(), 'broker-test-'));
const started = [];
const startBroker = (dir, port, idle) => {
  const p = spawn(process.execPath, [join(import.meta.dirname, 'broker.mjs'), '--dir', dir, '--port', String(port)], { stdio: 'ignore', env: { ...process.env, BROKER_IDLE_MS: String(idle) } });
  started.push(p);
  return p;
};
const exited = p => new Promise(r => (p.exitCode !== null ? r(p.exitCode) : p.once('exit', r)));
after(() => { for (const p of started) p.kill(); rmSync(root, { recursive: true, force: true }); });

test('the broker publishes port, token and pid, and a second broker on the same port leaves the file alone', async () => {
  const dir = join(root, 'a');
  const first = startBroker(dir, 9394, 60000);
  for (let i = 0; i < 40 && !existsSync(join(dir, 'broker.json')); i++) await sleep(100);
  const info = JSON.parse(readFileSync(join(dir, 'broker.json'), 'utf8'));
  assert.equal(info.port, 9394);
  assert.match(info.token, /^[0-9a-f]{32}$/);
  assert.equal(info.pid, first.pid);
  const second = startBroker(join(root, 'b'), 9394, 60000);
  assert.equal(await exited(second), 0, 'the second broker leaves quietly');
  assert.equal(existsSync(join(root, 'b', 'broker.json')), false, 'and writes no discovery file');
  assert.equal(JSON.parse(readFileSync(join(dir, 'broker.json'), 'utf8')).pid, first.pid);
  first.kill();
});

test('a broker with no sessions stops by itself and removes its file', async () => {
  const dir = join(root, 'idle');
  const p = startBroker(dir, 9395, 1000);
  for (let i = 0; i < 40 && !existsSync(join(dir, 'broker.json')); i++) await sleep(100);
  assert.ok(existsSync(join(dir, 'broker.json')));
  assert.equal(await exited(p), 0);
  assert.equal(existsSync(join(dir, 'broker.json')), false);
});

test('BROKER_IDLE_MS=0 means never stop, like BROWSER_IDLE_MS', async () => {
  const dir = join(root, 'never');
  const p = startBroker(dir, 9396, 0);
  await sleep(1500);
  assert.equal(p.exitCode, null, 'still running');
  assert.ok(existsSync(join(dir, 'broker.json')));
  p.kill();
});

test('stopBroker only stops a process whose command line carries exactly this dir', async () => {
  const dir = join(root, 'stop');
  const p = startBroker(dir, 9397, 60000);
  for (let i = 0; i < 40 && !existsSync(join(dir, 'broker.json')); i++) await sleep(100);
  assert.equal(await stopBroker(join(root, 'stop-other')), false, 'a different dir is not ours');
  assert.equal(p.exitCode, null);
  assert.equal(await stopBroker(dir), true);
  assert.equal(await exited(p) !== undefined, true);
});

// Closing a Claude session kills the process tree of its MCP server (taskkill /T on Windows). A broker that session
// started must outlive it, or every other session loses its browser access.
test('a broker started by a session survives the tree-kill of that session\'s process', { skip: process.platform !== 'win32' }, async () => {
  const dir = join(root, 'survive');
  const parent = spawn(process.execPath, ['--input-type=module', '-e', `import { spawnBroker } from ${JSON.stringify(new URL('./broker-client.mjs', import.meta.url).href)}; spawnBroker({ dir: ${JSON.stringify(dir)}, port: 9398 }); setTimeout(() => {}, 60000);`], { stdio: 'ignore', env: { ...process.env, BROKER_IDLE_MS: '60000' } });
  started.push(parent);
  for (let i = 0; i < 60 && !existsSync(join(dir, 'broker.json')); i++) await sleep(100);
  const { pid } = JSON.parse(readFileSync(join(dir, 'broker.json'), 'utf8'));
  const alive = p => { try { process.kill(p, 0); return true; } catch { return false; } };
  assert.ok(alive(pid));
  spawn('taskkill', ['/PID', String(parent.pid), '/T', '/F'], { stdio: 'ignore' });
  await sleep(1500);
  assert.equal(alive(pid), true, 'the broker is still running after its starter was tree-killed');
  assert.equal(await stopBroker(dir), true);
});

test('sameDir compares the --dir argument exactly, quoted or not', () => {
  assert.equal(sameDir('node.exe broker.mjs --dir C:\\x\\broker --port 9340', 'C:\\x\\broker'), true);
  assert.equal(sameDir('node.exe broker.mjs --dir "C:\\x y\\broker" --port 9340', 'C:\\x y\\broker'), true);
  assert.equal(sameDir('"node.exe" "C:\\x\\broker.mjs" "--dir" "C:\\x y\\broker" "--port" "9340"', 'C:\\x y\\broker'), true, 'every argument quoted, as a launcher may start it');
  assert.equal(sameDir('node.exe broker.mjs --dir C:\\x\\broker2 --port 9340', 'C:\\x\\broker'), false);
  assert.equal(sameDir('node.exe other.mjs --dir C:\\x\\broker', 'C:\\x\\broker'), false);
});
