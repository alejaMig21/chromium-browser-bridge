// Thin RPC proxy between the local browser-cdp server and chrome.debugger / chrome.tabs.
// The server decides everything (which tabs, which CDP commands); this file only forwards.
const PORT = 9340; // must match BROWSER_BRIDGE_PORT of the server
let ws = null;

const send = o => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); };
// Browser-internal pages (settings, start page, other extensions) are never offered to the server.
const usable = t => /^https?:|^about:blank$/.test(t?.url || t?.pendingUrl || '');
const slim = t => ({ id: t.id, url: t.url || t.pendingUrl || '', active: !!t.active, windowId: t.windowId, openerTabId: t.openerTabId });

const API = {
  'chrome.debugger.attach': (target, version) => chrome.debugger.attach(target, version),
  'chrome.debugger.detach': target => chrome.debugger.detach(target),
  'chrome.debugger.sendCommand': (target, method, params) => chrome.debugger.sendCommand(target, method, params),
  'chrome.tabs.query': query => chrome.tabs.query(query).then(ts => ts.map(slim)),
  'chrome.tabs.create': options => chrome.tabs.create(options).then(slim),
  'chrome.tabs.remove': tabId => chrome.tabs.remove(tabId),
  // A browser paints nothing for a background tab or a minimized window, so a capture there is never answered. Reveal makes
  // the tab active (and restores a minimized window) WITHOUT focusing it; hide puts the user's tab and window state back.
  'agent.reveal': async tabId => {
    const t = await chrome.tabs.get(tabId);
    const w = await chrome.windows.get(t.windowId);
    const restoredWindow = w.state === 'minimized';
    if (restoredWindow) await chrome.windows.update(w.id, { state: 'normal', focused: false });
    let previous = null;
    if (!t.active) { previous = (await chrome.tabs.query({ active: true, windowId: t.windowId }))[0]?.id ?? null; ours.set(tabId, Date.now() + 3000); await chrome.tabs.update(tabId, { active: true }); }
    return { windowId: w.id, restoredWindow, previous };
  },
  'agent.hide': async ({ windowId, restoredWindow, previous }) => {
    if (previous !== null) { ours.set(previous, Date.now() + 3000); await chrome.tabs.update(previous, { active: true }).catch(() => {}); }
    if (restoredWindow) await chrome.windows.update(windowId, { state: 'minimized' }).catch(() => {});
  },
};
const ours = new Map(); // tab id -> until: an activation the agent itself caused, which is not the user switching tabs

// Random id of this browser profile, made once and kept: two profiles of one browser are told apart by it, and a restarted
// service worker reconnects as the same entry. Announced on every connect as /extension?i=<id>.
const instanceId = chrome.storage.local.get('instance').then(async ({ instance }) => {
  if (instance) return instance;
  instance = crypto.randomUUID();
  await chrome.storage.local.set({ instance });
  return instance;
});

// The title of the tab the user is looking at, so the broker can tell two entries of one browser apart in its list.
const sendTitle = async () => {
  const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  send({ method: 'extension.title', params: [usable(t) ? t.title || '' : ''] });
};

async function connect() {
  const instance = await instanceId;
  if (ws && ws.readyState <= WebSocket.OPEN) return; // checked after the await: two callers cannot both open a socket
  ws = new WebSocket(`ws://127.0.0.1:${PORT}/extension?i=${instance}`);
  ws.onopen = async () => {
    sendTitle();
    // Offer the tab(s) the user is looking at right now; the server attaches lazily.
    for (const t of await chrome.tabs.query({ active: true })) if (usable(t)) send({ method: 'chrome.tabs.onActivated', params: [slim(t)] });
    send({ method: 'extension.initialized' });
  };
  ws.onmessage = async e => {
    const { id, method, params } = JSON.parse(e.data);
    try { send({ id, result: (await API[method](...params)) ?? null }); }
    catch (err) { send({ id, error: String(err?.message ?? err) }); }
  };
  ws.onclose = () => { ws = null; setTimeout(connect, 2000); };
  ws.onerror = () => ws?.close();
}

chrome.debugger.onEvent.addListener((source, method, params) => send({ method: 'chrome.debugger.onEvent', params: [source, method, params] }));
chrome.debugger.onDetach.addListener((source, reason) => send({ method: 'chrome.debugger.onDetach', params: [source, reason] }));
chrome.tabs.onRemoved.addListener(tabId => send({ method: 'chrome.tabs.onRemoved', params: [tabId] }));
chrome.tabs.onCreated.addListener(t => { if (usable(t)) send({ method: 'chrome.tabs.onCreated', params: [slim(t)] }); });
chrome.windows.onFocusChanged.addListener(() => sendTitle()); // the active tab is another one when the user moves to another window
chrome.tabs.onUpdated.addListener((_id, change, t) => { if (change.title && t.active) sendTitle(); });
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  sendTitle();
  const mine = ours.get(tabId);
  ours.delete(tabId);
  if (mine && Date.now() < mine) return;
  const t = await chrome.tabs.get(tabId).catch(() => null);
  if (t && usable(t)) send({ method: 'chrome.tabs.onActivated', params: [slim(t)] });
});

// A service worker is stopped when idle: an open socket with traffic keeps it alive, an alarm brings it back.
setInterval(() => send({ method: 'extension.ping' }), 20000);
chrome.alarms.create('reconnect', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(connect);
chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(connect);
connect();
