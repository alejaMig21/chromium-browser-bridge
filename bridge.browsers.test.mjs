// Several browsers (extensions) connected to one bridge at once, against scripted fake extensions.
// The "which program opened this connection" component is injected: it answers from a queue, one program per connection.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';

const PORT = 9397;
const programs = [];
const bridge = startBridge({ port: PORT, identify: () => programs.shift() });
await bridge.listening;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const token = new URL(bridge.cdpEndpoint()).searchParams.get('t');
const opened = [];
after(() => { for (const w of opened) w.close(); bridge.close(); });

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromium = 'C:\\chromium\\chromium.exe';

// A fake browser: tab 1 is in front; records the debugger attaches it receives. `program` is what the injected component says.
async function browser(program, instance) {
  programs.push(program);
  const q = instance ? `?i=${instance}` : '';
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/extension${q}`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
  opened.push(ws);
  const b = { ws, attached: new Set() };
  ws.on('message', data => {
    const { id, method, params } = JSON.parse(data.toString());
    const ok = result => ws.send(JSON.stringify({ id, result }));
    switch (method) {
      case 'chrome.tabs.query': return ok(params[0]?.active ? [{ id: 1, url: 'http://one.test/', active: true, windowId: 1 }] : [{ id: 1, url: 'http://one.test/', windowId: 1 }]);
      case 'chrome.debugger.attach': b.attached.add(params[0].tabId); return ok(null);
      case 'chrome.debugger.detach': b.attached.delete(params[0].tabId); return ok(null);
      case 'chrome.debugger.sendCommand':
        if (params[1] === 'Target.getTargetInfo') return ok({ targetInfo: { targetId: `T${params[0].tabId}-${instance ?? program}`, type: 'page', url: 'http://one.test/' } });
        return ok({ ran: params[1], tab: params[0].tabId, who: instance ?? program });
    }
    return ok(null);
  });
  const up = await new Promise(r => { ws.once('open', () => r(true)); ws.once('unexpected-response', () => r(false)); ws.once('error', () => {}); });
  if (!up) return null;
  b.closed = new Promise(r => ws.once('close', (_c, reason) => r(String(reason))));
  return b;
}

async function control(id) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/control?t=${token}&s=${id}`);
  opened.push(ws);
  const waiting = new Map();
  let n = 0;
  ws.on('message', d => { const m = JSON.parse(d.toString()); waiting.get(m.id)?.(m); });
  await new Promise(r => ws.once('open', r));
  return { rpc: (method, ...params) => new Promise(r => { const i = ++n; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }) };
}

// A scripted CDP client; `want` is the browser it asks for (none = no choice made).
async function session(id, want) {
  const ws = new WebSocket(`${bridge.cdpEndpoint(id)}${want ? `&b=${want}` : ''}`);
  opened.push(ws);
  const events = [], waiting = new Map();
  let n = 0;
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id) waiting.get(m.id)?.(m); else events.push(m); });
  const up = await new Promise(r => { ws.once('open', () => r(true)); ws.once('unexpected-response', () => r(false)); ws.once('error', () => {}); });
  const closed = new Promise(r => ws.once('close', (_c, reason) => r(String(reason))));
  if (!up) return null;
  const send = (method, params, sessionId) => new Promise(r => { const i = ++n; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  return { ws, events, send, closed, close: () => ws.close() };
}
const autoAttach = s => s.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
const tabSession = s => s.events.find(e => e.method === 'Target.attachedToTarget')?.params.sessionId;
const listed = async () => (await (await control('lister')).rpc('browsers')).result;

test('two browsers connect and both stay connected, named after their program', async () => {
  const a = await browser(edge), b = await browser(chrome);
  assert.ok(a && b, 'neither connection is refused');
  await sleep(100);
  const list = await listed();
  assert.deepEqual(list.map(x => x.name).sort(), ['chrome', 'msedge']);
  assert.equal(list.find(x => x.name === 'msedge').program, edge);
  assert.deepEqual(list.map(x => x.inUse), [false, false]);
  assert.equal(bridge.extensionConnected(), true);
  a.ws.close(); b.ws.close();
  await sleep(100);
  assert.deepEqual(await listed(), []);
});

test('two entries with the same program are told apart by a four-character suffix of their id', async () => {
  const a = await browser(chrome, 'aaaa1111'), b = await browser(chrome, 'bbbb2222');
  assert.ok(a && b);
  await sleep(100);
  const list = await listed();
  assert.deepEqual(list.map(x => x.name).sort(), ['chrome-aaaa', 'chrome-bbbb']);
  assert.deepEqual(list.map(x => x.instance).sort(), ['aaaa1111', 'bbbb2222']);
  a.ws.close(); b.ws.close();
  await sleep(100);
});

test('a legacy extension (no id) is one entry named after its program; a second one from the same program is refused', async () => {
  const a = await browser(chrome);
  assert.deepEqual((await listed()).map(x => x.name), ['chrome']);
  assert.equal(await (await browser(chrome)).closed, 'extension already connected');
  assert.equal((await listed()).length, 1);
  a.ws.close();
  await sleep(100);
});

test('with the default component every entry is named browser and one browser works with no argument', async () => {
  const solo = startBridge({ port: PORT + 10, identify: () => undefined }); // a component that cannot tell (the real one is the default now)
  await solo.listening;
  const ws = new WebSocket(`ws://127.0.0.1:${PORT + 10}/extension`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
  ws.on('message', d => { const { id, method } = JSON.parse(d.toString()); ws.send(JSON.stringify({ id, result: method === 'chrome.tabs.query' ? [] : null })); });
  await new Promise(r => ws.once('open', r));
  const c = new WebSocket(`${solo.cdpEndpoint('one')}`);
  assert.equal(await new Promise(r => { c.once('open', () => r('open')); c.once('unexpected-response', () => r('rejected')); c.once('error', () => {}); }), 'open');
  const k = new WebSocket(`ws://127.0.0.1:${PORT + 10}/control?t=${solo.token}&s=k`);
  const res = await new Promise(r => { k.once('open', () => k.send(JSON.stringify({ id: 1, method: 'browsers', params: [] }))); k.on('message', d => r(JSON.parse(d.toString()))); });
  assert.deepEqual(res.result.map(x => [x.name, x.inUse]), [['browser', true]]);
  c.close(); k.close(); ws.close(); solo.close();
});

test('a session picks its browser by name: edge finds msedge, chrome does not match chromium', async () => {
  const a = await browser(edge), b = await browser(chromium);
  const viaEdge = await session('pick-edge', 'edge');
  assert.ok(viaEdge);
  await autoAttach(viaEdge);
  assert.equal((await viaEdge.send('Runtime.evaluate', {}, tabSession(viaEdge))).result.who, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
  assert.equal(await (await session('pick-chrome', 'chrome')).closed, 'no connected browser matches "chrome". Connected: msedge, chromium');
  assert.deepEqual((await listed()).map(x => [x.name, x.inUse]).sort(), [['chromium', false], ['msedge', true]]);
  viaEdge.close(); a.ws.close(); b.ws.close();
  await sleep(100);
});

test('with several browsers and no choice the session is refused with the list; with one it needs no choice', async () => {
  const a = await browser(edge), b = await browser(chrome);
  assert.equal(await (await session('nochoice')).closed, 'several browsers are connected, say which one. Connected: msedge, chrome');
  b.ws.close();
  await sleep(100);
  const s = await session('onlyone');
  assert.ok(s);
  assert.equal((await autoAttach(s)).error, undefined);
  s.close(); a.ws.close();
  await sleep(100);
});

test('a tab id that exists in two browsers does not collide, and a session never sees or commands the other browser\'s tabs', async () => {
  const a = await browser(edge, 'eeee0001'), b = await browser(chrome, 'cccc0002');
  const sa = await session('iso-a', 'msedge'), sb = await session('iso-b', 'chrome');
  assert.equal((await autoAttach(sa)).error, undefined);
  assert.equal((await autoAttach(sb)).error, undefined, 'tab 1 of the second browser is free although tab 1 of the first is owned');
  assert.ok(a.attached.has(1) && b.attached.has(1));
  assert.equal((await sa.send('Runtime.evaluate', {}, tabSession(sa))).result.who, 'eeee0001');
  assert.equal((await sb.send('Runtime.evaluate', {}, tabSession(sb))).result.who, 'cccc0002');
  assert.match((await sa.send('Runtime.evaluate', {}, tabSession(sb))).error?.message ?? '', /owned by another Claude session/);
  b.ws.send(JSON.stringify({ method: 'chrome.debugger.onEvent', params: [{ tabId: 1 }, 'Page.loadEventFired', {}] }));
  await sleep(150);
  assert.equal(sa.events.some(e => e.method === 'Page.loadEventFired'), false);
  assert.equal(sb.events.some(e => e.method === 'Page.loadEventFired'), true);
  sa.close(); sb.close(); a.ws.close(); b.ws.close();
  await sleep(100);
});

test('one browser going away closes only its own sessions', async () => {
  const a = await browser(edge), b = await browser(chrome);
  const sa = await session('gone-a', 'edge'), sb = await session('gone-b', 'chrome');
  a.ws.close();
  assert.equal(await sa.closed, 'msedge disconnected. Still connected: chrome');
  await sleep(100);
  assert.equal((await autoAttach(sb)).error, undefined, 'the other browser still works');
  sb.close(); b.ws.close();
  await sleep(100);
});
