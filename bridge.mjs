// Local CDP relay. Playwright connects to ws://127.0.0.1:<port>/cdp?t=<token>&s=<session id> and speaks plain CDP;
// the Local Browser Bridge extension (extension/) connects to /extension and exposes chrome.debugger / chrome.tabs.
// This module translates between them. Tab-level model after Playwright MCP's own extension relay, with one change:
// only tabs the user has looked at are attached, never all of them.
// Several sessions (one per Claude session) can be connected at once. Chromium allows one debugger per tab, so a tab
// belongs to at most one session; a session's tabs are released when it disconnects.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { win32 } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { programOfConnection } from './platform.mjs';

// Fixed by the "key" in extension/manifest.json, so the origin of its socket can be checked.
export const EXTENSION_ID = 'nbjcgjmkbnkpjjkglddgcmmnknfdeade';
const SESSION_ID = /^[\w-]{1,64}$/;
const usable = ts => ts.filter(t => /^https?:|^about:blank$/.test(t.url || ''));

// identify({ req, remoteAddress, remotePort }) answers which program (a file path) opened an extension connection, or nothing
// when it cannot tell: that entry is then named "browser". Replaceable so tests inject names and the Windows lookup (platform.mjs) is the default.
export function startBridge({ port = 9340, log = () => {}, captureMs = {}, identify = programOfConnection, staleMs = 45000 } = {}) {
  const CAP = { real: 8000, nudgeEvery: 500, nudge: 1000, shown: 8000, ...captureMs }; // deadlines of the capture steps (ms)
  const NOT_PAINTED = 'The browser paints nothing for this tab right now: it is in the background, or another window is covering the browser window, or the window is minimized (a browser cannot paint what nobody can see). Read the page with get_page_text or read_page, or ask the user to bring the browser window to the front. BROWSER_REVEAL_TABS=1 lets this tool show the tab for a moment instead, at the price of a flicker.';
  const token = randomBytes(16).toString('hex');
  const startedAt = Date.now();
  const sessions = new Map(); // session id -> Session
  const byTabSession = new Map(); // bridge session id ("bridge-tab-N") -> Session, to say who owns a tab a client names
  let nextTabSession = 1;

  // Everything the broker keeps about one extension connection (one browser). A tab id is only unique inside one entry,
  // so tab ownership lives here. One entry per connected browser: its program (file path, '' when unknown) and instance id.
  const makeEntry = (program, instance) => {
    const e = {
      program, instance, key: instance ?? `legacy:${program}`, // a legacy extension (no id) is identified by its program
      ext: null, extSeen: 0, // the extension pings every 20 s; a live one is never replaced, so a local impostor cannot take its slot
      pending: new Map(), lastId: 0,
      owners: new Map(), // tab id -> { session, until? }  (until: a release in progress)
      // Every extension call gets a deadline: a hung chrome.debugger call must surface as an error, never as a stuck client.
      call: (method, params, ms = 15000) => new Promise((resolve, reject) => {
        if (e.ext?.readyState !== WebSocket.OPEN) return reject(new Error('The browser extension is not connected.'));
        const id = ++e.lastId;
        const timer = setTimeout(() => { e.pending.delete(id); reject(new Error(`${method} timed out after ${ms / 1000}s in the browser.`)); }, ms);
        e.pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: err => { clearTimeout(timer); reject(err); } });
        e.ext.send(JSON.stringify({ id, method, params }));
      }),
      sessions: () => [...sessions.values()].filter(s => s.entry === e),
    };
    return e;
  };
  const entries = new Map(); // entry key -> entry, the connected browsers in connection order
  const base = e => (e.program ? win32.basename(e.program, win32.extname(e.program)).toLowerCase() : 'browser');
  // Two entries with one program name are told apart by the first four characters of their instance id.
  const nameOf = e => (e.instance && [...entries.values()].filter(o => base(o) === base(e)).length > 1 ? `${base(e)}-${e.instance.slice(0, 4)}` : base(e));
  const names = () => [...entries.values()].map(nameOf).join(', ');
  // The entry a client asks for: its exact name, else the one whose name contains the asked one; none or several = nothing.
  // No choice made: the only connected browser.
  const resolve = want => {
    const all = [...entries.values()];
    if (!want) return all.length === 1 ? all[0] : undefined;
    const w = want.toLowerCase(), exact = all.filter(e => nameOf(e) === w || base(e) === w);
    const found = exact.length ? exact : all.filter(e => nameOf(e).includes(w));
    return found.length === 1 ? found[0] : undefined;
  };
  const ownedBy = tabId => new Error(`Tab ${tabId} is owned by another Claude session.`);

  class Session {
    tabs = new Map(); // tabId -> { tabId, sessionId, targetInfo, childSessions }
    auto = false;
    offered = new Set(); // tab ids the user has looked at; the only ones this session may attach
    attaching = new Map();
    closed = false;
    constructor(id, ws, entry) { this.id = id; this.ws = ws; this.entry = entry; }
    get owners() { return this.entry.owners; }
    call(...a) { return this.entry.call(...a); }
    toClient(m) { if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }

    async command(method, params, sessionId) {
      switch (method) {
        case 'Browser.getVersion': return { protocolVersion: '1.3', product: 'Chrome/Local-Browser-Bridge', userAgent: 'Local-Browser-Bridge/1.0' };
        case 'Browser.setDownloadBehavior': return {};
        case 'Target.setAutoAttach':
          if (sessionId) break; // a tab's own child auto-attach goes to the browser
          this.auto = true;
          if (this.tabs.size) return {}; // a later call must not grab tabs the user left unclaimed
          const failures = [];
          await Promise.all([...this.offered].map(id => this.attach(id).catch(e => { log('attach failed', id, e.message); failures.push(e.message); })));
          // Attached with no tab is fine when there is no web page to take (the tab in front is a browser page such as the
          // new-tab page, or it is owned by another session): the session opens its own with createTarget. A tab that exists
          // and could not be attached for another reason is an error with that reason.
          if (!this.tabs.size && this.offered.size && !(failures.length === this.offered.size && failures.every(m => /owned by another Claude session/.test(m))))
            throw new Error(`The tab the user is looking at could not be attached: ${failures.join('; ')}`);
          return {};
        case 'Target.attachToTarget':
        case 'Target.attachToBrowserTarget': throw new Error('Not supported by the Local Browser Bridge: tabs are attached through Target.setAutoAttach, and only the ones this session owns.');
        case 'Target.createTarget': {
          const tab = await this.call('chrome.tabs.create', [{ url: params?.url || 'about:blank', active: false }]); // never pull the user off the tab they are on
          this.offered.add(tab.id);
          try { return { targetId: (await this.attach(tab.id, { url: params?.url || 'about:blank' })).targetInfo.targetId }; }
          catch (e) { await this.call('chrome.tabs.remove', [tab.id]).catch(() => {}); throw e; } // no half-made tab left unowned
        }
        case 'Target.closeTarget': {
          const s = [...this.tabs.values()].find(t => t.targetInfo?.targetId === params?.targetId);
          if (!s) return { success: false };
          await this.call('chrome.tabs.remove', [s.tabId]);
          return { success: true };
        }
        case 'Target.getTargetInfo': return sessionId ? [...this.tabs.values()].find(t => t.sessionId === sessionId)?.targetInfo : undefined;
      }
      if (method === 'Page.captureScreenshot') return this.capture(sessionId, params);
      return this.call('chrome.debugger.sendCommand', [this.target(method, sessionId), method, params]);
    }

    // One capture of a tab, the way the official Claude extension does it (read from its code): the whole viewport from the
    // surface, never a clip and never past the viewport (those make the browser resize the page while it captures, and a
    // capture that never ends leaves the page shrunken). A browser paints nothing for a tab nobody can see, so while the
    // capture is unanswered a tiny throw-away capture is sent every half second until it is answered or its deadline passes: it asks the browser for a frame
    // of that tab without showing it. Nothing is activated and no window is restored, so the user is never interrupted.
    // BROWSER_REVEAL_TABS=1 adds the old last resort: show the tab (no focus), capture, put the user's tab back.
    async capture(sessionId, params) {
      const target = this.target('Page.captureScreenshot', sessionId);
      const take = (p, ms) => this.call('chrome.debugger.sendCommand', [target, 'Page.captureScreenshot', p], ms);
      const { clip, ...rest } = params ?? {};
      const whole = { ...rest, fromSurface: true, captureBeyondViewport: false };
      const real = take(whole, CAP.real);
      let answered = false;
      real.then(() => { answered = true; }, () => { answered = true; });
      void (async () => { // ends when the capture is answered or its deadline passes
        while (true) {
          await new Promise(r => setTimeout(r, CAP.nudgeEvery));
          if (answered) return;
          await take({ format: 'jpeg', quality: 1, fromSurface: true, captureBeyondViewport: false }, CAP.nudge).catch(() => {});
        }
      })();
      try { return await real; }
      catch (e) {
        if (!/timed out/.test(e.message)) throw e;
        if (process.env.BROWSER_REVEAL_TABS !== '1') throw new Error(NOT_PAINTED);
        const shown = await this.call('agent.reveal', [target.tabId]);
        try { await new Promise(r => setTimeout(r, 250)); return await take(whole, CAP.shown); } // let the browser paint a frame
        catch (e2) { throw /timed out/.test(e2.message) ? new Error(NOT_PAINTED) : e2; }
        finally { await this.call('agent.hide', [shown]).catch(() => {}); }
      }
    }

    // No sessionId = browser-level command: route through any attached tab. A tab session maps to its tabId;
    // a child session (worker, out-of-process iframe) keeps its id so chrome.debugger can route it.
    target(method, sessionId) {
      if (!sessionId) {
        const first = this.tabs.values().next().value;
        if (!first) throw new Error(`No attached tab to run browser-level command ${method}`);
        return { tabId: first.tabId };
      }
      const tab = [...this.tabs.values()].find(t => t.sessionId === sessionId);
      if (tab) return { tabId: tab.tabId };
      const parent = [...this.tabs.values()].find(t => t.childSessions.has(sessionId));
      if (parent) return { tabId: parent.tabId, sessionId };
      const other = byTabSession.get(sessionId);
      if (other && other !== this) throw new Error('That tab is owned by another Claude session.');
      throw new Error(`No tab for sessionId ${sessionId}`);
    }

    // A tab belongs to one session. One being released by its previous owner is waited for; any other owner is an error.
    async claim(tabId) {
      for (;;) {
        const o = this.owners.get(tabId);
        if (!o) break;
        if (o.session === this) return;
        if (!o.until) throw ownedBy(tabId);
        await o.until;
      }
      if (this.closed) throw new Error('The session was closed.');
      this.owners.set(tabId, { session: this });
    }

    // Concurrent callers (createTarget and the tab-activated event for the same new tab) share one attach.
    attach(tabId, opts) {
      const have = this.tabs.get(tabId);
      if (have) return Promise.resolve(have);
      if (!this.attaching.has(tabId)) this.attaching.set(tabId, this.attachOnce(tabId, opts).finally(() => this.attaching.delete(tabId)));
      return this.attaching.get(tabId);
    }

    async attachOnce(tabId, { url } = {}) {
      await this.claim(tabId);
      let debuggerOn = false;
      // The client may drop at any await below: a closed session must end with no owner and no debugger on the tab.
      const alive = () => { if (this.closed) throw new Error('The session was closed.'); };
      try {
        alive();
        // A debugger left over from our own previous session is released and retaken; one held by DevTools stays an error.
        await this.call('chrome.debugger.attach', [{ tabId }, '1.3']).catch(async e => {
          if (!/already attached/i.test(e.message)) throw e;
          await this.call('chrome.debugger.detach', [{ tabId }]).catch(() => {});
          await this.call('chrome.debugger.attach', [{ tabId }, '1.3']);
        });
        debuggerOn = true;
        alive();
        let { targetInfo } = await this.call('chrome.debugger.sendCommand', [{ tabId }, 'Target.getTargetInfo']);
        alive();
        // Vivaldi makes a tab for chrome.tabs.create but leaves it empty (the url is ignored, nothing answers Page.enable
        // or Runtime.evaluate): load the requested url ourselves, before the client starts talking to the tab.
        if (url && !targetInfo.url) {
          await this.call('chrome.debugger.sendCommand', [{ tabId }, 'Page.navigate', { url }]);
          targetInfo = { ...targetInfo, url };
          alive();
        }
        const s = { tabId, sessionId: `bridge-tab-${nextTabSession++}`, targetInfo, childSessions: new Set() };
        this.tabs.set(tabId, s);
        byTabSession.set(s.sessionId, this);
        this.toClient({ method: 'Target.attachedToTarget', params: { sessionId: s.sessionId, targetInfo: { ...targetInfo, attached: true }, waitingForDebugger: false } });
        return s;
      } catch (e) {
        if (debuggerOn) await this.call('chrome.debugger.detach', [{ tabId }]).catch(() => {});
        if (this.owners.get(tabId)?.session === this) this.owners.delete(tabId);
        throw e;
      }
    }

    detach(tabId) {
      const s = this.tabs.get(tabId);
      if (!s) return;
      this.tabs.delete(tabId);
      byTabSession.delete(s.sessionId);
      if (this.owners.get(tabId)?.session === this) this.owners.delete(tabId);
      this.toClient({ method: 'Target.detachedFromTarget', params: { sessionId: s.sessionId, targetId: s.targetInfo?.targetId } });
    }

    // The client went away: release every tab. Ownership stays until the debugger is really detached, so the
    // next session that wants the tab waits for the release instead of failing.
    release() {
      if (this.closed) return;
      this.closed = true;
      if (sessions.get(this.id) === this) sessions.delete(this.id);
      for (const [tabId, s] of this.tabs) {
        byTabSession.delete(s.sessionId);
        const o = this.owners.get(tabId);
        if (o?.session !== this) continue;
        o.until = this.call('chrome.debugger.detach', [{ tabId }]).catch(() => {}).finally(() => { if (this.owners.get(tabId) === o) this.owners.delete(tabId); });
      }
      this.tabs.clear();
    }
  }

  // A tab the page of an owned tab opened (target=_blank, window.open) belongs to the session that owns the opener,
  // at once: otherwise it would sit unclaimed, out of reach of the agent that caused it. Needs openerTabId from the extension.
  const claimOpened = (entry, tab) => {
    const owner = tab?.openerTabId !== undefined && entry.owners.get(tab.openerTabId)?.session;
    if (!owner || owner.closed || entry.owners.has(tab.id)) return false;
    owner.offered.add(tab.id);
    owner.attach(tab.id).catch(e => log('attach of an opened tab failed', tab.id, e.message));
    return true;
  };

  function onEvent(entry, { method, params }) {
    const { owners } = entry, mine = entry.sessions();
    switch (method) {
      case 'chrome.tabs.onCreated': claimOpened(entry, params?.[0]); break;
      case 'extension.title': if (typeof params?.[0] === 'string') entry.title = params[0].slice(0, 200); break; // the active tab's title, for the browser list
      case 'chrome.tabs.onActivated': {
        const [tab] = params ?? [];
        if (!tab) break;
        if (claimOpened(entry, tab)) break;
        for (const s of mine) s.offered.add(tab.id);
        // Only a session that owns no tab takes it (the oldest first); with every session busy it stays unclaimed.
        const free = mine.find(s => s.auto && s.tabs.size === 0 && s.attaching.size === 0);
        if (free && !owners.has(tab.id)) free.attach(tab.id).catch(e => log('attach failed', tab.id, e.message));
        break;
      }
      case 'chrome.tabs.onRemoved':
        if (params?.[0] === undefined) break;
        for (const s of mine) s.offered.delete(params[0]);
        owners.get(params[0])?.session.detach(params[0]);
        break;
      case 'chrome.debugger.onDetach': if (params?.[0]?.tabId !== undefined) owners.get(params[0].tabId)?.session.detach(params[0].tabId); break;
      case 'chrome.debugger.onEvent': {
        const [source, m, p] = params ?? [];
        const owner = source && owners.get(source.tabId)?.session;
        const s = owner?.tabs.get(source.tabId);
        if (!s) break;
        if (m === 'Target.attachedToTarget' && p?.sessionId) s.childSessions.add(p.sessionId);
        else if (m === 'Target.detachedFromTarget' && p?.sessionId) s.childSessions.delete(p.sessionId);
        // A reply goes through a few promise hops before it is sent; an event is sent at once. Without a pause an event the
        // browser produced AFTER a reply can overtake it when both arrive in one burst, and Playwright then drops it.
        const msg = { sessionId: source.sessionId || s.sessionId, method: m, params: p };
        setImmediate(() => owner.toClient(msg));
        break;
      }
    }
  }

  function onExtension(ws, program, instance) {
    const fresh = makeEntry(program, instance);
    const e = entries.get(fresh.key) ?? fresh;
    // A live entry is replaced only by the same instance id from the same program (a service worker restart); a legacy
    // extension has no id to prove anything, and another program claiming a live id is refused and logged.
    if (e.ext?.readyState === WebSocket.OPEN && Date.now() - e.extSeen < staleMs && (!instance || e.program !== program)) {
      log(`refused an extension connection claiming ${instance ? `live instance ${instance}` : `live ${e.key}`} from "${program}"`);
      return ws.close(1008, 'extension already connected');
    }
    e.ext?.close(1000, 'replaced by a newer extension connection');
    e.program = program;
    e.title = '';
    entries.set(e.key, e);
    e.ext = ws;
    e.extSeen = Date.now();
    for (const s of e.sessions()) s.offered.clear();
    ws.on('error', () => {});
    ws.on('message', data => {
      e.extSeen = Date.now();
      let m;
      try { m = JSON.parse(data.toString()); } catch { return; } // one bad frame must not take the broker down
      try {
        if (m.id) {
          const p = e.pending.get(m.id);
          e.pending.delete(m.id);
          if (p) m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
        } else onEvent(e, m);
      } catch (err) { log('bad extension message:', err.message); }
    });
    ws.on('close', () => {
      if (e.ext !== ws) return; // a replaced socket must not fail the new connection's calls
      e.ext = null;
      const lost = nameOf(e); // named while it is still listed: its name may carry an instance suffix
      if (entries.get(e.key) === e) entries.delete(e.key);
      // Only this browser's sessions end; the reason says which browser went away and which are left (a close reason is at most 123 bytes).
      for (const s of e.sessions()) s.ws.close(1000, `${lost} disconnected. Still connected: ${names() || 'none'}`.slice(0, 120));
      for (const p of e.pending.values()) p.reject(new Error('The browser extension disconnected.'));
      e.pending.clear();
    });
  }

  async function onCdp(ws, id, want) {
    const entry = resolve(want);
    if (!entries.size) return ws.close(1000, 'extension not connected');
    // A close reason is at most 123 bytes.
    if (!entry) return ws.close(1008, (want ? `no connected browser matches "${want}". Connected: ${names()}` : `several browsers are connected, say which one. Connected: ${names()}`).slice(0, 120));
    // A reconnect with the same id (the old socket's close event may not have arrived yet) replaces the old connection.
    const old = sessions.get(id);
    if (old) { old.ws.close(1008, 'replaced by a newer connection with the same session id'); old.release(); }
    const me = new Session(id, ws, entry);
    sessions.set(id, me);
    ws.on('error', () => {});
    // Registered first: a client that drops during the awaits below must still release its tabs.
    ws.on('close', () => me.release());
    // Playwright starts talking the moment the socket opens, so listen now and hold its messages until the session is ready.
    let ready;
    const readyP = new Promise(r => { ready = r; });
    ws.on('message', async data => {
      await readyP;
      if (me.closed) return;
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      const { id: msgId, sessionId, method, params } = msg;
      if (process.env.BRIDGE_TRACE) log('cmd', method, sessionId ?? '');
      try { me.toClient({ id: msgId, sessionId, result: (await me.command(method, params, sessionId)) ?? {} }); }
      catch (e) { log('command failed:', method, e.message); me.toClient({ id: msgId, sessionId, error: { message: e.message } }); }
    });
    // Only the tab the user is looking at right now is offered to this session.
    let active = usable(await entry.call('chrome.tabs.query', [{ active: true, lastFocusedWindow: true }]).catch(() => []));
    if (!active.length) active = usable(await entry.call('chrome.tabs.query', [{ active: true }]).catch(() => [])); // no focused window (headless, minimised)
    for (const t of active.slice(0, 1)) me.offered.add(t.id); // one tab: with several windows "active" would pick one per window
    log(`CDP session ${id} connected; tabs offered:`, [...me.offered]);
    ready();
  }

  // Control channel: the MCP server of a session asks the broker for things that are not CDP (extension status,
  // window restore around a capture). Same auth as /cdp; one JSON request per message.
  const controls = new Set(); // open control sockets: a session that is mid-attach keeps the broker alive
  function onControl(ws, sid, want) {
    // The browser a request applies to: the one the session is attached to, else the one asked for, else the only one.
    const e0 = sessions.get(sid)?.entry ?? resolve(want);
    const noEntry = () => new Error(entries.size ? `Say which browser (several are connected: ${names()}).` : 'The browser extension is not connected.');
    // Every method that talks to a browser reads the entry through this: with none to pick it fails instead of guessing.
    const E = () => { if (!e0) throw noEntry(); return e0; };
    controls.add(ws);
    ws.on('close', () => controls.delete(ws));
    ws.on('error', () => {});
    const methods = {
      status: () => ({ connected: true, extension: e0 ? e0.ext?.readyState === WebSocket.OPEN : entries.size > 0, browsers: entries.size, sessions: sessions.size, uptimeMs: Date.now() - startedAt }),
      // The connected browsers, for list_connected_browsers: name, program path, instance id when the name is shared, in use or not.
      browsers: () => [...entries.values()].map(b => ({ name: nameOf(b), program: b.program, ...(b.instance && nameOf(b) !== base(b) ? { instance: b.instance } : {}), title: b.title ?? '', inUse: b.sessions().length > 0 })),
      // Tabs the user has looked at that no session owns: shown to the agent, never attached without a free session.
      // Only origin and path leave the broker: a query string or fragment often carries tokens.
      unclaimed: async () => {
        const e = E(), ids = new Set();
        for (const s of e.sessions()) for (const id of s.offered) if (!e.owners.has(id)) ids.add(id);
        if (!ids.size) return [];
        return (await e.call('chrome.tabs.query', [{}])).filter(t => ids.has(t.id)).flatMap(t => {
          try { const u = new URL(t.url); return /^https?:$/.test(u.protocol) ? [{ id: t.id, url: u.origin + u.pathname }] : []; } catch { return []; }
        });
      },
    };
    // For the cross-browser matrix runner: the tabs under one url prefix with their owner (origin and path only; without a
    // prefix nothing, so the whole browser is never listed), and the extension's reveal/hide, the same steps a capture of
    // a background tab uses to show a tab without taking focus.
    methods.tabs = async prefix => !prefix ? [] : (await E().call('chrome.tabs.query', [{}])).flatMap(t => {
      try { const u = new URL(t.url); const url = u.origin + u.pathname; return /^https?:$/.test(u.protocol) && url.startsWith(prefix) ? [{ id: t.id, active: !!t.active, windowId: t.windowId, url, owner: E().owners.get(t.id)?.session.id ?? null }] : []; } catch { return []; }
    });
    methods.reveal = tabId => E().call('agent.reveal', [tabId]);
    methods.hide = shown => E().call('agent.hide', [shown]);
    ws.on('message', async raw => {
      let req;
      try { req = JSON.parse(raw.toString()); } catch { return; }
      const { id, method, params = [] } = req;
      try {
        if (!Object.hasOwn(methods, method)) throw new Error(`Unknown control method ${method}`);
        ws.send(JSON.stringify({ id, result: (await methods[method](...params)) ?? null }));
      } catch (e) { ws.send(JSON.stringify({ id, error: String(e.message ?? e) })); }
    });
  }

  const server = http.createServer((q, r) => { r.statusCode = 404; r.end(); });
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const deny = () => { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); };
    // Host first, and a request line that is not a URL is just denied: nothing before the checks may throw.
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return deny();
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { return deny(); }
    const path = url.pathname;
    const sid = url.searchParams.get('s') ?? '';
    // A web page always sends an Origin header, so only the extension (by id) or an origin-less local client gets in.
    // The local client must also know the broker's token, so web pages and other users of this PC cannot drive the browser.
    const ok = ((path === '/extension' && req.headers.origin === `chrome-extension://${EXTENSION_ID}`)
      || ((path === '/cdp' || path === '/control') && req.headers.origin === undefined && url.searchParams.get('t') === token && SESSION_ID.test(sid)));
    if (!ok) return deny();
    const want = url.searchParams.get('b') || undefined; // the browser a client asks for, by name
    const up = (...a) => wss.handleUpgrade(req, socket, head, ws => (path === '/extension' ? onExtension(ws, ...a) : path === '/cdp' ? onCdp(ws, sid, want) : onControl(ws, sid, want)));
    if (path !== '/extension') return up();
    // The extension announces its instance id in the url (?i=); a malformed one is treated as none (a legacy extension).
    const id = url.searchParams.get('i'), instance = id && SESSION_ID.test(id) ? id : undefined;
    // Who opened the connection is asked before the handshake completes; a failing lookup means "unknown", never a refusal.
    Promise.resolve().then(() => identify({ req, remoteAddress: socket.remoteAddress, remotePort: socket.remotePort })).catch(() => undefined)
      .then(program => up(typeof program === 'string' ? program : '', instance));
  });
  const listening = new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });

  return {
    listening,
    port,
    cdpEndpoint: (sid = 'default') => `ws://127.0.0.1:${port}/cdp?t=${token}&s=${sid}`,
    extensionConnected: () => entries.size > 0,
    sessionCount: () => sessions.size,
    busy: () => sessions.size + controls.size > 0, // a session attached, or one that is talking to us right now
    token,
    close: () => { for (const c of wss.clients) c.terminate(); server.close(); server.closeAllConnections?.(); },
  };
}
