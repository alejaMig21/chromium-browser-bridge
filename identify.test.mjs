// Which program opened a connection to the bridge: the Windows lookup (netstat for the owning pid, then its executable path).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';
import { ownerPid, programOfConnection } from './platform.mjs';

const NETSTAT = [
  '  Proto  Local Address          Foreign Address        State           PID',
  '  TCP    127.0.0.1:9340         0.0.0.0:0              LISTENING       100',
  '  TCP    127.0.0.1:9340         127.0.0.1:50111        ESTABLISHED     100',
  '  TCP    127.0.0.1:50111        127.0.0.1:9340         ESTABLISHED     4242',
  '  TCP    127.0.0.1:50222        127.0.0.1:9340         ESTABLISHED     777',
].join('\r\n');

test('the owner of a connection is the process on the client side of the socket, not the listener', () => {
  assert.equal(ownerPid(NETSTAT, 50111, 9340), 4242);
  assert.equal(ownerPid(NETSTAT, 50222, 9340), 777);
});

test('no matching row gives no pid', () => {
  assert.equal(ownerPid(NETSTAT, 50999, 9340), undefined);
  assert.equal(ownerPid('', 1, 2), undefined);
});

test('a lookup that fails, answers garbage or hangs gives nothing, within the bound, and never throws', async () => {
  const req = { socket: { localPort: 9340 } };
  const ask = run => programOfConnection({ req, remoteAddress: '127.0.0.1', remotePort: 50111 }, { run, timeoutMs: 150, platform: 'win32' });
  assert.equal(await ask(async () => { throw new Error('boom'); }), undefined);
  assert.equal(await ask(async () => 'garbage'), undefined);
  const t0 = Date.now();
  assert.equal(await ask(() => new Promise(() => {})), undefined);
  assert.ok(Date.now() - t0 < 1000);
});

test('off Windows the answer is nothing and nothing is run', async () => {
  const run = async () => { throw new Error('must not run'); };
  assert.equal(await programOfConnection({ req: { socket: {} }, remoteAddress: '127.0.0.1', remotePort: 1 }, { run, platform: 'linux' }), undefined);
});

test('the lookup runs netstat, then asks for the executable path of the pid it found', async () => {
  const calls = [];
  const run = async (file, args) => { calls.push(file); return file === 'netstat' ? NETSTAT : 'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe\r\n'; };
  const got = await programOfConnection({ req: { socket: { localPort: 9340 } }, remoteAddress: '127.0.0.1', remotePort: 50111 }, { run, platform: 'win32' });
  assert.equal(got, 'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe');
  assert.deepEqual(calls, ['netstat', 'powershell']);
});

// The real component, end to end: a socket from this process to the bridge is traced back to this Node program.
test('on Windows the bridge names the program that connected: this Node executable, full path', { skip: process.platform !== 'win32' }, async () => {
  const PORT = 9410;
  const bridge = startBridge({ port: PORT }); // default identify
  await bridge.listening;
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/extension`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
  after(() => { ws.close(); bridge.close(); });
  ws.on('message', data => { const { id } = JSON.parse(data.toString()); ws.send(JSON.stringify({ id, result: null })); });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  const control = new WebSocket(bridge.cdpEndpoint('ident').replace('/cdp', '/control'));
  await new Promise((r, j) => { control.once('open', r); control.once('error', j); });
  after(() => control.close());
  const list = await new Promise(r => { control.once('message', d => r(JSON.parse(d.toString()))); control.send(JSON.stringify({ id: 1, method: 'browsers', params: [] })); });
  assert.equal(list.result.length, 1);
  assert.equal(list.result[0].program.toLowerCase(), process.execPath.toLowerCase());
  assert.equal(list.result[0].name, 'node');
});
