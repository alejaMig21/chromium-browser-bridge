// The connected-browsers text shown by list_connected_browsers and browser_status, read through the control channel of a
// real bridge with scripted fake extensions (no attach, no tab).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';
import { brokerClient, describeBrowsers } from './broker-client.mjs';

const PORT = 9460;
const programs = [];
const bridge = startBridge({ port: PORT, identify: () => programs.shift() });
await bridge.listening;
const dir = mkdtempSync(join(tmpdir(), 'list-test-'));
writeFileSync(join(dir, 'broker.json'), JSON.stringify({ port: PORT, token: bridge.token, pid: 0 }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const opened = [];
const clients = [];
after(() => { for (const c of clients) c.close(); for (const w of opened) w.close(); bridge.close(); rmSync(dir, { recursive: true, force: true }); });

async function browser(program, { id, title } = {}) {
  programs.push(program);
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/extension${id ? `?i=${id}` : ''}`, { headers: { Origin: `chrome-extension://${EXTENSION_ID}` } });
  opened.push(ws);
  ws.on('message', data => { const { id: i, method } = JSON.parse(data.toString()); ws.send(JSON.stringify({ id: i, result: method === 'chrome.tabs.query' ? [] : null })); });
  await new Promise(r => ws.once('open', r));
  if (title) ws.send(JSON.stringify({ method: 'extension.title', params: [title] }));
  await sleep(100);
  return ws;
}
const client = () => { const c = brokerClient({ sessionId: 'lister', port: PORT, dir }); clients.push(c); return c; };

test('no connected browser: says so and points to browser_attach', async () => {
  const text = describeBrowsers(await client().browsers());
  assert.match(text, /No browser is connected/);
  assert.match(text, /browser_attach/);
});

test('two browsers: one row each with name, program path, active tab title and in-use flag', async () => {
  const [chrome, edge] = [await browser('C:\\Apps\\chrome\\chrome.exe', { title: 'Inbox' }), await browser('C:\\Apps\\edge\\msedge.exe')];
  const text = describeBrowsers(await client().browsers());
  assert.equal(text, [
    'Connected browsers (2):',
    '- chrome: C:\\Apps\\chrome\\chrome.exe; active tab: "Inbox"; in use: no',
    '- msedge: C:\\Apps\\edge\\msedge.exe; active tab: (none); in use: no',
  ].join('\n'));
  chrome.close(); edge.close(); await sleep(150);
});

test('two profiles of one browser show their ids', async () => {
  const [a, b] = [await browser('C:\\Apps\\chrome.exe', { id: 'aaaa1111' }), await browser('C:\\Apps\\chrome.exe', { id: 'bbbb2222' })];
  const text = describeBrowsers(await client().browsers());
  assert.match(text, /- chrome-aaaa \(id aaaa1111\): C:\\Apps\\chrome\.exe/);
  assert.match(text, /- chrome-bbbb \(id bbbb2222\): C:\\Apps\\chrome\.exe/);
  a.close(); b.close(); await sleep(150);
});

test('a browser a session uses shows in use: yes; listing opens no session and changes nothing', async () => {
  const chrome = await browser('C:\\Apps\\chrome.exe');
  const c = client();
  const before = (await c.browsers())[0];
  assert.equal(before.inUse, false);
  assert.match(describeBrowsers(await c.browsers()), /in use: no/);
  assert.equal((await c.browsers())[0].inUse, false); // listing twice still attaches nothing
  const cdp = new WebSocket(`ws://127.0.0.1:${PORT}/cdp?t=${bridge.token}&s=user&b=chrome`);
  opened.push(cdp);
  await new Promise(r => cdp.once('open', r));
  assert.match(describeBrowsers(await c.browsers()), /in use: yes/);
  cdp.close(); chrome.close(); await sleep(150);
});

test('with no broker running it reports none and starts nothing', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'list-none-'));
  const c = brokerClient({ sessionId: 'x', port: PORT + 1, dir: empty });
  assert.deepEqual(await c.browsers(), []);
  rmSync(empty, { recursive: true, force: true });
});
