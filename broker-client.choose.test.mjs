// Choosing the browser at attach time, through the real control and CDP sockets of a bridge with scripted fake extensions.
// The system default browser and the deadlines are injected.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';
import { brokerClient, choiceNote } from './broker-client.mjs';

const PORT = 9420;
const programs = [];
const bridge = startBridge({ port: PORT, identify: () => programs.shift() });
await bridge.listening;
const dir = mkdtempSync(join(tmpdir(), 'choose-test-'));
writeFileSync(join(dir, 'broker.json'), JSON.stringify({ port: PORT, token: bridge.token, pid: 0 }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const opened = [];
const clients = [];
after(() => { for (const c of clients) c.close(); for (const w of opened) w.close(); bridge.close(); rmSync(dir, { recursive: true, force: true }); });

const prog = name => `C:\\Apps\\${name}\\${name}.exe`;
// A fake browser whose tab 1 is named after it, so an attached session shows which browser it reached.
async function browser(name) {
  programs.push(prog(name));
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/extension`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
  opened.push(ws);
  ws.on('message', data => {
    const { id, method, params } = JSON.parse(data.toString());
    const ok = result => ws.send(JSON.stringify({ id, result }));
    if (method === 'chrome.tabs.query') return ok([{ id: 1, url: 'http://one.test/', active: true, windowId: 1 }]);
    if (method === 'chrome.debugger.sendCommand' && params[1] === 'Target.getTargetInfo') return ok({ targetInfo: { targetId: `T-${name}`, type: 'page', url: 'http://one.test/' } });
    ok(null);
  });
  await new Promise(r => ws.once('open', r));
  return ws;
}
const client = (id, defaultBrowser) => { const c = brokerClient({ sessionId: id, port: PORT, dir, defaultBrowser }); clients.push(c); return c; };
// Opens the client's CDP endpoint, asks for auto-attach and says which fake browser's tab it got.
async function reached(c) {
  const ws = new WebSocket(c.cdpEndpoint());
  opened.push(ws);
  const got = new Promise((res, rej) => { ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.method === 'Target.attachedToTarget') res(m.params.targetInfo.targetId); }); ws.once('close', (_c, r) => rej(new Error(String(r)))); });
  await new Promise(r => ws.once('open', r));
  ws.send(JSON.stringify({ id: 1, method: 'Target.setAutoAttach', params: { autoAttach: true, waitForDebuggerOnStart: false } }));
  return got;
}
const fast = { waitMs: 3000, graceMs: 45000 };

test('one connected browser and no choice: that one, reported as the only one', async () => {
  const chrome = await browser('chrome');
  const c = client('only');
  const got = await c.chooseBrowser({ ...fast });
  assert.deepEqual(got, { name: 'chrome', how: 'only' });
  assert.equal(await reached(c), 'T-chrome');
  assert.match(choiceNote(got), /chrome/);
  assert.match(choiceNote(got), /only/);
  chrome.close(); await sleep(150);
});

test('several connected and a name: that one, reported as requested', async () => {
  const [chrome, edge] = [await browser('chrome'), await browser('msedge')];
  const c = client('named');
  const got = await c.chooseBrowser({ browser: 'MSEDGE', ...fast });
  assert.deepEqual(got, { name: 'msedge', how: 'requested' });
  assert.equal(await reached(c), 'T-msedge');
  assert.match(choiceNote(got), /requested/);
  chrome.close(); edge.close(); await sleep(150);
});

test('several connected, no name: the system default when it is connected', async () => {
  const [chrome, edge] = [await browser('chrome'), await browser('msedge')];
  const c = client('dflt', () => 'chrome');
  const got = await c.chooseBrowser({ ...fast });
  assert.deepEqual(got, { name: 'chrome', how: 'default' });
  assert.equal(await reached(c), 'T-chrome');
  assert.match(choiceNote(got), /default/);
  chrome.close(); edge.close(); await sleep(150);
});

test('several connected, no name, default missing, unknown or not connected: fails listing the connected browsers', async () => {
  const [chrome, edge] = [await browser('chrome'), await browser('msedge')];
  for (const dflt of [undefined, () => undefined, () => 'brave', () => { throw new Error('registry unreadable'); }]) {
    await assert.rejects(client('nodflt', dflt).chooseBrowser({ ...fast }), e => /chrome, msedge/.test(e.message) && /which one/.test(e.message));
  }
  chrome.close(); edge.close(); await sleep(150);
});

test('a requested browser that is not connected, broker young: waits for it and attaches when it appears', async () => {
  const chrome = await browser('chrome');
  const c = client('late');
  const asked = c.chooseBrowser({ browser: 'brave', ...fast });
  await sleep(700);
  const brave = await browser('brave');
  assert.deepEqual(await asked, { name: 'brave', how: 'requested' });
  chrome.close(); brave.close(); await sleep(150);
});

test('a requested browser that never shows up: fails after the wait with the connected list', async () => {
  const chrome = await browser('chrome');
  const t = Date.now();
  await assert.rejects(client('never').chooseBrowser({ browser: 'brave', waitMs: 800, graceMs: 45000 }), e => e.notConnected === true && /brave/.test(e.message) && /chrome/.test(e.message));
  assert.ok(Date.now() - t >= 700, 'it waited');
  chrome.close(); await sleep(150);
});

test('a requested browser that is not connected, broker old: fails at once with the list', async () => {
  const chrome = await browser('chrome');
  const t = Date.now();
  await assert.rejects(client('old').chooseBrowser({ browser: 'brave', waitMs: 5000, graceMs: 0 }), e => e.notConnected === true && /chrome/.test(e.message));
  assert.ok(Date.now() - t < 1500, 'no waiting');
  chrome.close(); await sleep(150);
});

test('no browser connected at all and an old broker: fails at once, nothing to list', async () => {
  const t = Date.now();
  await assert.rejects(client('none').chooseBrowser({ waitMs: 5000, graceMs: 0 }), e => e.notConnected === true && e.connected.length === 0);
  assert.ok(Date.now() - t < 1500);
});

test('two sessions attached to two different browsers at the same time', async () => {
  const [chrome, edge] = [await browser('chrome'), await browser('msedge')];
  const [a, b] = [client('s-a'), client('s-b')];
  await Promise.all([a.chooseBrowser({ browser: 'chrome', ...fast }), b.chooseBrowser({ browser: 'msedge', ...fast })]);
  const [ra, rb] = await Promise.all([reached(a), reached(b)]);
  assert.equal(ra, 'T-chrome');
  assert.equal(rb, 'T-msedge');
  chrome.close(); edge.close(); await sleep(150);
});
