import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startBridge, EXTENSION_ID } from './bridge.mjs';

const PORT = 9391;
const bridge = startBridge({ port: PORT });
await bridge.listening;
after(() => bridge.close());

// Resolves with 'open' | 'rejected:<status>' | 'closed:<reason>' for one handshake.
const handshake = (path, headers = {}) => new Promise(resolve => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}${path}`, { headers });
  ws.on('open', () => { ws.on('close', (_c, reason) => resolve(`closed:${reason}`)); setTimeout(() => resolve('open'), 300); });
  ws.on('unexpected-response', (_req, res) => resolve(`rejected:${res.statusCode}`));
  ws.on('error', () => {});
});

test('a web page cannot reach the extension socket or the CDP socket', async () => {
  assert.equal(await handshake('/extension', { Origin: 'https://evil.example' }), 'rejected:403');
  assert.equal(await handshake('/extension', { Origin: 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }), 'rejected:403');
  assert.equal(await handshake('/cdp', { Origin: 'https://evil.example' }), 'rejected:403');
});

test('a wrong Host header (DNS rebinding) is rejected', async () => {
  assert.equal(await handshake('/cdp', { Host: 'evil.example' }), 'rejected:403');
});

test('unknown paths are rejected', async () => {
  assert.equal(await handshake('/other'), 'rejected:403');
});

const cdpPath = () => { const u = new URL(bridge.cdpEndpoint()); return u.pathname + u.search; };

test('the CDP socket needs the token of the broker', async () => {
  assert.equal(await handshake('/cdp'), 'rejected:403');
  assert.equal(await handshake('/cdp?t=wrong'), 'rejected:403');
  assert.match(cdpPath(), /^\/cdp\?t=[0-9a-f]{32}&s=default$/);
});

test('the CDP socket refuses to work while the extension is not connected', async () => {
  assert.equal(bridge.extensionConnected(), false);
  assert.match(await handshake(cdpPath()), /^closed:extension not connected/);
});

test('the extension, identified by its fixed id, can connect', async () => {
  assert.equal(await handshake('/extension', { Origin: `chrome-extension://${EXTENSION_ID}` }), 'open');
});

test('a live extension is not replaced by a second connection claiming its id', async () => {
  assert.match(await handshake('/extension', { Origin: `chrome-extension://${EXTENSION_ID}` }), /^closed:extension already connected/);
});
