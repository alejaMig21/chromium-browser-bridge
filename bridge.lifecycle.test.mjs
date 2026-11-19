// Session lifecycle with several browsers: disconnect message, switching browser, per-browser tab ids, foreground and unclaimed tabs.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';

const PORT = 9450;
const programs = [];
const bridge = startBridge({ port: PORT, identify: () => programs.shift() });
await bridge.listening;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const token = new URL(bridge.cdpEndpoint()).searchParams.get('t');
const opened = [];
after(() => { for (const w of opened) w.close(); bridge.close(); });

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const vivaldi = 'C:\\Vivaldi\\vivaldi.exe';

// A fake browser whose foreground tab is `front`; `tabs` are the tabs it has open. Records debugger attaches.
async function browser(program, { front = 1, tabs = [front] } = {}) {
  programs.push(program);
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/extension`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
  opened.push(ws);
  const b = { ws, attached: new Set() };
  const tab = id => ({ id, url: `http://t${id}.test/`, windowId: 1, active: id === front });
  ws.on('message', data => {
    const { id, method, params } = JSON.parse(data.toString());
    const ok = result => ws.send(JSON.stringify({ id, result }));
    switch (method) {
      case 'chrome.tabs.query': return ok(params[0]?.active ? [tab(front)] : tabs.map(tab));
      case 'chrome.debugger.attach': b.attached.add(params[0].tabId); return ok(null);
      case 'chrome.debugger.detach': b.attached.delete(params[0].tabId); return ok(null);
      case 'chrome.debugger.sendCommand':
        if (params[1] === 'Target.getTargetInfo') return ok({ targetInfo: { targetId: `T${params[0].tabId}-${program}`, type: 'page', url: `http://t${params[0].tabId}.test/` } });
        return ok({});
    }
    return ok(null);
  });
  await new Promise(r => ws.once('open', r));
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
  return { rpc: (method, ...params) => new Promise(r => { const i = ++n; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }), close: () => ws.close() };
}

async function session(id, want) {
  const ws = new WebSocket(`${bridge.cdpEndpoint(id)}${want ? `&b=${want}` : ''}`);
  opened.push(ws);
  const events = [], waiting = new Map();
  let n = 0;
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id) waiting.get(m.id)?.(m); else events.push(m); });
  await new Promise(r => { ws.once('open', r); ws.once('unexpected-response', r); ws.once('error', () => {}); });
  const closed = new Promise(r => ws.once('close', (_c, reason) => r(String(reason))));
  const send = (method, params, sessionId) => new Promise(r => { const i = ++n; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  return { ws, events, send, closed, close: () => ws.close() };
}
const autoAttach = s => s.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
const attachedTabs = s => s.events.filter(e => e.method === 'Target.attachedToTarget').map(e => e.params.targetInfo.targetId);

test('a browser going away closes only its sessions, naming the lost browser and the ones still connected', async () => {
  const a = await browser(edge), b = await browser(chrome), c = await browser(vivaldi);
  const sa = await session('life-a', 'edge'), sb = await session('life-b', 'chrome'), sc = await session('life-c', 'vivaldi');
  a.ws.close();
  assert.equal(await sa.closed, 'msedge disconnected. Still connected: chrome, vivaldi');
  await sleep(100);
  assert.equal((await autoAttach(sb)).error, undefined);
  assert.equal((await autoAttach(sc)).error, undefined);
  b.ws.close();
  assert.equal(await sb.closed, 'chrome disconnected. Still connected: vivaldi');
  c.ws.close();
  assert.equal(await sc.closed, 'vivaldi disconnected. Still connected: none');
  await sleep(100);
});

test('attaching the same session to another browser releases its tab in the first, which another session can then take', async () => {
  const a = await browser(edge), b = await browser(chrome, { front: 2 });
  const first = await session('mover', 'edge');
  await autoAttach(first);
  assert.ok(a.attached.has(1));
  first.close();
  const moved = await session('mover', 'chrome');
  await autoAttach(moved);
  assert.ok(b.attached.has(2));
  await sleep(150);
  assert.equal(a.attached.has(1), false, 'the debugger was detached in the first browser');
  const other = await session('taker', 'edge');
  assert.equal((await autoAttach(other)).error, undefined);
  assert.deepEqual(attachedTabs(other), ['T1-' + edge]);
  moved.close(); other.close(); a.ws.close(); b.ws.close();
  await sleep(100);
});

test('the same session id reconnecting to another browser while the old socket is still open releases the first browser\'s tab', async () => {
  const a = await browser(edge), b = await browser(chrome, { front: 2 });
  const first = await session('mover2', 'edge');
  await autoAttach(first);
  const moved = await session('mover2', 'chrome'); // no close of the first socket in between
  await autoAttach(moved);
  await sleep(150);
  assert.equal(a.attached.has(1), false);
  assert.ok(b.attached.has(2));
  moved.close(); a.ws.close(); b.ws.close();
  await sleep(100);
});

test('tabs with one id in two browsers are owned independently, and one session closing frees only its own', async () => {
  const a = await browser(edge), b = await browser(chrome);
  const sa = await session('same-a', 'edge'), sb = await session('same-b', 'chrome');
  await autoAttach(sa); await autoAttach(sb);
  assert.ok(a.attached.has(1) && b.attached.has(1));
  sa.close();
  await sleep(150);
  assert.equal(a.attached.has(1), false);
  assert.equal(b.attached.has(1), true, 'the other browser\'s tab 1 is still owned');
  sb.close(); a.ws.close(); b.ws.close();
  await sleep(100);
});

test('the foreground tab offered at attach is the chosen browser\'s, and unclaimed tabs are listed per browser', async () => {
  const a = await browser(edge, { front: 5, tabs: [5, 6] }), b = await browser(chrome, { front: 7, tabs: [7, 8] });
  const sa = await session('fg-a', 'edge'), sb = await session('fg-b', 'chrome');
  const ca = await control('fg-a'), cb = await control('fg-b');
  // Nothing attached yet: each session was offered only the foreground tab of its own browser.
  assert.deepEqual((await ca.rpc('unclaimed')).result.map(t => t.id), [5]);
  assert.deepEqual((await cb.rpc('unclaimed')).result.map(t => t.id), [7]);
  await autoAttach(sa); await autoAttach(sb);
  assert.deepEqual(attachedTabs(sa), ['T5-' + edge]);
  assert.deepEqual(attachedTabs(sb), ['T7-' + chrome]);
  assert.deepEqual((await ca.rpc('unclaimed')).result, []);
  ca.close(); cb.close(); sa.close(); sb.close(); a.ws.close(); b.ws.close();
  await sleep(100);
});
