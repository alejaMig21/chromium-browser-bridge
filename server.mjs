// Claude-in-Chrome-compatible browser tools over CDP, with a URL policy (policy.mjs).
// Tool names and arguments mirror the Claude extension so existing prompts keep working.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from 'playwright-core';
import { z } from 'zod';
import gifenc from 'gifenc';
import pngjs from 'pngjs';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUrl, loadPolicy } from './policy.mjs';
import { brokerClient, choiceNote, describeBrowsers } from './broker-client.mjs';
import { installGuide, defaultBrowserProgram, matchBrowsers } from './platform.mjs';
import { resolveBrowser, launchArgs, startBrowser, findBrowserPid, waitForCdp, waitForPage, cdpUp, isOwned, ownership, killOwned, loadState, saveState, clearState } from './launcher.mjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const { PNG } = pngjs;
const here = dirname(fileURLToPath(import.meta.url));
const policy = loadPolicy(process.env.BROWSER_POLICY ?? join(here, 'policy.json'));
let cdp = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
let attachedWs = null; // set while attached to a browser the user already had open (never launched or closed by us)
let attachedName = ''; // the connected-browser name that attachment went to
// The Local Browser Bridge extension, installed once in the user's own browser, connects here.
const SESSION_ID = randomUUID(); // this MCP server's identity on the bridge
// Every Claude session's MCP server shares one broker that owns the bridge port; it is started on first use.
const broker = brokerClient({ sessionId: SESSION_ID, port: Number(process.env.BROWSER_BRIDGE_PORT ?? 9340), defaultBrowser: defaultBrowserProgram, log: (...a) => console.error('[broker-client]', ...a) });
const OUT = process.env.BROWSER_OUTPUT ?? join(here, 'output');
// Everything this server (and the browsers it launches) writes to the temp dir lives under ONE root.
// Leftovers older than a day are dropped on start; Playwright's per-connection folders on every disconnect and exit.
const tmpRoot = process.env.CLAUDE_BROWSER_TMP ?? join(tmpdir(), 'claude-browser-cdp');
mkdirSync(tmpRoot, { recursive: true });
for (const e of readdirSync(tmpRoot)) { try { if (Date.now() - statSync(join(tmpRoot, e)).mtimeMs > 864e5) rmSync(join(tmpRoot, e), { recursive: true, force: true }); } catch { /* in use */ } }
process.env.TEMP = process.env.TMP = tmpRoot;
const scratch = join(tmpRoot, 'scratch');
function cleanArtifacts() {
  try { for (const e of readdirSync(tmpRoot)) if (e.startsWith('playwright-artifacts-')) rmSync(join(tmpRoot, e), { recursive: true, force: true }); } catch { /* best effort */ }
}
process.on('exit', cleanArtifacts);
// A stray rejection from a closed page must not kill the stdio server.
process.on('unhandledRejection', e => console.error('unhandledRejection:', e));
process.on('uncaughtException', e => console.error('uncaughtException:', e));

// ---- browser state ----
let ctx, curBrowser;
let work; // attached mode: the page the agent acts on by default; the user switching tabs never changes it
let nextId = 1;
const ids = new WeakMap(), logs = new WeakMap(), images = new Map(), gifs = new Map();
const numByTarget = new Map(); // CDP targetId -> stable tab number, survives reconnects
const idByUrl = new Map(); // attached mode: url -> tab number, the same idea (no target id is reachable through the extension)

// One tracking promise per page, so concurrent callers (the 'page' event and openTab) all wait for the same id assignment.
const tracking = new WeakMap();
function track(page) {
  if (!tracking.has(page)) tracking.set(page, doTrack(page));
  return tracking.get(page);
}

async function doTrack(page) {
  const l = { console: [], net: [], pending: new Set() }; // pending: requests still open, so a slow page can say it is still loading
  logs.set(page, l);
  const open = r => { if (r.resourceType() !== 'eventsource') l.pending.add(r); }, shut = r => l.pending.delete(r); // a stream never ends
  page.on('request', open); page.on('requestfinished', shut); page.on('requestfailed', shut);
  page.on('console', m => l.console.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => l.console.push({ type: 'error', text: String(e) }));
  page.on('response', r => l.net.push({ method: r.request().method(), url: r.url(), status: r.status() }));
  // Through the browser extension (chrome.debugger) extra CDP sessions are not allowed, and tab ids only need to
  // live as long as the connection; otherwise the CDP target id keeps a tab's number stable across reconnects.
  // A tab keeps the number the agent already holds across a reconnect (the agent calls browser_attach again, the
  // connection drops overnight): the number is remembered by url, and only taken if no live tab already has it.
  if (attachedWs) {
    const inUse = new Set(page.context().pages().map(p => ids.get(p)));
    const old = idByUrl.get(page.url());
    ids.set(page, old && !inUse.has(old) ? old : nextId++);
    idByUrl.set(page.url(), ids.get(page));
    return;
  }
  const s = await page.context().newCDPSession(page);
  const { targetInfo } = await s.send('Target.getTargetInfo');
  await s.detach().catch(() => {});
  if (!numByTarget.has(targetInfo.targetId)) numByTarget.set(targetInfo.targetId, nextId++);
  ids.set(page, numByTarget.get(targetInfo.targetId));
  page.targetId = targetInfo.targetId;
}

async function connect() {
  // A browser that is gone gets its answer from the broker's list: Playwright waits out its whole timeout on a socket the broker closes at once.
  if (attachedWs) { const gone = await lostBrowserNote(); if (gone) throw new Error(`${gone} Call browser_attach again.`); }
  // The user's own browser may ask them to approve the connection, so give them a minute to answer.
  const browser = await chromium.connectOverCDP(attachedWs ?? cdp, { timeout: attachedWs ? 60000 : 10000 }).catch(e => {
    throw new Error(attachedWs
      ? `The attached browser did not accept the connection (${e.message.split('\n')[0].replace(/t=[0-9a-f]{32}/g, 't=***')}). If it showed a prompt to allow remote debugging, the user must accept it; otherwise remote debugging may have been switched off or the browser closed. Call browser_attach again.`
      : `No browser is reachable at ${cdp} (${e.message.split('\n')[0]}). Call browser_launch to start one, browser_attach for one the user already has open, or browser_reconnect if it is already running.`);
  });
  const c = browser.contexts()[0];
  // Enforce the URL policy on every top-level navigation, including redirects and link clicks.
  await c.route('**/*', route => {
    try {
      const r = route.request();
      if (r.isNavigationRequest() && r.frame().parentFrame() === null && !checkUrl(r.url(), policy).ok) return route.abort('blockedbyclient').catch(() => {});
    } catch { /* requests without a frame (workers) are not navigations */ }
    return route.continue().catch(() => {});
  });
  // No popups: a script-opened tab can wedge the whole CDP session (Vivaldi never resumes the new target)
  // and would sit outside the tab the user is watching. Links open in the same tab instead.
  // Only in launched mode: in the user's own browser popups (OAuth) must keep working.
  if (!attachedWs) await c.addInitScript(() => {
    window.open = () => null;
    addEventListener('click', e => { const a = e.target?.closest?.('a[target]'); if (a && a.target === '_blank') a.target = '_self'; }, true);
  });
  await Promise.all(c.pages().map(track));
  c.on('page', p => track(p).catch(() => {}));
  browser.on('disconnected', () => { if (ctx === c) ctx = undefined; });
  // A freshly started browser opens its first tab a moment after the port answers.
  for (let i = 0; i < 40 && !c.pages().length && !attachedWs; i++) await sleep(250);
  await Promise.all(c.pages().map(track));
  const old = curBrowser;
  ctx = c; curBrowser = browser;
  await old?.close().catch(() => {});
  return c;
}

// A killed browser can leave a stale Playwright connection for a moment, so probe the port as well.
async function context() {
  if (ctx && curBrowser?.isConnected() && (attachedWs || await cdpUp(cdp))) return ctx;
  ctx = undefined;
  return connect();
}

// Drop the Playwright connection only; the browser itself keeps running.
async function disconnect() {
  const b = curBrowser;
  if (ctx) await Promise.all(ctx.pages().filter(p => !p.isClosed()).map(overlayRemove));
  ctx = curBrowser = work = undefined;
  newTabBroken = false;
  await Promise.race([b?.close().catch(() => {}), sleep(5000)]);
  cleanArtifacts();
}

// Some browsers (headless Vivaldi) never announce tabs created over CDP; give up fast and say so.
let newTabBroken = false;
async function openTab(url) {
  if (newTabBroken) throw new Error('This browser does not support opening tabs over CDP. Use navigate in an existing tab.');
  const c = await context();
  // The real reason is kept: swallowing it hid a Vivaldi tab that stayed empty. In the user's own browser a slow tab is
  // not a reason to give up for good (the flag is only for browsers that never announce the tab).
  let failure;
  const page = await Promise.race([c.newPage().catch(e => { failure = e; return null; }), sleep(attachedWs ? 20000 : 4000).then(() => null)]);
  if (!page) {
    if (!attachedWs) newTabBroken = true;
    throw new Error(failure ? `The browser could not create the tab: ${String(failure.message).split('\n')[0]}` : 'This browser did not create the tab over CDP. Use navigate in an existing tab.');
  }
  await track(page);
  if (attachedWs) work = page; // a tab the agent opens becomes its work tab
  if (url) await page.goto(url);
  return page;
}

async function visiblePage(pages) {
  for (const p of pages) {
    const state = await Promise.race([p.evaluate(() => document.visibilityState).catch(() => null), sleep(1500).then(() => null)]);
    if (state === 'visible') return p;
  }
  return pages[0];
}

async function tab(tabId) {
  const c = await context();
  const pages = c.pages().filter(p => !p.isClosed());
  // In the user's own browser the default tab is the one they are looking at, not an arbitrary first one.
  // Attached: the work tab is fixed at attach time (the tab the user was looking at), so switching tabs or
  // minimizing the browser does not redirect the agent. An explicit tabId (or a tab the agent opens) moves it.
  const page = tabId !== undefined ? pages.find(p => ids.get(p) === tabId)
    : attachedWs ? (work && !work.isClosed() ? work : await visiblePage(pages)) : pages[0];
  if (!page) throw new Error(tabId === undefined ? 'No tabs open. Use tabs_context_mcp with createIfEmpty.' : `Tab ${tabId} not found.`);
  // Our own browser: a policy-aborted navigation leaves Chromium's error page behind and internal pages are
  // blanked. The user's browser: never navigate their tabs away, just refuse to act on them.
  const internal = /^(chrome-error|chrome|vivaldi|edge|brave):/.test(page.url());
  if (internal && attachedWs) throw new Error(`Tab ${ids.get(page)} is a browser-internal page (${page.url()}); it was left untouched.`);
  if (internal) await page.goto('about:blank').catch(() => {});
  const v = checkUrl(page.url() || 'about:blank', policy);
  if (!v.ok) {
    if (!attachedWs) await page.goto('about:blank').catch(() => {});
    throw new Error(`${v.reason}${attachedWs ? ' (the tab was left untouched)' : ''}`);
  }
  // The work tab moves only to a tab that passed the checks above; the tab it leaves loses its overlay.
  if (attachedWs && page !== work) { if (work && !work.isClosed()) void overlayRemove(work); work = page; }
  if (attachedWs) idByUrl.set(page.url(), ids.get(page));
  void overlay(page); // presence on every tool call; clicks and hovers then move the cursor to their point
  return page;
}

// ---- idle shutdown ----
// An open debug port lets any local program drive the browser, so a browser nobody is using gets closed.
// The MCP server process stays up (Claude Code owns it); the next call just says to run browser_launch.
const IDLE_MS = Number(process.env.BROWSER_IDLE_MS ?? 10 * 60 * 1000); // 0 disables
let idleTimer, inflight = 0;
const cdpPort = () => new URL(cdp).port;
function touch() {
  clearTimeout(idleTimer);
  if (IDLE_MS > 0 && inflight === 0) idleTimer = setTimeout(idleClose, IDLE_MS);
}
async function idleClose() {
  if (inflight > 0) return touch();
  // The user's own browser keeps its debug port open whatever we do, and every new connection makes
  // them approve a prompt again, so an attached session is never dropped on idle (browser_close ends it).
  if (attachedWs) return;
  try {
    await disconnect(); // a browser the user started themselves is only detached
    attachedWs = null;  // and never silently re-attached: the next call must ask for browser_attach again
    const s = loadState(cdpPort());
    if (s && await killOwned(s, here)) console.error(`Closed idle ${s.name} after ${IDLE_MS / 1000}s without tool calls.`);
    if (s) clearState(s.port);
  } catch (e) { console.error('idle close failed:', e); }
}

// ---- tool registry ----
const server = new McpServer({ name: 'browser-cdp', version: '1.0.0' });
const tools = {};
const READ_ONLY = new Set(['read_page', 'find', 'get_page_text', 'read_console_messages', 'read_network_requests']);
const tabIdArg = z.number().optional().describe('Tab ID; defaults to the work tab (the tab the user was on when attached, or the last one you used)');
function reg(name, description, shape, fn) {
  tools[name] = fn;
  server.tool(name, description, shape, async args => {
    inflight++; clearTimeout(idleTimer);
    try {
      // A hung browser call must come back as an error, not block the session forever.
      // A tool that takes its own `timeout` (seconds; navigate, wait_for) gets that long plus a margin.
      const limit = Math.max(90, (Number(args?.timeout) || 0) + 30);
      const attempt = () => Promise.race([fn(args), sleep(limit * 1000).then(() => { throw new Error(`${name} timed out after ${limit}s; the browser may be unresponsive.`); })]);
      // Reading while the page navigates destroys the execution context; read-only tools are safe to retry once.
      const r = await attempt().catch(async e => {
        if (!READ_ONLY.has(name) || !/Execution context was destroyed/.test(String(e.message))) throw e;
        await sleep(1500);
        return attempt();
      });
      return { content: typeof r === 'string' ? [{ type: 'text', text: r }] : r };
    } catch (e) {
      // The broker (and with it the browser connection) can die under a running call: say what to do.
      const lost = attachedWs && /Target (page, context or browser )?(has been )?closed|Connection closed|browser has been closed/i.test(String(e.message));
      const gone = lost ? await lostBrowserNote() : '';
      return { isError: true, content: [{ type: 'text', text: String(e.message ?? e) + (gone ? ` ${gone} Call browser_attach again.` : lost ? ' The connection to the browser broker was lost; call browser_attach again.' : '') }] };
    }
    finally { inflight--; touch(); }
  });
}
const img = buf => ({ type: 'image', data: buf.toString('base64'), mimeType: 'image/png' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The user's browser is never pulled to the foreground: a capture of a background tab is tried as is; only if it
// fails, a minimized window of an attached tab is restored WITHOUT focus. A browser we launched ourselves may be
// brought to the front. scale 'css': the image is in CSS pixels, the unit of the reported size and of click coordinates.
const hiding = new WeakMap(); // parallel captures of one page: the overlay comes back only when the last one is done
// A capture is always the whole viewport as the browser paints it, in device pixels: no clip and no scale (those make the
// browser resize the page while it captures, which is what shrank the user's page; the official Claude extension does not
// use them either). The agent works in CSS pixels (click coordinates), so the scaling and the zoom crop happen here, in
// plain code. `clip` is a region in CSS pixels: the result is that region at full device resolution.
function cssImage(buf, dpr, clip) {
  if (dpr === 1 && !clip) return buf;
  const src = PNG.sync.read(buf);
  const px = (x, y, c) => src.data[(y * src.width + x) * 4 + c];
  if (clip) {
    const x0 = Math.max(0, Math.round(clip.x * dpr)), y0 = Math.max(0, Math.round(clip.y * dpr));
    const w = Math.max(1, Math.min(src.width - x0, Math.round(clip.width * dpr))), h = Math.max(1, Math.min(src.height - y0, Math.round(clip.height * dpr)));
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(src, out, x0, y0, w, h, 0, 0);
    return PNG.sync.write(out);
  }
  const w = Math.max(1, Math.round(src.width / dpr)), h = Math.max(1, Math.round(src.height / dpr));
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // bilinear
    const fx = Math.min(src.width - 1, Math.max(0, (x + 0.5) * dpr - 0.5)), fy = Math.min(src.height - 1, Math.max(0, (y + 0.5) * dpr - 0.5));
    const x1 = Math.floor(fx), y1 = Math.floor(fy), x2 = Math.min(src.width - 1, x1 + 1), y2 = Math.min(src.height - 1, y1 + 1), tx = fx - x1, ty = fy - y1;
    for (let c = 0; c < 4; c++) out.data[(y * w + x) * 4 + c] = Math.round((px(x1, y1, c) * (1 - tx) + px(x2, y1, c) * tx) * (1 - ty) + (px(x1, y2, c) * (1 - tx) + px(x2, y2, c) * tx) * ty);
  }
  return PNG.sync.write(out);
}

async function shot(page, opts = {}) {
  // Attached: the broker owns the fallbacks (wake the tab with tiny captures, optionally show it), so its worst case must
  // fit inside this deadline.
  const take = timeout => page.screenshot({ type: 'png', timeout });
  hiding.set(page, (hiding.get(page) ?? 0) + 1);
  await overlayVisible(page, false);
  try {
    const raw = attachedWs ? await take(30000) : await take(10000).catch(async () => { await page.bringToFront().catch(() => {}); return take(10000); });
    return cssImage(raw, await page.evaluate(() => devicePixelRatio), opts.clip);
  } finally {
    hiding.set(page, hiding.get(page) - 1);
    if (!hiding.get(page)) await overlayVisible(page, true);
  }
}

// ---- agent overlay: glow border, moving cursor and badge on the work tab ----
// Closed shadow root and pointer-events:none, so it never changes what the page sees or receives. Created lazily
// on the first action, hidden while a screenshot is taken, faded after 10 s idle, removed on disconnect.
function installOverlay({ x, y }) {
  let host = document.querySelector('[data-claude-overlay]');
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-claude-overlay', '');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    const root = host.attachShadow({ mode: 'closed' });
    // DOM and constructed stylesheet instead of innerHTML and <style>: strict CSP and Trusted Types pages allow them.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      .glow{position:absolute;inset:0;box-shadow:inset 0 0 28px 6px rgba(217,119,87,.55);border:2px solid rgb(217,119,87);box-sizing:border-box;transition:opacity .3s}
      .cur{position:absolute;left:0;top:0;width:20px;height:20px;transition:transform .25s ease-out,opacity .3s}
      .badge{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font:600 12px system-ui,sans-serif;color:#fff;background:rgb(217,119,87);padding:5px 12px;border-radius:999px;transition:opacity .3s}
      :host(.idle) .glow,:host(.idle) .cur,:host(.idle) .badge{opacity:0}`);
    root.adoptedStyleSheets = [sheet];
    const el = (tag, cls, ns) => { const e = ns ? document.createElementNS(ns, tag) : document.createElement(tag); e.setAttribute('class', cls); return e; };
    const SVG = 'http://www.w3.org/2000/svg';
    const cur = el('svg', 'cur', SVG);
    cur.setAttribute('viewBox', '0 0 20 20'); cur.setAttribute('width', '20'); cur.setAttribute('height', '20');
    const arrow = document.createElementNS(SVG, 'path');
    for (const [k, v] of Object.entries({ d: 'M2 2l14 6-6 2-2 6z', fill: 'rgb(217,119,87)', stroke: '#fff', 'stroke-width': '1.2' })) arrow.setAttribute(k, v);
    cur.append(arrow);
    const badge = el('div', 'badge'); badge.textContent = 'Claude is working';
    root.append(el('div', 'glow'), cur, badge);
    let timer;
    host.__api = {
      act(px, py) {
        host.dataset.state = 'active';
        host.classList.remove('idle');
        if (px !== undefined) { host.dataset.x = px; host.dataset.y = py; cur.style.transform = `translate(${px}px,${py}px)`; }
        clearTimeout(timer);
        timer = setTimeout(() => { host.dataset.state = 'idle'; host.classList.add('idle'); }, 10000);
      },
    };
    host.dataset.state = 'idle';
    document.documentElement.append(host);
  }
  host.__api.act(x, y);
}
// Presence is cosmetic: it must never make a tool fail or wait.
const withTimeout = (p, ms = 1500) => Promise.race([p.catch(() => {}), sleep(ms)]);
const overlay = (page, x, y) => withTimeout(page.evaluate(installOverlay, { x, y }));
const overlayVisible = (page, on) => withTimeout(page.evaluate(on => { const h = document.querySelector('[data-claude-overlay]'); if (h) h.style.display = on ? '' : 'none'; }, on));
const overlayRemove = page => withTimeout(page.evaluate(() => document.querySelector('[data-claude-overlay]')?.remove()), 2000);

async function frame(page) {
  const g = gifs.get(ids.get(page));
  if (g?.recording && g.frames.length < 150) g.frames.push(await shot(page));
}

// ---- in-page helpers (serialized into the page by Playwright) ----
function pageTree({ filter, maxDepth, refId, focusOnly }) {
  window.__refs ??= new Map(); window.__refN ??= 0; window.__rev ??= new WeakMap();
  const ROLES = { A: 'link', BUTTON: 'button', SELECT: 'combobox', TEXTAREA: 'textbox', IMG: 'img', H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading' };
  const INPUT = { checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button' };
  // display:contents (common around web-component internals) has no box of its own but its children are on screen.
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && (s.display === 'contents' || (r.width > 0 && r.height > 0)); };
  const isDialog = el => el.tagName === 'DIALOG' || /^(alert)?dialog$/.test(el.getAttribute('role') ?? '');
  const dialogName = el => (el.getAttribute('aria-label') || document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.innerText || el.querySelector('h1,h2,h3,h4,h5,h6')?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const modals = [];
  const inter = el => /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName) || el.hasAttribute('onclick') || el.hasAttribute('tabindex') || ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'textbox', 'combobox', 'switch'].includes(el.getAttribute('role'));
  const role = el => el.getAttribute('role') || (el.tagName === 'INPUT' ? INPUT[el.type] || 'textbox' : ROLES[el.tagName]) || el.tagName.toLowerCase();
  const nm = el => (el.getAttribute('aria-label') || el.alt || el.title || el.placeholder || el.labels?.[0]?.innerText || (el.tagName === 'INPUT' ? el.value : '') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const ref = el => { let r = window.__rev.get(el); if (!r) { r = 'ref_' + (++window.__refN); window.__rev.set(el, r); window.__refs.set(r, el); } return r; };
  if (focusOnly) { // one cheap look instead of the whole tree: what has focus (also inside shadow roots) and which dialog is open
    let a = document.activeElement; while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    const dlg = document.querySelector(':modal') ?? a?.closest?.('dialog,[role=dialog],[role=alertdialog]');
    return { focus: a && a !== document.body && a !== document.documentElement ? `${role(a)} "${nm(a)}"` : 'none', dialog: dlg ? `"${dialogName(dlg)}"` : null };
  }
  const lines = [];
  const walk = (el, d) => {
    if (maxDepth && d > maxDepth) return;
    if (!vis(el)) return;
    const pad = '  '.repeat(Math.min(d, 8));
    if (isDialog(el)) {
      lines.push(`${pad}dialog "${dialogName(el)}" [${ref(el)}]`);
      if (el.matches(':modal')) modals.push(dialogName(el));
    } else if (inter(el) || (filter !== 'interactive' && (/^H[1-6]$/.test(el.tagName) || el.tagName === 'IMG')))
      lines.push(`${pad}${role(el)} "${nm(el)}" [${ref(el)}]${el.href ? ` href="${el.href}"` : ''}${el.tagName === 'INPUT' ? ` type=${el.type}` : ''}`);
    else if (filter !== 'interactive') {
      const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim().replace(/\s+/g, ' ');
      if (t) lines.push(`${pad}text "${t.slice(0, 100)}"`);
    }
    // Open shadow roots are walked too; a closed one cannot be reached from the page.
    for (const c of [...(el.shadowRoot?.children ?? []), ...el.children]) walk(c, d + 1);
  };
  const root = refId ? window.__refs.get(refId) : document.body;
  if (!root) return 'Error: ref not found (page changed?). Call read_page again.';
  walk(root, 0);
  // A modal dialog makes the rest of the page inert: say so first, so an agent does not click behind it.
  if (modals.length) lines.unshift(`NOTE: modal dialog open: "${modals[modals.length - 1]}" - the rest of the page is inert until it is closed.`);
  return lines.join('\n') || '(no matching elements)';
}

// What an agent cannot see after a key or click: which element has focus, whether a dialog is open, whether the page moved.
async function feedback(page, url0) {
  await sleep(100); // a click that navigates commits a moment later
  const f = await withTimeout(page.evaluate(pageTree, { focusOnly: true }), 2000);
  const url = page.url();
  return `focus: ${f?.focus ?? 'unknown (page is loading)'} | dialog: ${f?.dialog ?? 'none'} | url: ${url === url0 ? 'unchanged' : url}`;
}

async function elementByRef(page, ref) {
  const h = (await page.evaluateHandle(r => window.__refs?.get(r) ?? null, ref)).asElement();
  if (!h) throw new Error(`Element ${ref} not found. Call read_page again.`);
  return h;
}

async function point(page, { coordinate, ref }) {
  if (ref) {
    const h = await elementByRef(page, ref);
    await h.scrollIntoViewIfNeeded();
    const b = await h.boundingBox();
    if (!b) throw new Error(`Element ${ref} is not visible.`);
    return [b.x + b.width / 2, b.y + b.height / 2];
  }
  if (!coordinate) throw new Error('coordinate or ref is required');
  return coordinate;
}

const KEYS = { ctrl: 'Control', control: 'Control', cmd: 'Meta', command: 'Meta', meta: 'Meta', win: 'Meta', alt: 'Alt', option: 'Alt', shift: 'Shift', enter: 'Enter', return: 'Enter', esc: 'Escape', escape: 'Escape', del: 'Delete', backspace: 'Backspace', tab: 'Tab', space: 'Space', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', pageup: 'PageUp', pagedown: 'PageDown', home: 'Home', end: 'End' };
const combo = s => s.split('+').map(k => KEYS[k.toLowerCase()] ?? k).join('+');

// ---- browser lifecycle ----
async function start({ browser = 'vivaldi', headless = false, port = 9333 }) {
  const { name, exe } = resolveBrowser(browser);
  const endpoint = `http://127.0.0.1:${port}`;
  if (await cdpUp(endpoint)) return { endpoint, launched: false, name };
  const spawned = startBrowser(exe, launchArgs({ name, port, root: here, headless }));
  await waitForCdp(endpoint);
  saveState({ pid: await findBrowserPid(name, port) ?? spawned, name, port, browser, headless });
  await waitForPage(endpoint);
  return { endpoint, launched: true, name };
}

reg('browser_attach', "Attach to the browser the user ALREADY has open (their real profile, tabs and logins) through the Local Browser Bridge extension. Needs that extension installed once in their browser; after that there are no prompts and no accounts. Works on one work tab, the tab the user is looking at when you attach; it stays your default when they switch tabs or minimize the browser (tabs_context_mcp marks it; pass tabId to act on another). The browser is never launched, restarted or closed by this tool, and the user's tabs are never navigated away by it. Optional browser (chrome, edge, brave, opera, vivaldi, chromium) picks which connected browser to attach when several are open (without it: the only connected one, else the system default if connected, else this fails and lists them), and tailors the install help if that browser is not connected. The reply names the browser and how it was chosen.", { browser: z.string().optional() }, async ({ browser }) => {
  const unsupported = browser && /not supported/.test(installGuide(browser, ''));
  if (unsupported) throw new Error(installGuide(browser, '')); // no point waiting for an extension that cannot exist
  // Attaching again must not renumber the tabs or move the work tab: a live attachment is kept as it is.
  // Naming another browser is a switch, not a repeat: it falls through, and disconnect() below releases this session's tabs in the first one.
  if (attachedWs && work && !work.isClosed() && (!browser || matchBrowsers(browser, [{ name: attachedName }]).length) && await healthy()) return `Already attached to the user's own browser. Tabs in play: ${ctx.pages().length}. Work tab: Tab ID ${ids.get(work)}; it stays your default.`;
  let picked;
  try { picked = await broker.chooseBrowser({ browser, waitMs: Number(process.env.BROWSER_EXT_WAIT_MS ?? 35000) }); }
  catch (e) {
    if (!e.notConnected) throw e;
    throw new Error(`${e.connected.length ? `${e.message} ` : ''}${installGuide(browser, join(here, 'extension'))} If it is installed, make sure the browser is open and this server is running, then call browser_attach again.`);
  }
  await disconnect();
  attachedName = picked.name;
  attachedWs = broker.cdpEndpoint();
  let c;
  try { c = await connect(); } catch (e) { attachedWs = null; throw e; }
  const mine = c.pages().filter(p => !p.isClosed());
  if (!mine.length) return `${choiceNote(picked)} Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (new-tab page, settings) that is never touched. Open your own with tabs_create_mcp. This tool will not close the browser.`;
  work = await visiblePage(mine);
  return `${choiceNote(picked)} Attached to the user's own browser. Tabs in play: ${c.pages().length}. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not close it.`;
});
reg('browser_launch', 'Start a browser with a dedicated profile and a local debug port, then connect to it. If one already answers on that port, just attach. headless=true opens no window. For a browser the user already has open, use browser_attach instead.', { browser: z.string().optional().describe('vivaldi (default), chrome, edge, brave, or a path to a Chromium exe'), headless: z.boolean().optional(), port: z.number().optional() }, async args => {
  attachedWs = null;
  attachedName = '';
  const r = await start(args);
  cdp = r.endpoint;
  await disconnect();
  const c = await connect();
  return `${r.launched ? `Launched ${r.name}${args.headless ? ' (headless)' : ''}` : 'Attached to the browser already running'} on ${cdp}. Tabs: ${c.pages().length}.`;
});
reg('browser_status', 'Report whether a browser answers on the debug port, whether this server is connected, and whether this tool launched it.', {}, async () => {
  const v = await cdpUp(cdp), s = loadState(cdpPort()), connectedBrowsers = describeBrowsers(await broker.browsers());
  if (attachedWs) return JSON.stringify({ mode: 'attached to the user\'s own browser', connected: !!ctx && !!curBrowser?.isConnected(), tabs: ctx?.pages().length ?? 0, debuggerAttached: !!ctx && ctx.pages().length > 0, launchedByThisTool: false, idleCloseSeconds: IDLE_MS / 1000, broker: await broker.status(), connectedBrowsers }, null, 2);
  return JSON.stringify({ endpoint: cdp, reachable: !!v, browser: v?.Browser ?? null, connected: !!ctx, tabs: ctx?.pages().length ?? 0, launchedByThisTool: !!s && await isOwned(s, here), idleCloseSeconds: IDLE_MS / 1000, connectedBrowsers }, null, 2);
});
reg('list_connected_browsers', 'List the browsers connected through the Local Browser Bridge extension: name, program path, instance id when several share a name, active tab title, and whether a session is using it. Read-only: opens no tab and attaches nothing, so it works before browser_attach. Use it to see what browser_attach can pick from.', {}, async () => describeBrowsers(await broker.browsers()));
// Playwright hides the close reason the broker gives when this session's browser goes away, so say it from the broker's own list:
// empty unless the connection really dropped, the broker is still up and no longer lists the browser this session was attached to.
async function lostBrowserNote() {
  if (!attachedName || curBrowser?.isConnected()) return '';
  const alive = (await broker.status()).uptimeMs !== undefined, names = (await broker.browsers()).map(b => b.name);
  return alive && !names.includes(attachedName) ? `${attachedName} disconnected. Still connected: ${names.join(', ') || 'none'}.` : '';
}
// A live round-trip, because a wedged Playwright connection still reports itself as connected.
async function healthy() {
  if (!ctx || !curBrowser?.isConnected() || !(attachedWs || await cdpUp(cdp))) return false;
  if (attachedWs) { // no browser-level session through the extension: round-trip to a tab instead
    const p = ctx.pages().find(x => !x.isClosed());
    return !p || await Promise.race([p.evaluate(() => 1).then(() => true, () => false), sleep(3000).then(() => false)]);
  }
  try {
    const s = await curBrowser.newBrowserCDPSession();
    await Promise.race([s.send('Browser.getVersion'), sleep(3000).then(() => { throw new Error('timeout'); })]);
    await s.detach().catch(() => {});
    return true;
  } catch { return false; }
}

reg('browser_reconnect', 'Repair the connection to the browser. A healthy connection is left alone. Otherwise drop and re-open it; if the browser was launched by this tool and stays unreachable, restart it (open tabs are lost, the profile and its logins stay). A browser this tool did not launch is never restarted.', {}, async () => {
  if (await healthy()) return `Already connected and responsive on ${cdp}. Tabs: ${ctx.pages().length}.`;
  await disconnect();
  try { const c = await connect(); return `Reconnected to ${cdp}. Tabs: ${c.pages().length}.`; }
  catch (e) {
    if (attachedWs) throw e; // the user's own browser is never restarted
    const s = loadState(cdpPort());
    if (!s || (await ownership(s, here)) === 'foreign') throw e;
    await killOwned(s, here); // no-op when the browser already died
    for (let i = 0; i < 20 && await cdpUp(cdp); i++) await sleep(250);
    const r = await start(s);
    cdp = r.endpoint;
    const c = await connect();
    return `The browser was unresponsive: restarted ${r.name} and reconnected on ${cdp}. Tabs: ${c.pages().length}.`;
  }
});
reg('browser_close', 'Disconnect, and close the browser if this tool launched it. keepBrowser=true only disconnects. A browser this tool did not launch is never closed.', { keepBrowser: z.boolean().optional() }, async ({ keepBrowser }) => {
  const wasAttached = !!attachedWs;
  await disconnect();
  attachedWs = null;
  attachedName = '';
  if (wasAttached) { broker.close(); return "Detached from the user's own browser, which was left running untouched."; } // lets an idle broker stop
  const s = loadState(cdpPort());
  if (!s) return 'Disconnected. This tool did not launch that browser, so it was left running.';
  if (keepBrowser) return `Disconnected. ${s.name} (launched by this tool) was left running.`;
  const killed = await killOwned(s, here);
  clearState(s.port);
  return killed ? `Closed ${s.name}, which this tool had launched.` : 'Disconnected. The recorded browser process is gone or no longer ours; nothing was killed.';
});

// ---- tabs ----
reg('tabs_context_mcp', 'List open tabs (attached browser: the work tab is marked). createIfEmpty opens a blank tab when none exist.', { createIfEmpty: z.boolean().optional() }, async ({ createIfEmpty }) => {
  const c = await context();
  if (!c.pages().length && createIfEmpty) await openTab();
  const rows = await Promise.all((await context()).pages().map(async p => `Tab ID: ${ids.get(p)} | ${await p.title().catch(() => '')} | ${p.url()}${attachedWs && p === work ? ' | work tab' : ''}`));
  // Tabs the user looked at that no session owns (attached mode): listed so the agent knows they exist; they are not attached.
  const free = attachedWs ? (await broker.unclaimed()).filter(t => checkUrl(t.url, policy).ok) : []; // the policy applies to what the agent is told, too
  rows.push(...free.map(t => `Unclaimed tab (browser tab ${t.id}) | ${t.url} | not attached to any session; the user must bring it forward for an agent to take it`));
  return rows.join('\n') || 'No tabs open.';
});
reg('tabs_create_mcp', 'Open a new tab, optionally at a URL.', { url: z.string().optional() }, async ({ url }) => {
  if (url) { const v = checkUrl(url, policy); if (!v.ok) throw new Error(v.reason); }
  const p = await openTab(url);
  return `Created tab ${ids.get(p)}${url ? ` at ${url}` : ''}`;
});
reg('tabs_close_mcp', 'Close a tab.', { tabId: z.number() }, async ({ tabId }) => { const keep = work; const p = await tab(tabId); if (p !== keep) work = keep; await p.close(); return `Closed tab ${tabId}`; }); // closing a side tab must not move the work tab

// ---- navigation ----
reg('navigate', 'Navigate to a URL, or "back"/"forward". Answers as soon as the page starts to load (waitUntil domcontentloaded, 30 s); on a slow connection pass waitUntil load or networkidle and a longer timeout (seconds, up to 300), or follow with wait_for.', {
  url: z.string(), waitUntil: z.enum(['commit', 'domcontentloaded', 'load', 'networkidle']).optional(), timeout: z.number().max(300).optional(), tabId: tabIdArg,
}, async ({ url, waitUntil, timeout, tabId }) => {
  const page = await tab(tabId);
  const opts = { waitUntil: waitUntil ?? 'domcontentloaded', timeout: (timeout ?? 30) * 1000 };
  if (url === 'back') await page.goBack(opts);
  else if (url === 'forward') await page.goForward(opts);
  else {
    const target = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    const v = checkUrl(target, policy);
    if (!v.ok) throw new Error(v.reason);
    await page.goto(target, opts).catch(e => { if (!/ERR_BLOCKED_BY_CLIENT/.test(e.message)) throw e; throw new Error('Blocked by policy (redirect).'); });
    await overlay(page); // a navigation wipes the page's DOM, so draw the presence again
  }
  await frame(page);
  return `Navigated to ${page.url()} (${await page.title()})`;
});

// ---- computer ----
const computerShape = {
  action: z.enum(['left_click', 'right_click', 'type', 'screenshot', 'wait', 'scroll', 'key', 'left_click_drag', 'double_click', 'triple_click', 'zoom', 'scroll_to', 'hover']),
  coordinate: z.array(z.number()).length(2).optional(), start_coordinate: z.array(z.number()).length(2).optional(),
  text: z.string().optional(), ref: z.string().optional(), region: z.array(z.number()).length(4).optional(),
  scroll_direction: z.enum(['up', 'down', 'left', 'right']).optional(), scroll_amount: z.number().optional(),
  duration: z.number().optional(), repeat: z.number().optional(), tabId: tabIdArg,
};
reg('computer', 'Mouse, keyboard and screenshot actions on a tab (coordinates are viewport pixels).', computerShape, async a => {
  const page = await tab(a.tabId);
  const mods = a.text && ['left_click', 'right_click', 'double_click', 'triple_click'].includes(a.action) ? a.text.split('+').map(k => KEYS[k.toLowerCase()] ?? k) : [];
  const url0 = page.url();
  const done = async msg => { await frame(page); return `${msg}\n${await feedback(page, url0)}`; };
  const click = async (button, clickCount) => {
    const [x, y] = await point(page, a);
    await overlay(page, x, y);
    for (const m of mods) await page.keyboard.down(m);
    await page.mouse.click(x, y, { button, clickCount });
    for (const m of mods.reverse()) await page.keyboard.up(m);
    return done(`Clicked at (${Math.round(x)}, ${Math.round(y)})`);
  };
  switch (a.action) {
    case 'left_click': return click('left', 1);
    case 'right_click': return click('right', 1);
    case 'double_click': return click('left', 2);
    case 'triple_click': return click('left', 3);
    case 'hover': { const [x, y] = await point(page, a); await overlay(page, x, y); await page.mouse.move(x, y); return done(`Hovered at (${Math.round(x)}, ${Math.round(y)})`); }
    case 'type': await page.keyboard.type(a.text ?? ''); return done(`Typed ${(a.text ?? '').length} characters`);
    case 'key': for (let i = 0; i < (a.repeat ?? 1); i++) for (const k of (a.text ?? '').split(/\s+/).filter(Boolean)) await page.keyboard.press(combo(k)); return done(`Pressed ${a.text}`);
    case 'scroll': {
      const [x, y] = a.coordinate ?? [400, 300], n = (a.scroll_amount ?? 3) * 100, d = a.scroll_direction ?? 'down';
      await overlay(page, x, y);
      await page.mouse.move(x, y);
      await page.mouse.wheel(d === 'left' ? -n : d === 'right' ? n : 0, d === 'up' ? -n : d === 'down' ? n : 0);
      await sleep(150);
      return done(`Scrolled ${d} by ${a.scroll_amount ?? 3}`);
    }
    case 'scroll_to': { await (await elementByRef(page, a.ref)).scrollIntoViewIfNeeded(); return done(`Scrolled to ${a.ref}`); }
    case 'left_click_drag': {
      const [sx, sy] = a.start_coordinate ?? [], [ex, ey] = a.coordinate ?? [];
      if (sx === undefined || ex === undefined) throw new Error('start_coordinate and coordinate are required');
      await overlay(page, sx, sy);
      await page.mouse.move(sx, sy); await page.mouse.down(); await overlay(page, ex, ey); await page.mouse.move(ex, ey, { steps: 10 }); await page.mouse.up();
      return done(`Dragged (${sx}, ${sy}) to (${ex}, ${ey})`);
    }
    case 'wait': await sleep(Math.min(a.duration ?? 1, 30) * 1000); return 'Waited';
    case 'zoom': {
      if (!a.region) throw new Error('region [x0, y0, x1, y1] is required');
      const [x0, y0, x1, y1] = a.region;
      const buf = await shot(page, { clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
      return [{ type: 'text', text: `Zoomed region ${a.region.join(',')}` }, img(buf)];
    }
    case 'screenshot': {
      const buf = await shot(page);
      const id = `screenshot_${images.size + 1}`; images.set(id, buf);
      // The image is in CSS pixels (1:1 with click coordinates); report ITS size. innerWidth/innerHeight are whole numbers
      // while the visual viewport can be fractional (Chrome at 125%: 672 reported, 674 captured), so they can disagree.
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      return [{ type: 'text', text: `Successfully captured screenshot (${w}x${h}) - ID: ${id}` }, img(buf)];
    }
  }
});

// ---- page reading ----
// A slow connection leaves a page empty for minutes: say what state it is in, so an agent can tell "loading" from "unreadable".
async function pageState(page) {
  const d = await withTimeout(page.evaluate(() => ({ rs: document.readyState, empty: !document.body?.innerText.trim() })));
  return { readyState: d?.rs ?? 'unknown', empty: d?.empty ?? false, pending: logs.get(page)?.pending.size ?? 0 };
}
const stateText = s => `readyState=${s.readyState}, pending requests=${s.pending}`;
reg('read_page', 'Accessibility-style tree of the page with ref IDs for interactive elements. filter: interactive|all. An empty page answers "page empty: readyState=..., pending requests=..."; on a slow connection call wait_for first.', { filter: z.enum(['interactive', 'all']).optional(), depth: z.number().optional(), ref_id: z.string().optional(), tabId: tabIdArg }, async ({ filter, depth, ref_id, tabId }) => {
  const page = await tab(tabId);
  const tree = await page.evaluate(pageTree, { filter: filter ?? 'all', maxDepth: depth, refId: ref_id });
  if (tree !== '(no matching elements)') return tree;
  const s = await pageState(page);
  return s.empty ? `page empty: ${stateText(s)}` : tree;
});
reg('wait_for', 'Wait until a condition holds instead of polling: text (appears on the page), selector (matches an element) and/or loaded (document complete and no request open for 1 s). Returns as soon as it holds; on timeout (seconds, default 30, at most 300) it fails with readyState, url and pending requests. Use it on slow connections.', {
  text: z.string().optional(), selector: z.string().optional(), loaded: z.boolean().optional(), timeout: z.number().max(300).optional(), tabId: tabIdArg,
}, async ({ text, selector, loaded, timeout, tabId }) => {
  if (text === undefined && !selector && !loaded) throw new Error('Give at least one condition: text, selector or loaded.');
  const page = await tab(tabId), limit = (timeout ?? 30) * 1000, t0 = Date.now();
  let quietSince = 0;
  const holds = async () => {
    const r = await withTimeout(page.evaluate(({ text, selector }) => ({ text: text === undefined || !!document.body?.innerText.includes(text), selector: !selector || !!document.querySelector(selector), rs: document.readyState }), { text, selector }), 2000);
    if (!r?.text || !r.selector) return false;
    if (!loaded) return true;
    if (r.rs !== 'complete' || logs.get(page)?.pending.size) { quietSince = 0; return false; }
    quietSince ||= Date.now();
    return Date.now() - quietSince >= 1000;
  };
  for (;;) {
    if (await holds()) return `Condition met after ${((Date.now() - t0) / 1000).toFixed(1)}s (${stateText(await pageState(page))}, ${page.url()})`;
    if (Date.now() - t0 >= limit) break;
    await sleep(250);
  }
  const want = [text !== undefined && `text "${text}"`, selector && `selector ${selector}`, loaded && 'the page to finish loading'].filter(Boolean).join(' and ');
  throw new Error(`wait_for timed out after ${limit / 1000}s waiting for ${want}. Page state: ${stateText(await pageState(page))}, url=${page.url()}`);
});
reg('find', 'Find elements by text/role/name; returns matching refs.', { query: z.string(), tabId: tabIdArg }, async ({ query, tabId }) => {
  const all = await (await tab(tabId)).evaluate(pageTree, { filter: 'all' });
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = all.split('\n').filter(l => words.every(w => l.toLowerCase().includes(w))).slice(0, 20);
  return hits.length ? hits.join('\n') : `No elements matching "${query}".`;
});
reg('get_page_text', 'Extract the readable text of the page.', { tabId: tabIdArg }, async ({ tabId }) => {
  const page = await tab(tabId);
  const text = await page.evaluate(() => { const el = document.querySelector('article') || document.querySelector('main') || document.body; return `${el.tagName.toLowerCase()}\n${el.innerText}`; });
  const body = text.split('\n').slice(1).join('\n');
  return `Title: ${await page.title()}\nURL: ${page.url()}\nSource element: <${text.split('\n')[0]}>\n---\n${body.trim() ? body : `page empty: ${stateText(await pageState(page))}`}`;
});
reg('form_input', 'Set a form control (input, textarea, select, checkbox, radio) by ref.', { ref: z.string(), value: z.union([z.string(), z.number(), z.boolean()]), tabId: tabIdArg }, async ({ ref, value, tabId }) => {
  const h = await elementByRef(await tab(tabId), ref);
  await h.evaluate((el, v) => {
    const fire = () => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    if (el.tagName === 'SELECT') { const o = [...el.options].find(o => o.value === String(v) || o.text === String(v)); if (!o) throw new Error(`Option "${v}" not found`); el.value = o.value; }
    else if (el.type === 'checkbox' || el.type === 'radio') el.checked = v === true || v === 'true';
    else { el.focus(); el.value = String(v); }
    fire();
  }, value);
  return `Set ${ref} to ${value}`;
});

// ---- devtools-style ----
reg('javascript_tool', 'Run JavaScript in the page and return the result of the last expression.', { action: z.literal('javascript_exec').optional(), text: z.string(), tabId: tabIdArg }, async ({ text, tabId }) => {
  const r = await (await tab(tabId)).evaluate(code => (0, eval)(code), text);
  return r === undefined ? 'undefined' : typeof r === 'string' ? r : JSON.stringify(r, null, 2);
});
reg('read_console_messages', 'Console output of a tab. Supports onlyErrors, clear, pattern (regex) and limit.', { tabId: tabIdArg, onlyErrors: z.boolean().optional(), clear: z.boolean().optional(), pattern: z.string().optional(), limit: z.number().optional() }, async ({ tabId, onlyErrors, clear, pattern, limit }) => {
  const l = logs.get(await tab(tabId));
  const re = pattern ? new RegExp(pattern) : null;
  const rows = l.console.filter(m => (!onlyErrors || m.type === 'error') && (!re || re.test(m.text))).slice(-(limit ?? 100)).map(m => `[${m.type}] ${m.text}`);
  if (clear) l.console.length = 0;
  return rows.join('\n') || 'No console messages.';
});
reg('read_network_requests', 'Network requests of a tab. Supports urlPattern, clear and limit.', { tabId: tabIdArg, urlPattern: z.string().optional(), clear: z.boolean().optional(), limit: z.number().optional() }, async ({ tabId, urlPattern, clear, limit }) => {
  const l = logs.get(await tab(tabId));
  const rows = l.net.filter(r => !urlPattern || r.url.includes(urlPattern)).slice(-(limit ?? 100)).map(r => `${r.method} ${r.status} ${r.url}`);
  if (clear) l.net.length = 0;
  return rows.join('\n') || 'No network requests.';
});
reg('resize_window', 'Resize the viewport of a tab.', { width: z.number(), height: z.number(), tabId: tabIdArg }, async ({ width, height, tabId }) => { await (await tab(tabId)).setViewportSize({ width, height }); return `Resized to ${width}x${height}`; });

// ---- files ----
reg('file_upload', 'Upload local files into a file input identified by ref.', { paths: z.array(z.string()), ref: z.string(), tabId: tabIdArg }, async ({ paths, ref, tabId }) => {
  await (await elementByRef(await tab(tabId), ref)).setInputFiles(paths);
  return `Uploaded ${paths.length} file(s)`;
});
reg('upload_image', 'Upload a previously captured screenshot (imageId) into a file input identified by ref.', { imageId: z.string(), ref: z.string(), filename: z.string().optional(), tabId: tabIdArg }, async ({ imageId, ref, filename, tabId }) => {
  const buf = images.get(imageId);
  if (!buf) throw new Error(`Unknown imageId ${imageId}`);
  mkdirSync(scratch, { recursive: true });
  const file = join(scratch, filename ?? `${imageId}.png`);
  writeFileSync(file, buf);
  try { await (await elementByRef(await tab(tabId), ref)).setInputFiles(file); }
  finally { rmSync(file, { force: true }); }
  return `Uploaded ${imageId}`;
});

// ---- gif ----
reg('gif_creator', 'Record browser actions and export them as an animated GIF saved to the output folder.', { action: z.enum(['start_recording', 'stop_recording', 'export', 'clear']), tabId: tabIdArg, download: z.boolean().optional() }, async ({ action, tabId }) => {
  const page = await tab(tabId), id = ids.get(page);
  const g = gifs.get(id) ?? { recording: false, frames: [] };
  gifs.set(id, g);
  if (action === 'start_recording') { g.recording = true; g.frames = []; await frame(page); return 'Recording started.'; }
  if (action === 'stop_recording') { await frame(page); g.recording = false; return `Recording stopped (${g.frames.length} frames).`; }
  if (action === 'clear') { g.frames = []; return 'Frames cleared.'; }
  if (!g.frames.length) throw new Error('No frames recorded.');
  const first = PNG.sync.read(g.frames[0]);
  const gif = GIFEncoder();
  for (const f of g.frames) {
    const p = PNG.sync.read(f);
    if (p.width !== first.width || p.height !== first.height) continue;
    const palette = quantize(p.data, 256);
    gif.writeFrame(applyPalette(p.data, palette), p.width, p.height, { palette, delay: 700 });
  }
  gif.finish();
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `recording-${Date.now()}.gif`);
  writeFileSync(file, gif.bytes());
  return `GIF saved: ${file} (${g.frames.length} frames)`;
});

// ---- batch ----
reg('browser_batch', 'Run several tool calls in order. actions: [{name, input}].', { actions: z.array(z.object({ name: z.string(), input: z.record(z.any()).optional() })) }, async ({ actions }) => {
  const out = [];
  for (const { name, input } of actions) {
    if (name === 'browser_batch' || !tools[name]) throw new Error(`Unknown or disallowed action: ${name}`);
    const r = await tools[name](input ?? {});
    out.push(...(typeof r === 'string' ? [{ type: 'text', text: `[${name}] ${r}` }] : r));
  }
  return out;
});

await server.connect(new StdioServerTransport());
