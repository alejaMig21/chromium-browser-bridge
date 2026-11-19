// Several Claude sessions on one bridge, against a scripted fake extension (no browser needed).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';

const PORT = 9392;
const bridge = startBridge({ port: PORT, captureMs: { real: 700, nudgeEvery: 150, nudge: 300, shown: 2500 } }); // short deadlines so the fallbacks are quick to test
await bridge.listening;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fake extension: tab 1 is the one the user is looking at; records debugger attach/detach.
const attached = new Set();
const shots = [], revealCalls = [], hideCalls = [], revealed = new Set(), hiddenTabs = new Set();
const woken = new Set(), waiting = new Map(); // hidden tabs that have been nudged awake; captures waiting for a hidden tab to paint
const flushWaiting = tab => { waiting.get(tab)?.(); waiting.delete(tab); };
let nudgeWakes = true; // false: the tab stays blank whatever is asked of it (another window covers the browser), only showing it helps
const emu = []; // every Emulation.* command that reached the browser, in order
let noForeground = false; // true: the tab in front is a browser page (new-tab page, settings), so no web tab is active
let revealHelps = true; // false: revealing a tab changes nothing, the browser still paints nothing for it
let blankTabs = false; // true: tabs made by chrome.tabs.create stay empty until navigated, like Vivaldi's
const blank = new Set();
const navigated = [];
let attachDelay = 0; // makes the browser slow to attach, so a client can drop in the middle
const extraTabs = []; // tabs the "user" has opened or switched to
const userSwitchesTo = tab => { extraTabs.push(tab); ext.send(JSON.stringify({ method: 'chrome.tabs.onActivated', params: [tab] })); };
let nextTab = 10;
const ext = new WebSocket(`ws://127.0.0.1:${PORT}/extension`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
ext.on('message', async data => {
  const { id, method, params } = JSON.parse(data.toString());
  const ok = result => ext.send(JSON.stringify({ id, result }));
  switch (method) {
    case 'chrome.tabs.query': return ok(params[0]?.active && noForeground ? [] : params[0]?.active ? [{ id: 1, url: 'http://one.test/', active: true, windowId: 1 }] : [{ id: 1, url: 'http://one.test/', windowId: 1 }, ...extraTabs]);
    case 'chrome.tabs.create': { const id = nextTab++; if (blankTabs) blank.add(id); return ok({ id, url: params[0].url, active: params[0].active, windowId: 1 }); }
    case 'chrome.tabs.remove': return ok(null);
    case 'chrome.debugger.attach': await sleep(attachDelay); attached.add(params[0].tabId); return ok(null);
    case 'agent.reveal': revealCalls.push(params[0]); if (revealHelps) { revealed.add(params[0]); flushWaiting(params[0]); } return ok({ windowId: 1, restoredWindow: false, previous: 1 });
    case 'agent.hide': hideCalls.push(params[0]); revealed.clear(); return ok(null);
    case 'chrome.debugger.detach': await sleep(30); attached.delete(params[0].tabId); return ok(null);
    case 'chrome.debugger.sendCommand':
      if (params[1] === 'Page.captureScreenshot') {
        const tab = params[0].tabId, p = params[2] ?? {};
        shots.push({ tabId: tab, ...p });
        // A tiny capture (quality 1) is the "draw" nudge: when nudges work it makes a hidden tab paint, and answers captures waiting for it.
        if (p.quality === 1) { if (nudgeWakes) { woken.add(tab); flushWaiting(tab); } return ok({ data: 'NUDGE' }); }
        if (!hiddenTabs.has(tab) || woken.has(tab) || revealed.has(tab)) return ok({ data: 'PNGDATA' });
        waiting.set(tab, () => ok({ data: 'PNGDATA' })); // a hidden tab paints nothing: answered only once it is woken or shown
        return;
      }
      if (params[1].startsWith('Emulation.')) { emu.push({ tabId: params[0].tabId, method: params[1], params: params[2] }); return ok({}); }
      if (params[1] === 'Test.ordered') { ok({}); return ext.send(JSON.stringify({ method: 'chrome.debugger.onEvent', params: [{ tabId: params[0].tabId }, 'Test.after', {}] })); } // the reply, then right behind it an event, in one burst
      if (params[1] === 'Page.navigate') { blank.delete(params[0].tabId); navigated.push(params[2].url); return ok({}); }
      if (params[1] === 'Target.getTargetInfo') return ok({ targetInfo: { targetId: `T${params[0].tabId}`, type: 'page', url: blank.has(params[0].tabId) ? '' : 'http://one.test/' } });
      return ok({});
  }
  return ok(null);
});
await new Promise(r => ext.once('open', r));
after(() => { ext.close(); bridge.close(); });

// A scripted CDP client for one session: send(method) resolves with the reply, events are collected.
async function session(id, endpoint = bridge.cdpEndpoint(id)) {
  const ws = new WebSocket(endpoint);
  const events = [];
  const waiting = new Map();
  let n = 0;
  const order = []; // what arrived, in order: "reply:<id>" or "event:<method>"
  ws.on('message', d => { const m = JSON.parse(d.toString()); order.push(m.id ? `reply:${m.id}` : `event:${m.method}`); if (m.id) waiting.get(m.id)?.(m); else events.push(m); });
  const opened = await new Promise(r => { ws.once('open', () => r(true)); ws.once('unexpected-response', () => r(false)); ws.once('error', () => {}); });
  if (!opened) return null;
  const closed = new Promise(r => ws.once('close', (_c, reason) => r(String(reason))));
  const send = (method, params, sessionId) => new Promise(r => { const i = ++n; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  return { ws, events, order, send, closed, close: () => ws.close() };
}
const autoAttach = s => s.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
const tabSession = s => s.events.find(e => e.method === 'Target.attachedToTarget')?.params.sessionId;

test('two sessions get different tabs; the second one cannot take the first one\'s tab', async () => {
  const a = await session('a'), b = await session('b');
  assert.ok(a && b);
  assert.equal((await autoAttach(a)).error, undefined);
  assert.ok(attached.has(1));
  // The tab the user is on is taken: the second session attaches with no tab and opens its own.
  assert.equal((await autoAttach(b)).error, undefined);
  assert.equal(tabSession(b), undefined, 'no tab was attached to the second session');
  const created = await b.send('Target.createTarget', { url: 'http://two.test/' });
  assert.ok(created.result?.targetId, JSON.stringify(created));
  assert.equal(attached.has(10), true);
  a.close(); b.close();
  await sleep(200);
});

test('a session cannot command a tab another session owns', async () => {
  const a = await session('c'), b = await session('d');
  await autoAttach(a);
  const aTab = tabSession(a);
  assert.ok(aTab);
  const own = await a.send('Runtime.evaluate', { expression: '1' }, aTab);
  assert.equal(own.error, undefined);
  const foreign = await b.send('Runtime.evaluate', { expression: '1' }, aTab);
  assert.match(foreign.error?.message ?? '', /owned by another Claude session/);
  a.close(); b.close();
  await sleep(200);
});

test('a reconnect with the same session id replaces the old connection', async () => {
  const a = await session('dup');
  await autoAttach(a);
  const again = await session('dup');
  assert.ok(a && again);
  assert.equal(await a.closed, 'replaced by a newer connection with the same session id');
  assert.equal((await autoAttach(again)).error, undefined, 'the new connection can take the tabs the old one held');
  again.close();
  await sleep(200);
});

test('a session\'s tabs are released when it disconnects, and the next session can take them', async () => {
  const a = await session('e');
  await autoAttach(a);
  assert.ok(attached.has(1));
  a.close();
  const b = await session('f');
  assert.equal((await autoAttach(b)).error, undefined);
  assert.ok(attached.has(1));
  b.close();
  await sleep(200);
  assert.equal(attached.has(1), false, 'debugger released once nobody owns the tab');
});

test('the CDP socket needs a well-formed session id', async () => {
  assert.equal(await session('x', `ws://127.0.0.1:${PORT}/cdp?t=${new URL(bridge.cdpEndpoint()).searchParams.get('t')}`), null);
  assert.equal(await session('x', bridge.cdpEndpoint('bad id!')), null);
});

// The control channel: how an MCP server that is not in this process talks to the broker.
async function control(id, token = new URL(bridge.cdpEndpoint()).searchParams.get('t')) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/control?t=${token}&s=${id}`);
  const waiting = new Map();
  let n = 0;
  ws.on('message', d => { const m = JSON.parse(d.toString()); waiting.get(m.id)?.(m); });
  if (!await new Promise(r => { ws.once('open', () => r(true)); ws.once('unexpected-response', () => r(false)); ws.once('error', () => {}); })) return null;
  return { ws, rpc: (method, ...params) => new Promise(r => { const i = ++n; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }) };
}

test('the control channel needs the token', async () => {
  assert.equal(await control('c1', 'wrong'), null);
});

test('the control channel reports status', async () => {
  const c = await control('c2');
  const st = (await c.rpc('status')).result;
  assert.equal(st.connected, true);
  assert.equal(st.extension, true);
  assert.equal(typeof st.uptimeMs, 'number');
  assert.equal(typeof st.sessions, 'number');
  assert.match((await c.rpc('nope')).error ?? 'null result is fine', /./);
  c.ws.close();
});

// The matrix runner switches tabs the way a capture does (the extension's reveal/hide) and needs to know which browser tab is whose.
test('the control channel lists tabs with their owner, and reveals and hides one', async () => {
  resetShots();
  const a = await session('ctl-tabs');
  await autoAttach(a);
  const mine = [...attached].find(t => t < 10);
  const c = await control('c-tabs');
  assert.deepEqual((await c.rpc('tabs')).result, [], 'no prefix, no tabs: the control channel never lists the whole browser');
  const tabs = (await c.rpc('tabs', 'http://one.test')).result;
  assert.deepEqual(tabs.map(t => t.url), ['http://one.test/'], 'only tabs under the asked prefix');
  const own = tabs.find(t => t.id === mine);
  assert.equal(own.owner, 'ctl-tabs');
  const shown = (await c.rpc('reveal', mine)).result;
  assert.deepEqual(revealCalls, [mine]);
  await c.rpc('hide', shown);
  assert.equal(hideCalls.length, 1);
  c.ws.close(); a.close();
  await sleep(300);
});

test('a tab the user switches to goes to a session that owns no tab, never to one that already has a tab', async () => {
  const a = await session('g'), b = await session('h');
  await autoAttach(a);
  assert.ok(tabSession(a));
  await autoAttach(b); // the user tab is owned by a: b is attached with no tab
  assert.equal(tabSession(b), undefined);
  userSwitchesTo({ id: 7, url: 'http://seven.test/', windowId: 1 });
  await sleep(300);
  assert.ok(tabSession(b), 'b, which had no tab, got the tab the user switched to');
  assert.equal(a.events.filter(e => e.method === 'Target.attachedToTarget').length, 1, 'a kept only its own tab');
  a.close(); b.close();
  await sleep(300);
});

test('a switched-to tab nobody can take is reported as unclaimed', async () => {
  const a = await session('i'), b = await session('j');
  await autoAttach(a);
  await b.send('Target.createTarget', { url: 'http://b.test/' }); // b owns a tab too
  await autoAttach(b);
  userSwitchesTo({ id: 8, url: 'http://eight.test/', windowId: 1 });
  await sleep(300);
  assert.equal(a.events.some(e => e.method === 'Target.attachedToTarget' && e.params.targetInfo?.targetId === 'T8'), false);
  const c = await control('c3');
  const unclaimed = (await c.rpc('unclaimed')).result;
  assert.deepEqual(unclaimed.map(t => t.url), ['http://eight.test/']);
  assert.ok(unclaimed.every(t => Number.isInteger(t.id)), 'every unclaimed tab carries the browser tab id');
  c.ws.close(); a.close(); b.close();
  await sleep(300);
});

test('a tab the browser leaves empty (Vivaldi) is navigated to the requested URL before the client sees it', async () => {
  blankTabs = true;
  const a = await session('blank');
  const created = await a.send('Target.createTarget', { url: 'http://requested.test/page' });
  blankTabs = false;
  assert.ok(created.result?.targetId, JSON.stringify(created));
  assert.deepEqual(navigated, ['http://requested.test/page']);
  const seen = a.events.find(e => e.method === 'Target.attachedToTarget' && e.params.targetInfo.targetId === created.result.targetId);
  assert.ok(seen, 'the client was told about the tab');
  a.close();
  await sleep(200);
});

test('a tab that already has its URL is not navigated again', async () => {
  const before = navigated.length;
  const a = await session('loaded');
  await a.send('Target.createTarget', { url: 'http://fine.test/' });
  assert.equal(navigated.length, before);
  a.close();
  await sleep(200);
});

// CDP promises the reply to a command comes before the events that command caused. Playwright relies on it: it ignores
// an execution context for a frame it has not heard about yet, and then waits forever for that context.
test('a reply is never delivered after an event the browser produced after it', async () => {
  const a = await session('ordered');
  await autoAttach(a);
  const sid = tabSession(a);
  for (let i = 0; i < 40; i++) {
    a.order.length = 0;
    const r = await a.send('Test.ordered', {}, sid);
    await sleep(15);
    const reply = a.order.findIndex(x => x.startsWith('reply:'));
    const event = a.order.indexOf('event:Test.after');
    assert.ok(r.result && event >= 0, 'both arrived');
    assert.ok(reply < event, `round ${i}: ${a.order.join(' < ')}`);
  }
  a.close();
  await sleep(200);
});

const resetShots = () => { shots.length = 0; revealCalls.length = 0; hideCalls.length = 0; revealed.clear(); hiddenTabs.clear(); woken.clear(); waiting.clear(); nudgeWakes = true; revealHelps = true; emu.length = 0; delete process.env.BROWSER_REVEAL_TABS; };
const nudges = () => shots.filter(s => s.quality === 1).length;

// ---- captures: the way the official Claude extension does them (whole viewport from the surface, no clip, tiny "draw"
// captures to wake a tab nobody sees, and the user's tabs and windows never touched) ----
test('the tab the user is looking at is captured directly: no nudge, no reveal, nothing else touched', async () => {
  resetShots();
  const a = await session('cap-active');
  await autoAttach(a);
  const r = await a.send('Page.captureScreenshot', { format: 'png' }, tabSession(a));
  assert.equal(r.result?.data, 'PNGDATA');
  assert.equal(nudges(), 0);
  assert.deepEqual(revealCalls, []);
  assert.deepEqual(emu, []);
  a.close();
  await sleep(200);
});

test('the capture asks for the whole viewport from the surface: no clip, nothing past the viewport', async () => {
  resetShots();
  const a = await session('cap-whole');
  await autoAttach(a);
  // what Playwright sends: a clip with a scale (that resizes the page while the browser captures) and maybe beyond the viewport
  await a.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 800, height: 500, scale: 0.8 }, captureBeyondViewport: true }, tabSession(a));
  const sent = shots.at(-1);
  assert.equal(sent.clip, undefined);
  assert.equal(sent.captureBeyondViewport, false);
  assert.equal(sent.fromSurface, true);
  assert.equal(sent.format, 'png');
  a.close();
  await sleep(200);
});

test('a tab that paints nothing is woken by tiny captures and answered, without showing it or moving any window', async () => {
  resetShots();
  const a = await session('cap-nudge');
  const created = await a.send('Target.createTarget', { url: 'http://bg.test/' });
  const tabId = [...attached].find(t => t >= 10);
  hiddenTabs.add(tabId);
  const t0 = Date.now();
  const r = await a.send('Page.captureScreenshot', { format: 'png' }, a.events.find(e => e.params?.targetInfo?.targetId === created.result.targetId).params.sessionId);
  assert.equal(r.result?.data, 'PNGDATA', JSON.stringify(r));
  assert.ok(nudges() >= 1, 'a nudge was sent');
  assert.deepEqual(revealCalls, [], 'no tab was activated');
  assert.deepEqual(hideCalls, []);
  assert.ok(Date.now() - t0 < 700, 'answered as soon as the nudge woke the tab, not at the deadline');
  a.close();
  await sleep(300);
});

test('a tab that never paints (window covered or minimized) fails with a plain message and is not shown by default', async () => {
  resetShots();
  nudgeWakes = false;
  const a = await session('cap-covered');
  const created = await a.send('Target.createTarget', { url: 'http://covered.test/' });
  hiddenTabs.add([...attached].find(t => t >= 10));
  const r = await a.send('Page.captureScreenshot', { format: 'png' }, a.events.find(e => e.params?.targetInfo?.targetId === created.result.targetId).params.sessionId);
  assert.match(r.error?.message ?? '', /covering the browser window/);
  assert.match(r.error?.message ?? '', /get_page_text/);
  assert.doesNotMatch(r.error?.message ?? '', /sendCommand/);
  const sent = nudges();
  assert.ok(sent >= 1, 'it nudged while waiting');
  await sleep(500);
  assert.equal(nudges(), sent, 'and stopped nudging once the capture gave up');
  assert.deepEqual(revealCalls, [], 'the user is not interrupted');
  a.close();
  await sleep(300);
});

test('with BROWSER_REVEAL_TABS=1 a tab that nudges cannot wake is shown, captured and the user\'s tab put back', async () => {
  resetShots();
  process.env.BROWSER_REVEAL_TABS = '1';
  nudgeWakes = false;
  const a = await session('cap-reveal');
  const created = await a.send('Target.createTarget', { url: 'http://bg.test/' });
  const tabId = [...attached].find(t => t >= 10);
  hiddenTabs.add(tabId);
  const r = await a.send('Page.captureScreenshot', { format: 'png' }, a.events.find(e => e.params?.targetInfo?.targetId === created.result.targetId).params.sessionId);
  delete process.env.BROWSER_REVEAL_TABS;
  assert.equal(r.result?.data, 'PNGDATA', JSON.stringify(r));
  assert.deepEqual(revealCalls, [tabId]);
  assert.equal(hideCalls.length, 1);
  assert.equal(hideCalls[0].previous, 1, 'the tab the user was on is the one restored');
  a.close();
  await sleep(300);
});

test('with BROWSER_REVEAL_TABS=1 and a window that stays covered even after the reveal, the message is plain and the tab is put back', async () => {
  resetShots();
  process.env.BROWSER_REVEAL_TABS = '1';
  nudgeWakes = false;
  revealHelps = false;
  const a = await session('cap-reveal-covered');
  const created = await a.send('Target.createTarget', { url: 'http://bg.test/' });
  hiddenTabs.add([...attached].find(t => t >= 10));
  const r = await a.send('Page.captureScreenshot', { format: 'png' }, a.events.find(e => e.params?.targetInfo?.targetId === created.result.targetId).params.sessionId);
  delete process.env.BROWSER_REVEAL_TABS;
  assert.match(r.error?.message ?? '', /covering the browser window/);
  assert.equal(hideCalls.length, 1);
  a.close();
  await sleep(300);
});

test('with a browser page in front (new-tab page), attach still works with no tab, and the session opens its own', async () => {
  resetShots();
  noForeground = true;
  const a = await session('no-foreground');
  const r = await autoAttach(a);
  noForeground = false;
  assert.equal(r.error, undefined, JSON.stringify(r));
  assert.equal(tabSession(a), undefined, 'no tab was taken from the user');
  const created = await a.send('Target.createTarget', { url: 'http://mine.test/' });
  assert.ok(created.result?.targetId, JSON.stringify(created));
  assert.ok([...attached].some(t => t >= 10));
  a.close();
  await sleep(300);
});

test('a tab opened by a tab the session owns is claimed by that session at once; others stay unclaimed', async () => {
  resetShots();
  const a = await session('opener-a');
  await autoAttach(a);
  const mine = [...attached].find(t => t < 10);
  const popup = { id: 41, url: 'http://pop.test/', active: true, windowId: 1, openerTabId: mine };
  const stranger = { id: 42, url: 'http://other.test/', active: false, windowId: 1, openerTabId: 999 };
  ext.send(JSON.stringify({ method: 'chrome.tabs.onCreated', params: [popup] }));
  ext.send(JSON.stringify({ method: 'chrome.tabs.onCreated', params: [stranger] }));
  await sleep(300);
  assert.ok(attached.has(41), 'the popup of an owned tab is attached to its opener\'s session');
  assert.ok(!attached.has(42), 'a tab whose opener this session does not own is left alone');
  assert.ok(a.events.some(e => e.method === 'Target.attachedToTarget' && e.params?.targetInfo?.targetId === 'T41'), 'the client was told about it');
  a.close();
  await sleep(300);
});

test('a request line that is not a valid URL cannot crash the bridge', async () => {
  const reply = await new Promise(res => {
    const s = net.connect(PORT, '127.0.0.1', () => s.write(`GET // HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`));
    let out = '';
    s.on('data', d => { out += d; });
    s.on('close', () => res(out));
    setTimeout(() => s.destroy(), 500);
  });
  assert.match(reply, /^HTTP\/1.1 403/);
  assert.ok(await session('after-bad-url'), 'the bridge still serves sessions');
});

test('a client that drops in the middle of an attach leaves no owner and no debugger behind', async () => {
  attachDelay = 250;
  const a = await session('mid');
  a.ws.send(JSON.stringify({ id: 1, method: 'Target.setAutoAttach', params: { autoAttach: true } }));
  await sleep(50);
  a.close();
  await sleep(900);
  attachDelay = 0;
  assert.equal(attached.has(1), false, 'the debugger of the dropped session is released');
  const b = await session('mid-next');
  assert.equal((await autoAttach(b)).error, undefined, 'the next session can take the tab');
  assert.ok(tabSession(b));
  b.close();
  await sleep(200);
});

test('a second browser-level auto-attach does not grab tabs left unclaimed', async () => {
  const a = await session('again');
  await autoAttach(a);
  userSwitchesTo({ id: 9, url: 'http://nine.test/', windowId: 1 });
  await sleep(200);
  await autoAttach(a);
  await sleep(200);
  assert.equal(a.events.some(e => e.params?.targetInfo?.targetId === 'T9'), false);
  a.close();
  await sleep(300);
});

test('unclaimed tabs are reported without query string or fragment', async () => {
  const a = await session('priv');
  await autoAttach(a);
  userSwitchesTo({ id: 11, url: 'http://eleven.test/p?token=abc#frag', windowId: 1 });
  await sleep(200);
  const c = await control('c4');
  const urls = (await c.rpc('unclaimed')).result.map(t => t.url);
  assert.ok(urls.includes('http://eleven.test/p'), JSON.stringify(urls));
  assert.equal(urls.some(u => /token|frag/.test(u)), false);
  c.ws.close(); a.close();
  await sleep(300);
});

test('a session cannot attach to other targets by name', async () => {
  const a = await session('named');
  await autoAttach(a);
  const r = await a.send('Target.attachToTarget', { targetId: 'T10', flatten: true });
  assert.match(r.error?.message ?? '', /not supported/i);
  a.close();
  await sleep(200);
});

test('malformed frames and unknown control methods do not take the bridge down', async () => {
  const a = await session('junk');
  a.ws.send('{{ not json');
  const c = await control('c5');
  c.ws.send('also not json');
  assert.match((await c.rpc('constructor')).error ?? '', /./);
  assert.equal((await c.rpc('status')).result.extension, true);
  assert.equal((await autoAttach(a)).error, undefined);
  c.ws.close(); a.close();
  await sleep(300);
});
