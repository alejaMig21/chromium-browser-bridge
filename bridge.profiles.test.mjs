// Replacement rule and active tab title of the connected browsers, against fake extensions and an injected program lookup.
// The 45 s silence limit is injected short (staleMs) so the "silent entry can be replaced" rule runs in a fraction of a second.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';

const PORT = 9440, STALE = 600;
const programs = [], logs = [];
const bridge = startBridge({ port: PORT, staleMs: STALE, log: (...a) => logs.push(a.join(' ')), identify: () => programs.shift() });
await bridge.listening;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const token = new URL(bridge.cdpEndpoint()).searchParams.get('t');
const opened = [];
after(() => { for (const w of opened) w.close(); bridge.close(); });

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const other = 'C:\\tools\\impostor.exe';

async function browser(program, instance, silentOn) { // silentOn: a method this fake never answers
  programs.push(program);
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/extension${instance ? `?i=${instance}` : ''}`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
  opened.push(ws);
  ws.on('message', d => { const { id, method } = JSON.parse(d.toString()); if (method !== silentOn) ws.send(JSON.stringify({ id, result: method === 'chrome.tabs.query' ? [] : null })); });
  ws.on('error', () => {});
  const up = await new Promise(r => { ws.once('open', () => r(true)); ws.once('unexpected-response', () => r(false)); });
  if (!up) return null;
  return { ws, closed: new Promise(r => ws.once('close', (_c, reason) => r(String(reason)))) };
}
async function listed() {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/control?t=${token}&s=lister`);
  await new Promise(r => ws.once('open', r));
  const res = await new Promise(r => { ws.on('message', d => r(JSON.parse(d.toString()))); ws.send(JSON.stringify({ id: 1, method: 'browsers', params: [] })); });
  ws.close();
  return res.result;
}

test('the active tab title the extension reports is listed per browser; none reported lists an empty title', async () => {
  const a = await browser(chrome, 'aaaa1111'), b = await browser(chrome, 'bbbb2222');
  a.ws.send(JSON.stringify({ method: 'extension.title', params: ['Inbox - Mail'] }));
  await sleep(100);
  const list = await listed();
  assert.equal(list.find(x => x.instance === 'aaaa1111').title, 'Inbox - Mail');
  assert.equal(list.find(x => x.instance === 'bbbb2222').title, '');
  a.ws.send(JSON.stringify({ method: 'extension.title', params: [42] })); // not a string: ignored, the last good title stays
  await sleep(100);
  assert.equal((await listed()).find(x => x.instance === 'aaaa1111').title, 'Inbox - Mail');
  a.ws.close(); b.ws.close();
  await sleep(100);
});

test('the same id from the same program replaces its own live connection at once', async () => {
  const a = await browser(chrome, 'aaaa1111');
  const again = await browser(chrome, 'aaaa1111');
  assert.ok(again, 'not refused');
  assert.equal(await a.closed, 'replaced by a newer extension connection');
  assert.equal((await listed()).length, 1);
  again.ws.close();
  await sleep(100);
});

test('the same id from a different program is refused while the entry is live, and the refusal is logged', async () => {
  const a = await browser(chrome, 'aaaa1111');
  const thief = await browser(other, 'aaaa1111');
  assert.equal(await thief.closed, 'extension already connected');
  assert.ok(logs.some(l => l.includes('refused') && l.includes('aaaa1111')), `logged: ${logs}`);
  assert.equal(a.ws.readyState, WebSocket.OPEN);
  assert.equal((await listed())[0].program, chrome);
  a.ws.close();
  await sleep(100);
});

test('after the silence limit the entry can be replaced by another program', async () => {
  const a = await browser(chrome, 'aaaa1111');
  await sleep(STALE + 150);
  const taker = await browser(other, 'aaaa1111');
  assert.ok(taker, 'not refused');
  assert.equal(await a.closed, 'replaced by a newer extension connection');
  assert.equal((await listed())[0].program, other);
  taker.ws.close();
  await sleep(100);
});

test('a legacy extension (no id) still connects as one entry, and a live second one is still refused', async () => {
  const a = await browser(chrome);
  assert.deepEqual((await listed()).map(x => x.name), ['chrome']);
  assert.equal(await (await browser(chrome)).closed, 'extension already connected');
  a.ws.close();
  await sleep(100);
});

// A CDP client asking for a browser by name: 'open', or the close reason the bridge gave.
async function asks(id, want) {
  const ws = new WebSocket(`${bridge.cdpEndpoint(id)}&b=${want}`);
  opened.push(ws);
  ws.on('error', () => {});
  const closed = new Promise(r => ws.once('close', (_c, reason) => r(String(reason))));
  const up = await new Promise(r => { ws.once('open', () => r(true)); ws.once('unexpected-response', () => r(false)); });
  if (!up) return { reason: 'denied' };
  const reason = await Promise.race([closed, sleep(300).then(() => 'open')]);
  return { ws, reason };
}

test('a name shown with its suffix still finds its entry after the sibling profile left and the suffix is gone', async () => {
  const a = await browser(chrome, 'aaaa1111'), b = await browser(chrome, 'bbbb2222');
  assert.equal((await asks('stable-1', 'chrome-aaaa')).reason, 'open');
  b.ws.close();
  await sleep(150);
  assert.deepEqual((await listed()).map(x => x.name), ['chrome']);
  const again = await asks('stable-2', 'chrome-aaaa'); // the reconnect with the stored name
  assert.equal(again.reason, 'open');
  assert.match((await asks('stable-3', 'chrome-bbbb')).reason, /no connected browser matches/); // the gone profile is not it
  a.ws.close();
  await sleep(100);
});

test('a request that several entries match says it is ambiguous and lists them', async () => {
  const a = await browser(chrome, 'aaaa1111'), b = await browser(chrome, 'bbbb2222');
  const reason = (await asks('ambig', 'chrome')).reason;
  assert.match(reason, /ambiguous/);
  assert.match(reason, /chrome-aaaa/);
  assert.match(reason, /chrome-bbbb/);
  a.ws.close(); b.ws.close();
  await sleep(100);
});

test('replacing a silent entry rejects the calls waiting on it at once instead of letting them time out', async () => {
  const a = await browser(chrome, 'aaaa1111', 'agent.reveal'); // never answers a reveal
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/control?t=${token}&s=ctl`);
  opened.push(ws);
  await new Promise(r => ws.once('open', r));
  const reply = new Promise(r => { ws.on('message', d => r(JSON.parse(d.toString()))); });
  ws.send(JSON.stringify({ id: 1, method: 'reveal', params: [1] }));
  await sleep(STALE + 150);
  const t = Date.now();
  const taker = await browser(other, 'aaaa1111');
  assert.ok(taker, 'replaced');
  const got = await Promise.race([reply, sleep(3000).then(() => 'still waiting')]);
  assert.match(got.error ?? got, /replaced|disconnected/);
  assert.ok(Date.now() - t < 2000, 'rejected at once, not after the 15 s call deadline');
  taker.ws.close(); a.ws.close();
  await sleep(100);
});
