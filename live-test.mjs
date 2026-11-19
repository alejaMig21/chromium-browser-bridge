// Live end-to-end check: starts server.mjs over stdio and drives real browsers it launches itself (LIVE_BROWSER=chrome|vivaldi|edge|brave).
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { resolveBrowser } from './launcher.mjs';
import { stopBroker } from './broker-client.mjs';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const PAGE = `<title>Test Page</title><h1>Hello</h1>
<input id=name placeholder="Your name"><select id=sel><option>a</option><option>b</option></select>
<input type=checkbox id=chk><button id=btn onclick="n++;out.textContent='clicked '+n">Click me</button>
<p id=out>idle</p><a id=lnk target=_blank href="/second">second</a><input type=file id=file><div style="height:2500px"></div><a id=bottom href="#">bottom link</a>
<script>let n=0;console.log('hello-from-page');</script>`;
// 02 (agent report): controls inside shadow roots (some behind display:contents) and a modal <dialog> with a control in a shadow root.
const SHADOW = `<title>Shadow</title><div id=host></div><script>host.attachShadow({ mode: 'open' }).innerHTML = '<div style="display:contents"><button onclick="window.__created=true">Create app</button><input aria-label="App name"></div>';</script>`;
const DIALOG = `<title>Dialog</title><main>background</main><button onclick="window.__behind=true">Behind</button><dialog aria-label="Release version"><h2>Release version</h2><button onclick="window.__cancelled=true">Cancel</button><div id=h2></div></dialog>
<script>h2.attachShadow({ mode: 'open' }).innerHTML = '<button onclick="window.__released=true">Release</button>'; document.querySelector('dialog').showModal();</script>`;
// 04 (agent report): a slow connection. /late paints its text after 3 s; /busy keeps a request open for 4 s.
const LATE = `<title>Late</title><body></body><script>setTimeout(() => { document.body.textContent = 'Arrived'; }, 3000);</script>`;
const BUSY = `<title>Busy</title>busy page<script>fetch('/hang');</script>`;
const PAGES = { '/second': '<title>Second</title>second page', '/shadow': SHADOW, '/dialog': DIALOG, '/late': LATE, '/busy': BUSY };
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); if (q.url === '/hang') return void setTimeout(() => r.end('done'), 4000); r.end(PAGES[q.url] ?? PAGE); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/`;
const BRIDGE_PORT = 9341; // not the real bridge port 9340, so a real extension never talks to a test server
const PORT = 9301; // not the default 9333, so a browser the user has open is never touched
// All test residue lives under one root, removed on every exit path (see finally).
const liveRoot = join(tmpdir(), 'live-tests', 'chromium-browser-bridge');
mkdirSync(liveRoot, { recursive: true });
// Stop every process whose command line carries this exact folder (a run's browsers and broker all do), never anything else.
const killRun = folder => { try { execFileSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${folder.replaceAll('\\', '*')}*' -and $_.CommandLine -notlike '*--type=*' -and $_.Name -match '^(node|msedge|chrome|vivaldi|brave)\.exe$' -and $_.ProcessId -ne $PID } | ForEach-Object { taskkill /PID $_.ProcessId /T /F }`], { stdio: 'ignore' }); } catch { /* none left */ } };
// A run that was killed from outside could not clean up: the next run does it, for folders older than 20 minutes.
for (const e of readdirSync(liveRoot)) {
  const old = join(liveRoot, e);
  try { if (Date.now() - statSync(old).mtimeMs > 20 * 60 * 1000) { killRun(old); rmSync(old, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } } catch (err) { console.error('stale run not removed:', old, err.message); }
}
const tmp = mkdtempSync(join(liveRoot, 'run-'));
process.on('exit', () => killRun(tmp)); // however this process ends, the run's browsers and broker go with it
const brokerDir = join(tmp, 'broker'); // the broker the servers start lives (and is stopped) under this run's folder
const sysTemp = join(tmp, 'sys-temp'); // the servers' own temp dir (Playwright's playwright-artifacts-*): killed servers cannot clean it, the run folder removal does
mkdirSync(sysTemp);
const serverEnv = { ...process.env, TEMP: sysTemp, TMP: sysTemp, BROWSER_OUTPUT: tmp, CDP_ENDPOINT: `http://127.0.0.1:${PORT}`, BROWSER_BRIDGE_PORT: String(BRIDGE_PORT), BROKER_DIR: brokerDir, BROKER_IDLE_MS: '600000', BROWSER_EXT_WAIT_MS: '0' };

const client = new Client({ name: 'live-test', version: '1' });
const transport = new StdioClientTransport({ command: process.execPath, args: [join(dirname(fileURLToPath(import.meta.url)), 'server.mjs')], env: { ...serverEnv, CLAUDE_BROWSER_TMP: join(tmp, 'server-tmp'), BROWSER_IDLE_MS: '8000', BRIDGE_TRACE: '1' }, stderr: 'pipe' });
const serverLog = [];
transport.stderr.on('data', d => { serverLog.push(String(d)); process.stderr.write('[server] ' + d); });
await client.connect(transport);
const callOn = c => async (name, args = {}) => { if (process.env.TRACE) console.log(new Date().toISOString().slice(14, 23), '>', name, args.action ?? ''); const r = await c.callTool({ name, arguments: args }); const png = r.content.find(c => c.type === 'image'); return { err: !!r.isError, text: r.content.filter(c => c.type === 'text').map(c => c.text).join('\n'), images: r.content.filter(c => c.type === 'image').length, png: png && Buffer.from(png.data, 'base64') }; };
const call = callOn(client);
const extraClients = []; // the other sessions' MCP servers this run starts
let passed = 0;
const ok = (name, cond, extra = '') => { assert.ok(cond, `${name} ${extra}`); passed++; console.log('PASS', name); };

try {
  const names = (await client.listTools()).tools.map(t => t.name);
  for (const n of ['computer', 'navigate', 'read_page', 'find', 'form_input', 'get_page_text', 'javascript_tool', 'tabs_context_mcp', 'tabs_create_mcp', 'tabs_close_mcp', 'read_console_messages', 'read_network_requests', 'resize_window', 'gif_creator', 'upload_image', 'file_upload', 'browser_batch', 'wait_for']) ok(`tool ${n} listed`, names.includes(n));

  for (const n of ['browser_launch', 'browser_status', 'browser_reconnect', 'browser_close']) ok(`tool ${n} listed`, names.includes(n));
  const before = await call('tabs_context_mcp');
  ok('tools fail clearly before a browser exists', before.err && /browser_launch/.test(before.text), before.text);
  const launch = await call('browser_launch', { browser: process.env.LIVE_BROWSER ?? 'chrome', headless: true, port: PORT });
  ok('browser_launch', /Launched|Attached/.test(launch.text), launch.text);
  ok('browser_status', JSON.parse((await call('browser_status')).text).connected === true);

  const ctxr = await call('tabs_context_mcp', { createIfEmpty: true });
  const tabId = Number(/Tab ID: (\d+)/.exec(ctxr.text)?.[1]);
  ok('tabs_context_mcp', tabId > 0, ctxr.text);
  const T = { tabId };

  const nav = await call('navigate', { url: base, ...T });
  ok('navigate', nav.text.includes('Test Page'), nav.text);
  await call('gif_creator', { action: 'start_recording', ...T });

  const tree = (await call('read_page', { filter: 'interactive', ...T })).text;
  const refOf = re => new RegExp(`${re}[^\\n]*\\[(ref_\\d+)\\]`).exec(tree)?.[1];
  const [nameRef, btnRef, chkRef, selRef, fileRef] = [refOf('textbox "Your name"'), refOf('button "Click me"'), refOf('checkbox'), refOf('combobox'), refOf('textbox ""')];
  ok('read_page refs', nameRef && btnRef && chkRef && selRef, tree);

  ok('find', (await call('find', { query: 'click me', ...T })).text.includes(btnRef));
  await call('form_input', { ref: nameRef, value: 'Ada', ...T });
  await call('form_input', { ref: selRef, value: 'b', ...T });
  await call('form_input', { ref: chkRef, value: true, ...T });
  const js = async code => (await call('javascript_tool', { action: 'javascript_exec', text: code, ...T })).text;
  ok('form_input', (await js("document.getElementById('name').value + sel.value + chk.checked")) === 'Adabtrue');

  await call('computer', { action: 'left_click', ref: btnRef, ...T });
  ok('click by ref', (await js('out.textContent')) === 'clicked 1');
  const box = JSON.parse(await js('(()=>{const r=btn.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()'));
  await call('computer', { action: 'left_click', coordinate: box, ...T });
  ok('click by coordinate', (await js('out.textContent')) === 'clicked 2');
  await call('computer', { action: 'double_click', coordinate: box, ...T });
  ok('double_click', (await js('out.textContent')) === 'clicked 4');
  await call('computer', { action: 'triple_click', coordinate: box, ...T });
  ok('triple_click', (await js('out.textContent')) === 'clicked 7');

  await call('computer', { action: 'left_click', ref: nameRef, ...T });
  await call('computer', { action: 'key', text: 'ctrl+a', ...T });
  await call('computer', { action: 'type', text: 'Grace', ...T });
  ok('key + type', (await js("document.getElementById('name').value")) === 'Grace');
  await call('computer', { action: 'hover', coordinate: box, ...T });
  ok('hover', true);
  await call('computer', { action: 'scroll', coordinate: [200, 200], scroll_direction: 'down', scroll_amount: 5, ...T });
  ok('scroll', Number(await js('scrollY')) > 100);
  await call('computer', { action: 'scroll', coordinate: [200, 200], scroll_direction: 'up', scroll_amount: 20, ...T });
  await call('computer', { action: 'scroll_to', ref: refOf('link "bottom link"'), ...T });
  ok('scroll_to', Number(await js('scrollY')) > 1000);
  await call('computer', { action: 'left_click_drag', start_coordinate: [10, 10], coordinate: [100, 100], ...T });
  ok('left_click_drag', true);
  ok('wait', (await call('computer', { action: 'wait', duration: 0.1, ...T })).text === 'Waited');

  const shot = await call('computer', { action: 'screenshot', ...T });
  ok('screenshot', shot.images === 1 && /ID: screenshot_\d+/.test(shot.text), shot.text);
  ok('zoom', (await call('computer', { action: 'zoom', region: [0, 0, 200, 100], ...T })).images === 1);

  ok('get_page_text', (await call('get_page_text', T)).text.includes('Hello'));
  ok('console', (await call('read_console_messages', { pattern: 'hello-from', ...T })).text.includes('hello-from-page'));
  ok('network', (await call('read_network_requests', T)).text.includes(base));
  ok('resize', (await call('resize_window', { width: 700, height: 500, ...T })).text.includes('700x500'));

  writeFileSync(join(tmp, 'a.txt'), 'x');
  await call('computer', { action: 'scroll', coordinate: [200, 200], scroll_direction: 'up', scroll_amount: 30, ...T });
  const fref = (await call('read_page', { filter: 'interactive', ...T })).text.split('\n').find(l => /type=file/.test(l))?.match(/\[(ref_\d+)\]/)?.[1];
  await call('file_upload', { paths: [join(tmp, 'a.txt')], ref: fref, ...T });
  ok('file_upload', (await js('file.files.length + file.files[0].name')) === '1a.txt');
  const up = await call('upload_image', { imageId: /ID: (screenshot_\d+)/.exec(shot.text)[1], ref: fref, ...T });
  ok('upload_image', !up.err && (await js('file.files[0].name')).startsWith('screenshot_'), up.text);

  const batch = await call('browser_batch', { actions: [{ name: 'javascript_tool', input: { text: '1+1', ...T } }, { name: 'computer', input: { action: 'screenshot', ...T } }] });
  ok('browser_batch', batch.text.includes('2') && batch.images === 1);

  await call('gif_creator', { action: 'stop_recording', ...T });
  const gif = await call('gif_creator', { action: 'export', download: true, ...T });
  const gifPath = /GIF saved: (.+?) \(/.exec(gif.text)?.[1];
  ok('gif_creator', gifPath && readFileSync(gifPath).subarray(0, 3).toString() === 'GIF', gif.text);

  // ---- popups are neutralised ----
  await call('navigate', { url: base, ...T });
  ok('window.open is a no-op', (await js('String(window.open("about:blank") === null)')) === 'true');
  const lref = /link "second" \[(ref_\d+)\]/.exec((await call('read_page', { filter: 'interactive', ...T })).text)?.[1];
  await call('computer', { action: 'left_click', ref: lref, ...T });
  await new Promise(r => setTimeout(r, 800));
  ok('target=_blank link opens in the same tab', (await js('document.title')) === 'Second');
  ok('no extra tab appeared', (await call('tabs_context_mcp')).text.split('\n').filter(l => l.startsWith('Tab ID')).length === 1);

  // ---- reading while the page navigates ----
  await call('navigate', { url: base, ...T });
  await js('setTimeout(() => { location.href = "/second"; }, 0); 1');
  const racing = await call('get_page_text', T);
  ok('read during navigation retries instead of failing', !racing.err && /second page|Hello/.test(racing.text), racing.text);

  // ---- 02 shadow roots and dialogs ----
  await call('navigate', { url: `${base}shadow`, ...T });
  const shTree = (await call('read_page', { filter: 'interactive', ...T })).text;
  const createRef = /button "Create app" \[(ref_\d+)\]/.exec(shTree)?.[1], appNameRef = /textbox "App name" \[(ref_\d+)\]/.exec(shTree)?.[1];
  ok('02 read_page lists a button and a textbox inside a shadow root (behind display:contents)', createRef && appNameRef, shTree);
  ok('02 find returns the shadow-root button', (await call('find', { query: 'create app', ...T })).text.includes(createRef ?? 'none'));
  await call('computer', { action: 'left_click', ref: createRef, ...T });
  ok('02 a click by ref reaches a button inside a shadow root', (await js('window.__created === true')) === 'true');
  await call('form_input', { ref: appNameRef, value: 'claude-admin', ...T });
  ok('02 form_input sets a control inside a shadow root', (await js("document.getElementById('host').shadowRoot.querySelector('input').value")) === 'claude-admin');
  await call('navigate', { url: `${base}dialog`, ...T });
  const dlgTree = (await call('read_page', { filter: 'interactive', ...T })).text;
  ok('02 an open modal dialog is shown as a dialog node with its name', /dialog "Release version" \[ref_\d+\]/.test(dlgTree), dlgTree);
  ok('02 the tree says a modal dialog blocks the page', /modal dialog open: "Release version"/i.test(dlgTree), dlgTree);
  const releaseRef = /button "Release" \[(ref_\d+)\]/.exec(dlgTree)?.[1];
  ok('02 the dialog buttons get refs, including one in a shadow root', releaseRef && /button "Cancel"/.test(dlgTree), dlgTree);
  await call('computer', { action: 'left_click', ref: releaseRef, ...T });
  ok('02 a click by ref reaches the Release button of the dialog', (await js('window.__released === true')) === 'true');

  // ---- 03 one line of feedback after key, click, type and scroll ----
  await call('navigate', { url: `${base}dialog`, ...T });
  const tabKey = await call('computer', { action: 'key', text: 'Tab', ...T });
  ok('03 key says what has focus (inside a shadow root), the open dialog and that the url did not change', /Pressed Tab\nfocus: button "Release" \| dialog: "Release version" \| url: unchanged$/.test(tabKey.text), tabKey.text);
  await call('navigate', { url: base, ...T });
  const fbRefs = (await call('read_page', { filter: 'interactive', ...T })).text;
  const clickBtn = await call('computer', { action: 'left_click', ref: /button "Click me" \[(ref_\d+)\]/.exec(fbRefs)?.[1], ...T });
  ok('03 click says what has focus; no dialog', /Clicked at \(\d+, \d+\)\nfocus: button "Click me" \| dialog: none \| url: unchanged$/.test(clickBtn.text), clickBtn.text);
  await call('computer', { action: 'left_click', ref: /textbox "Your name" \[(ref_\d+)\]/.exec(fbRefs)?.[1], ...T });
  const typed = await call('computer', { action: 'type', text: 'Ada', ...T });
  ok('03 type says which field has focus', /Typed 3 characters\nfocus: textbox "Your name"/.test(typed.text), typed.text);
  const scrolled = await call('computer', { action: 'scroll', coordinate: [300, 300], scroll_direction: 'down', ...T });
  ok('03 scroll gets the line too', /Scrolled down by 3\nfocus: .+ \| dialog: none \| url: unchanged$/.test(scrolled.text), scrolled.text);
  const goLink = await call('computer', { action: 'left_click', ref: /link "second" \[(ref_\d+)\]/.exec(fbRefs)?.[1], ...T });
  ok('03 a click that navigates reports the new url', /url: http:\/\/127\.0\.0\.1:\d+\/second$/.test(goLink.text), goLink.text);

  // ---- 04 slow pages: say what state the page is in, and wait for a condition instead of polling blind ----
  const navLate = await call('navigate', { url: `${base}late`, waitUntil: 'commit', timeout: 20, ...T });
  ok('04 navigate accepts waitUntil and timeout', !navLate.err && /Navigated to .*\/late/.test(navLate.text), navLate.text);
  const emptyText = await call('get_page_text', T);
  ok('04 an empty page says its state instead of returning nothing', /page empty: readyState=\w+, pending requests=\d+/.test(emptyText.text), emptyText.text);
  const emptyTree = await call('read_page', { filter: 'interactive', ...T });
  ok('04 read_page of an empty page says so too', /page empty: readyState=\w+, pending requests=\d+/.test(emptyTree.text), emptyTree.text);
  const t0 = Date.now();
  const arrived = await call('wait_for', { text: 'Arrived', timeout: 20, ...T });
  const waited = Date.now() - t0;
  ok('04 wait_for returns as soon as the text shows up', !arrived.err && /met after/i.test(arrived.text) && waited > 1000 && waited < 8000, `${waited} ms: ${arrived.text}`);
  const gaveUp = await call('wait_for', { text: 'never-shown', timeout: 2, ...T });
  ok('04 wait_for times out with the page state', gaveUp.err && /timed out after 2s/.test(gaveUp.text) && /readyState=\w+/.test(gaveUp.text) && /pending requests=\d+/.test(gaveUp.text) && gaveUp.text.includes(base), gaveUp.text);
  const bySel = await call('wait_for', { selector: 'body', timeout: 5, ...T });
  ok('04 wait_for accepts a selector', !bySel.err, bySel.text);
  await call('navigate', { url: `${base}busy`, ...T });
  const t1 = Date.now();
  const quiet = await call('wait_for', { loaded: true, timeout: 20, ...T });
  const quietAfter = Date.now() - t1;
  ok('04 wait_for loaded waits for the open request to finish', !quiet.err && quietAfter > 2000, `${quietAfter} ms: ${quiet.text}`);
  const noCond = await call('wait_for', { ...T });
  ok('04 wait_for without a condition is refused', noCond.err && /text|selector|loaded/.test(noCond.text), noCond.text);

  // ---- policy ----
  for (const u of ['https://paypal.com', 'https://www.paypal.com/x', 'file:///C:/Windows/win.ini', 'chrome://settings', 'javascript:alert(1)']) {
    const r = await call('navigate', { url: u, ...T });
    ok(`policy blocks ${u}`, r.err, r.text);
  }
  await js("location.href = 'https://paypal.com'").catch(() => {});
  await new Promise(r => setTimeout(r, 800));
  const after = await call('get_page_text', T);
  ok('policy blocks script-initiated navigation', !/paypal/i.test((await call('tabs_context_mcp')).text) || after.err, after.text);

  const t2 = await call('tabs_create_mcp', { url: base });
  const id2 = Number(/Created tab (\d+)/.exec(t2.text)?.[1]);
  // Headless Vivaldi cannot attach to tabs created over CDP; report that explicitly instead of hiding it.
  if (!(id2 > 0) && process.env.ALLOW_NO_TAB_CREATE && /did not create the tab/.test(t2.text)) {
    console.log('SKIP tabs_create_mcp / tabs_close_mcp: browser cannot create tabs over CDP in this mode');
    ok('server still responsive after failed tab creation', (await call('tabs_context_mcp')).text.includes('Tab ID'));
  }
  else {
    ok('tabs_create_mcp', id2 > 0, t2.text);
    ok('tabs_close_mcp', (await call('tabs_close_mcp', { tabId: id2 })).text.includes('Closed'));
  }
  // ---- lifecycle: reconnect, crash recovery, close ----
  const rc = await call('browser_reconnect');
  ok('browser_reconnect leaves a healthy connection alone', /Already connected/.test(rc.text), rc.text);
  const st = JSON.parse(readFileSync(join(tmp, 'server-tmp', `claude-browser-cdp-state-${PORT}.json`), 'utf8'));
  // taskkill /T exits non-zero when a child dies while it works; whether the browser is gone is asserted below.
  try { execFileSync('taskkill', ['/PID', String(st.pid), '/T', '/F'], { stdio: 'pipe' }); } catch { /* checked next */ }
  for (let i = 0; i < 40; i++) { if (!(await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(500) }).then(r => r.ok, () => false))) break; await new Promise(r => setTimeout(r, 250)); }
  const dead = await call('tabs_context_mcp');
  ok('tools report a dead browser', dead.err && /browser_launch|browser_reconnect/.test(dead.text), dead.text);
  const re = await call('browser_reconnect');
  ok('browser_reconnect restarts a crashed browser', /restarted/.test(re.text), re.text);
  ok('tools work after restart', !(await call('tabs_context_mcp', { createIfEmpty: true })).err);
  const closed = await call('browser_close');
  ok('browser_close', /Closed/.test(closed.text), closed.text);
  ok('browser is really gone', JSON.parse((await call('browser_status')).text).reachable === false);
  // ---- attach to the browser the user already has open, through the Local Browser Bridge extension ----
  // The stand-in user browser is always Edge: branded Chrome ignores --load-extension, and headless Vivaldi never
  // answers chrome.debugger commands (a headed Vivaldi has to be checked by hand).
  {
  // Stand-in "user browser": no debug port at all, only the extension (a copy pointed at this run's bridge port).
  const noExt = await call('browser_attach');
  ok('attach explains how to install the extension', noExt.err && /Load unpacked/.test(noExt.text), noExt.text);
  const ff = await call('browser_attach', { browser: 'firefox' });
  ok('02 attach says a non-Chromium browser is not supported', ff.err && /not supported/i.test(ff.text) && !/Load unpacked/.test(ff.text), ff.text);
  const named = await call('browser_attach', { browser: 'brave' });
  ok('02 attach names the extensions page of the browser asked for', named.err && /brave:\/\/extensions/.test(named.text), named.text);
  const extDir = join(tmp, 'extension');
  cpSync(join(dirname(fileURLToPath(import.meta.url)), 'extension'), extDir, { recursive: true });
  writeFileSync(join(extDir, 'bg.js'), readFileSync(join(extDir, 'bg.js'), 'utf8').replace('const PORT = 9340;', `const PORT = ${BRIDGE_PORT};`));
  const live = resolveBrowser('edge');
  spawn(live.exe, [`--user-data-dir=${join(tmp, 'user-browser')}`, `--load-extension=${extDir}`, '--disable-features=DisableLoadExtensionCommandLineSwitch', '--headless=new', '--remote-debugging-port=9302', '--force-device-scale-factor=1.25', '--no-first-run', base], { stdio: 'ignore', detached: true, env: { ...process.env, TEMP: tmp, TMP: tmp } }).unref(); // its temp files land in our run folder
  const userPat = '*' + join(tmp, 'user-browser').replaceAll('\\', '*') + '*'; // only processes of THIS run's stand-in browser
  // Ask the page directly through the stand-in's debug port: any tool call would draw the overlay, and this is the control for the pixel checks.
  const rawCmd = async (method, params) => { const t = (await (await fetch('http://127.0.0.1:9302/json')).json()).find(x => x.type === 'page' && x.url === base); const w = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => w.addEventListener('open', r)); const res = new Promise(r => w.addEventListener('message', m => r(JSON.parse(m.data)))); w.send(JSON.stringify({ id: 1, method, params })); const out = (await res).result; w.close(); return out; };
  const raw = async expression => (await rawCmd('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  let att;
  for (let i = 0; i < 40; i++) { att = await call('browser_attach'); if (!att.err) break; await new Promise(r => setTimeout(r, 1000)); }
  ok('browser_attach through the extension', !att.err && /Attached to the user's own browser/.test(att.text), att.text);
  const seen = await call('tabs_context_mcp');
  ok('attached: sees the tab the user is on', seen.text.includes(base), seen.text);
  ok('attached: reads it', (await call('get_page_text')).text.includes('Hello'));
  ok('attached: status says so', JSON.parse((await call('browser_status')).text).mode?.includes('own browser'));
  ok('06 attached: status says the debugger is attached to the tabs in play', JSON.parse((await call('browser_status')).text).debuggerAttached === true);
  const blockedNav = await call('navigate', { url: 'https://paypal.com' });
  ok('attached: policy still blocks', blockedNav.err && /Blocked by policy/.test(blockedNav.text), blockedNav.text);
  const shotA = await call('computer', { action: 'screenshot' });
  ok('attached: screenshot', shotA.images === 1, shotA.text);
  // 01: at devicePixelRatio 1.25 the image must still be in CSS pixels, the unit of the reported size and of click coordinates.
  const [vw, vh] = /\((\d+)x(\d+)\)/.exec(shotA.text).slice(1).map(Number);
  ok('01 screenshot image size equals the CSS viewport size', shotA.png.readUInt32BE(16) === vw && shotA.png.readUInt32BE(20) === vh, `${shotA.png.readUInt32BE(16)}x${shotA.png.readUInt32BE(20)} vs ${vw}x${vh}`);
  // The capture is of the whole viewport (no clip: a clip resizes the page while the browser captures); the server turns it into
  // CSS pixels (click coordinates) itself, and a zoom is a crop of it. At devicePixelRatio 1.25 both are checked against the page.
  const [cw, ch] = JSON.parse(await raw('JSON.stringify([innerWidth, innerHeight])'));
  const iw = shotA.png.readUInt32BE(16), ih = shotA.png.readUInt32BE(20);
  ok('01 the screenshot is in CSS pixels at devicePixelRatio 1.25 (within 2 px of the page viewport)', Math.abs(iw - cw) <= 2 && Math.abs(ih - ch) <= 2, `image ${iw}x${ih} vs viewport ${cw}x${ch}`);
  const zoomed = await call('computer', { action: 'zoom', region: [10, 10, 310, 210] });
  ok('01 zoom is a crop of the region in device pixels (300x200 CSS px = 375x250 at 1.25)', zoomed.images === 1 && zoomed.png.readUInt32BE(16) === 375 && zoomed.png.readUInt32BE(20) === 250, `${zoomed.png?.readUInt32BE(16)}x${zoomed.png?.readUInt32BE(20)}`);
  // 05 (agent report): the id the agent holds must stay valid across a cross-origin navigation of the work tab.
  const idOf = text => Number(/Tab ID: (\d+)[^\n]*work tab/.exec(text)?.[1]);
  const idBefore = idOf((await call('tabs_context_mcp')).text);
  const crossUrl = base.replace('127.0.0.1', 'localhost') + 'second'; // same server, another origin
  const crossNav = await call('navigate', { url: crossUrl });
  ok('05 navigate across origins works', !crossNav.err, crossNav.text);
  const afterNav = (await call('tabs_context_mcp')).text;
  ok('05 the work tab keeps its id across a cross-origin navigation', idOf(afterNav) === idBefore && idBefore > 0, `${idBefore} -> ${afterNav}`);
  const withOldId = await call('get_page_text', { tabId: idBefore });
  ok('05 the old id still works', !withOldId.err && /second page/.test(withOldId.text), withOldId.text);
  await call('navigate', { url: base });
  // The agent calls browser_attach again (it did, three times): that must not renumber the tabs.
  const attachAgain = await call('browser_attach');
  ok('05 attaching again while attached keeps the work tab and says which one it is', !attachAgain.err && new RegExp(`Work tab: Tab ID ${idBefore}\\b`).test(attachAgain.text), attachAgain.text);
  ok('05 ...and the id is unchanged', idOf((await call('tabs_context_mcp')).text) === idBefore);
  await call('browser_close');
  let reattached; for (let i = 0; i < 30; i++) { reattached = await call('browser_attach'); if (!reattached.err) break; await new Promise(r => setTimeout(r, 1000)); }
  ok('05 after a full detach and attach the same tab has the same id', idOf((await call('tabs_context_mcp')).text) === idBefore, reattached.text);
  // A tab the work tab opens (target=_blank) belongs to this session at once, with an id; the work tab does not move.
  const popLink = /link "second" \[(ref_\d+)\]/.exec((await call('read_page', { filter: 'interactive' })).text)?.[1];
  await call('computer', { action: 'left_click', ref: popLink });
  let popList; for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 500)); popList = await call('tabs_context_mcp'); if ((popList.text.match(/Tab ID:/g) ?? []).length >= 2) break; }
  ok('05 a tab opened by the work tab is claimed by this session and listed with an id', (popList.text.match(/Tab ID:/g) ?? []).length === 2 && !/Unclaimed/.test(popList.text), popList.text);
  ok('05 the work tab did not move to it', idOf(popList.text) === idBefore, popList.text);
  const popId = Number(/Tab ID: (\d+) [^\n]*\/second/.exec(popList.text)?.[1]);
  ok('05 the opened tab is usable with its id', popId > 0 && (await call('get_page_text', { tabId: popId })).text.includes('second page'), popList.text);
  if (popId > 0) await call('tabs_close_mcp', { tabId: popId });
  await call('navigate', { url: base, tabId: idBefore });
  // 06: the user's real tabs keep their own window.open (OAuth popups).
  ok('06 attached: window.open is native', (await call('javascript_tool', { text: 'window.open.toString()' })).text.includes('[native code]'));
  // 06 (agent report): a capture must leave the page at its own size and clickable. Chromium resizes the page during a capture
  // with a clip or past the viewport (zoom on a region bigger than the viewport does both) and restores it afterwards.
  const size = () => raw('JSON.stringify([innerWidth, innerHeight, visualViewport.width, visualViewport.scale])');
  let sizeBefore = await size(); // the window can still be settling after a tab was closed: measure once two reads agree
  for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 300)); const now = await size(); if (now === sizeBefore) break; sizeBefore = now; }
  await raw("document.body.insertAdjacentHTML('beforeend', '<button id=agent-report-06 style=\"position:fixed;left:10px;top:200px;width:120px;height:40px\" onclick=\"window.__clicked06=true\">go</button>'); true");
  await call('computer', { action: 'zoom', region: [0, 0, vw * 2, vh * 2] }); // past the viewport: captureBeyondViewport
  await Promise.all([call('computer', { action: 'screenshot' }), call('computer', { action: 'zoom', region: [0, 0, 300, 200] }), call('computer', { action: 'screenshot' })]); // overlapping captures
  ok('06 the page keeps its size after captures (clip, beyond the viewport, overlapping)', await size() === sizeBefore, `${sizeBefore} -> ${await size()}`);
  await call('computer', { action: 'left_click', coordinate: [60, 220] });
  ok('06 a real click still lands after captures', await raw('window.__clicked06 === true') === true);
  await raw("document.getElementById('agent-report-06').remove(); true");
  // 02: the user switches to another tab (opened by the user, not by the agent); the agent keeps working on its own tab.
  const workBefore = (await call('get_page_text')).text;
  await fetch(`http://127.0.0.1:9302/json/new?${base}second`, { method: 'PUT' }); // the debug port is only the test's hand for switching tabs; the bridge never uses it
  let two;
  for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 500)); two = await call('tabs_context_mcp'); if (two.text.split('\n').length > 1) break; }
  ok('02 the tab the user switched to is listed', two.text.includes('/second'), two.text);
  ok('03 a tab nobody can take is listed as unclaimed', /Unclaimed tab[^\n]*\/second/.test(two.text), two.text);
  ok('05 an unclaimed tab row always shows an id', /Unclaimed tab \(browser tab \d+\)/.test(two.text), two.text);
  ok('03 browser_status shows the broker and its sessions', JSON.parse((await call('browser_status')).text).broker?.sessions >= 1);
  const bgShot = await call('computer', { action: 'screenshot' }); // the work tab is now in the background
  ok('03 a background tab can be captured', bgShot.images === 1, bgShot.text);
  const workAfter = (await call('get_page_text')).text;
  ok('02 default tab stays the work tab after the user switches', workAfter.includes('Hello') && workBefore.includes('Hello'), workAfter);
  ok('02 tabs_context_mcp marks the work tab', /work tab/i.test(two.text), two.text);
  const closeUserTab = async url => { const t = (await (await fetch('http://127.0.0.1:9302/json')).json()).find(x => x.url === url); if (t) await fetch(`http://127.0.0.1:9302/json/close/${t.id}`); };
  await closeUserTab(`${base}second`); // the user closes the tab they had switched to
  // 04: overlay appears on the work tab after an action and is not part of screenshots.
  await call('computer', { action: 'hover', coordinate: [60, 60] });
  const ov = JSON.parse((await call('javascript_tool', { text: `(() => { const h = document.querySelector('[data-claude-overlay]'); return JSON.stringify(h && { state: h.dataset.state, x: +h.dataset.x, y: +h.dataset.y, shown: getComputedStyle(h).display !== 'none' }); })()` })).text);
  ok('04 overlay is present, active, and the cursor is at the action point', ov && ov.state === 'active' && ov.shown && ov.x === 60 && ov.y === 60, JSON.stringify(ov));
  const shotO = await call('computer', { action: 'screenshot' });
  const { PNG } = (await import('pngjs')).default;
  const img = PNG.sync.read(shotO.png);
  const px = (x, y) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];
  const glow = [217, 119, 87];
  const near = c => c.every((v, i) => Math.abs(v - glow[i]) < 40);
  const wall = [[0, 0], [img.width - 1, 0], [0, img.height - 1], [1, Math.round(img.height / 2)]];
  ok('04 overlay is not in the screenshot', !wall.some(([x, y]) => near(px(x, y))), JSON.stringify(px(1, Math.round(img.height / 2))));
  // Positive control: a raw capture with the overlay shown must contain the glow, so the pixel check above can fail.
  const rawShot = PNG.sync.read(Buffer.from((await rawCmd('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const rpx = (x, y) => [...rawShot.data.subarray((y * rawShot.width + x) * 4, (y * rawShot.width + x) * 4 + 3)];
  ok('04 control: the glow is painted when the overlay is shown', near(rpx(1, Math.round(rawShot.height / 2))), JSON.stringify(rpx(1, Math.round(rawShot.height / 2))));
  const stillThere = await call('javascript_tool', { text: `getComputedStyle(document.querySelector('[data-claude-overlay]')).display !== 'none'` });
  ok('04 overlay is shown again after the screenshot', stillThere.text === 'true', stillThere.text);
  // 03: capturing never pulls the user's browser to the foreground.
  ok('03 no Page.bringToFront during the whole attached session', !serverLog.join('').includes('Page.bringToFront'));
  const newTab = await call('tabs_create_mcp', { url: `${base}second` });
  const newId = Number(/Created tab (\d+)/.exec(newTab.text)?.[1]);
  ok('attached: tabs_create_mcp works through the extension (even on Vivaldi)', newId > 0, newTab.text);
  ok('attached: new tab is readable', (await call('get_page_text', { tabId: newId })).text.includes('second page'));
  ok('attached: tabs_close_mcp', (await call('tabs_close_mcp', { tabId: newId })).text.includes('Closed'));
  const det = await call('browser_close');
  ok('browser_close only detaches from the user browser', /Detached/.test(det.text), det.text);
  // Ask the page directly (the stand-in browser's debug port), because any tool call would draw the overlay again.
  ok('04 browser_close removed the overlay from the page', await raw("!document.querySelector('[data-claude-overlay]')") === true);
  const userAlive = () => execFileSync('powershell', ['-NoProfile', '-Command', `@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '${userPat}' -and $_.CommandLine -notlike '*--type=*' }).Count`]).toString().trim();
  ok('the user browser is still running', Number(userAlive()) >= 1, userAlive());
  const gone = await call('tabs_context_mcp');
  ok('after detaching, tools do not silently re-attach', gone.err, gone.text);
  const again = await call('browser_attach');
  ok('attaching again needs no prompt and no setup', !again.err, again.text);
  ok('and works', (await call('get_page_text')).text.includes('Hello'));
  // ---- a second Claude session (its own MCP server) on the same browser, through the same broker ----
  {
    const client2 = new Client({ name: 'live-test-2', version: '1' });
    const t2 = new StdioClientTransport({ command: process.execPath, args: [join(dirname(fileURLToPath(import.meta.url)), 'server.mjs')], env: { ...serverEnv, CLAUDE_BROWSER_TMP: join(tmp, 'server-tmp-2'), BROWSER_IDLE_MS: '0' }, stderr: 'pipe' });
    t2.stderr.on('data', () => {});
    extraClients.push(client2); // closed in the final cleanup even if a check throws
    await client2.connect(t2);
    const call2 = callOn(client2);
    const att2 = await call2('browser_attach');
    ok('02 a second session attaches while the first one holds the user tab', !att2.err, att2.text);
    ok('03 attaching without a free tab says how to get one', /tabs_create_mcp/.test(att2.text), att2.text);
    const hasTab = (text, url) => text.split('\n').some(r => r.split(' | ')[2] === url);
    ok('02 the second session does not see the tab of the first session', !hasTab((await call2('tabs_context_mcp')).text, base));
    await fetch(`http://127.0.0.1:9302/json/new?${base}third`, { method: 'PUT' }); // the user opens another tab: the session with no tab gets it
    let ctx2;
    for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 500)); ctx2 = await call2('tabs_context_mcp'); if (ctx2.text.includes('/third')) break; }
    ok('03 a tab the user opens goes to the session that has none', /Tab ID: \d+ \|[^\n]*\/third/.test(ctx2.text), ctx2.text);
    ok('03 and not to the session that already has a tab', !(await call('tabs_context_mcp')).text.includes('/third'));
    const tab2 = await call2('tabs_create_mcp', { url: `${base}second` });
    ok('02 the second session opens its own tab', /Created tab \d+/.test(tab2.text), tab2.text);
    ok('02 the second session reads its own tab', (await call2('get_page_text')).text.includes('second page'));
    ok('02 the first session still reads its own tab', (await call('get_page_text')).text.includes('Hello'));
    ok('02 the first session does not see the tab of the second session', !(await call('tabs_context_mcp')).text.includes('/second'));
    ok('02 the first session can still capture', (await call('computer', { action: 'screenshot' })).images === 1);
    ok('02 one session closing leaves the other attached', /Detached/.test((await call2('browser_close')).text) && (await call('get_page_text')).text.includes('Hello'));
    // After browser_close the second session's tab is released: when the user switches to it, nobody owns it.
    const activateUserTab = async url => { const t = (await (await fetch('http://127.0.0.1:9302/json')).json()).find(x => x.url === url); if (t) await fetch(`http://127.0.0.1:9302/json/activate/${t.id}`); };
    await activateUserTab(`${base}second`);
    let afterClose;
    for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 500)); afterClose = await call('tabs_context_mcp'); if (/Unclaimed tab[^\n]*\/second/.test(afterClose.text)) break; }
    ok('04 a session that closed its browser access released its tabs', /Unclaimed tab[^\n]*\/second/.test(afterClose.text), afterClose.text);
    await closeUserTab(`${base}third`);
    await closeUserTab(`${base}second`);
    await client2.close().catch(() => {});
    // A session that dies without browser_close (crash, closed terminal) releases its tabs too.
    const client3 = new Client({ name: 'live-test-3', version: '1' });
    const t3 = new StdioClientTransport({ command: process.execPath, args: [join(dirname(fileURLToPath(import.meta.url)), 'server.mjs')], env: { ...serverEnv, CLAUDE_BROWSER_TMP: join(tmp, 'server-tmp-3'), BROWSER_IDLE_MS: '0' }, stderr: 'pipe' });
    t3.stderr.on('data', () => {});
    extraClients.push(client3);
    await client3.connect(t3);
    const call3 = callOn(client3);
    await call3('browser_attach');
    ok('04 a session opens a tab to be killed with', /Created tab \d+/.test((await call3('tabs_create_mcp', { url: `${base}fourth` })).text));
    await client3.close().catch(() => {}); // no browser_close: the process just goes away
    await activateUserTab(`${base}fourth`);
    let afterCrash;
    for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 500)); afterCrash = await call('tabs_context_mcp'); if (/Unclaimed tab[^\n]*\/fourth/.test(afterCrash.text)) break; }
    ok('04 a session that died released its tabs', /Unclaimed tab[^\n]*\/fourth/.test(afterCrash.text), afterCrash.text);
    await closeUserTab(`${base}fourth`);
    // The broker dies: the next browser_attach starts a new one and the extension reconnects by itself.
    ok('04 the test stops the broker it started', await stopBroker(brokerDir));
    let brokerDead;
    for (let i = 0; i < 20; i++) { brokerDead = await call('tabs_context_mcp'); if (brokerDead.err) break; await new Promise(r => setTimeout(r, 500)); } // the socket close takes a moment to be noticed
    ok('04 with the broker gone, tools say to attach again', brokerDead.err && /browser_attach/.test(brokerDead.text), brokerDead.text);
    let again2;
    for (let i = 0; i < 30; i++) { again2 = await call('browser_attach'); if (!again2.err) break; await new Promise(r => setTimeout(r, 1000)); }
    ok('04 attach starts a new broker and recovers', !again2.err && (await call('get_page_text')).text.includes('Hello'), again2.text);
  }
  await call('browser_close');
  // ---- ticket 10: two stand-in Edge profiles, both running the current extension (instance id and tab title for real) ----
  {
    const here = dirname(fileURLToPath(import.meta.url));
    const startSession = async n => { const c = new Client({ name: `live-test-mb-${n}`, version: '1' }); const t = new StdioClientTransport({ command: process.execPath, args: [join(here, 'server.mjs')], env: { ...serverEnv, CLAUDE_BROWSER_TMP: join(tmp, `server-tmp-mb-${n}`), BROWSER_IDLE_MS: '0' }, stderr: 'pipe' }); t.stderr.on('data', () => {}); extraClients.push(c); await c.connect(t); return callOn(c); };
    const poll = async (fn, okFn, tries = 40) => { let r; for (let i = 0; i < tries; i++) { r = await fn(); if (okFn(r)) break; await new Promise(x => setTimeout(x, 500)); } return r; };
    const nameOf = (text, title) => new RegExp(`^- ([\\w.-]+?)(?: \\(id [\\w-]+\\))?:[^\\n]*active tab: "${title}"`, 'm').exec(text)?.[1];
    // Stand-in A is the one above (user-browser, port 9302, showing "Test Page"). Stand-in B: another profile, showing "Second".
    spawn(live.exe, [`--user-data-dir=${join(tmp, 'second-profile')}`, `--load-extension=${extDir}`, '--disable-features=DisableLoadExtensionCommandLineSwitch', '--headless=new', '--remote-debugging-port=9303', '--no-first-run', `${base}second`], { stdio: 'ignore', detached: true, env: { ...process.env, TEMP: tmp, TMP: tmp } }).unref();
    const listed = await poll(() => call('list_connected_browsers'), r => /Connected browsers \(2\)/.test(r.text) && /active tab: "Second"/.test(r.text) && /active tab: "Test Page"/.test(r.text));
    ok('10 two stand-in profiles are listed as two connected browsers', !listed.err && /Connected browsers \(2\)/.test(listed.text), listed.text);
    const nameA = nameOf(listed.text, 'Test Page'), nameB = nameOf(listed.text, 'Second');
    ok('10 both names are suffixed and distinct, each with its own tab title', /^msedge-\w{4}$/.test(nameA ?? '') && /^msedge-\w{4}$/.test(nameB ?? '') && nameA !== nameB, listed.text);
    ok('10 the list says the instance ids that tell the two apart', (listed.text.match(/\(id [\w-]+\)/g) ?? []).length === 2, listed.text);

    const s2 = await startSession(2);
    const noChoice = await s2('browser_attach');
    ok('10 browser_attach with no argument and two browsers fails and lists them', noChoice.err && noChoice.text.includes(nameA) && noChoice.text.includes(nameB), noChoice.text);
    const onB = await s2('browser_attach', { browser: nameB });
    ok('10 browser_attach with browser attaches to the one asked for', !onB.err && new RegExp(`Browser: ${nameB} \\(requested\\)`).test(onB.text), onB.text);
    const onA = await call('browser_attach', { browser: nameA });
    ok('10 a second session attaches to the other browser at the same time', !onA.err && new RegExp(`Browser: ${nameA} \\(requested\\)`).test(onA.text), onA.text);
    const tabB = await s2('tabs_create_mcp', { url: `${base}second` });
    ok('10 the session on B opens its own tab in B', /Created tab \d+/.test(tabB.text), tabB.text);
    const [readA, readB] = await Promise.all([call('get_page_text'), s2('get_page_text')]);
    ok('10 both sessions read their own browser at the same time', readA.text.includes('Hello') && readB.text.includes('second page'), `${readA.text} | ${readB.text}`);
    const [shotAB, shotBB] = await Promise.all([call('computer', { action: 'screenshot' }), s2('computer', { action: 'screenshot' })]);
    ok('10 both sessions capture at the same time', shotAB.images === 1 && shotBB.images === 1, `${shotAB.text} | ${shotBB.text}`);
    ok('10 the session on A does not see the tab of the session on B', !(await call('tabs_context_mcp')).text.includes('/second'));

    // Story 11: the first session switches to the other browser; what it held in A is released.
    const switched = await call('browser_attach', { browser: nameB });
    ok('10 browser_attach with another browser switches the session', !switched.err && new RegExp(`Browser: ${nameB} \\(requested\\)`).test(switched.text) && !/Already attached/.test(switched.text), switched.text);
    const s3 = await startSession(3);
    const takeA = await s3('browser_attach', { browser: nameA });
    const ctxA = await poll(() => s3('tabs_context_mcp'), r => /Tab ID: \d+/.test(r.text) && !r.err);
    ok('10 after the switch, the tab it held in A belongs to nobody (a new session on A gets it)', !takeA.err && /Tab ID: \d+ \|[^\n]*Test Page|Tab ID: \d+[^\n]*127\.0\.0\.1/.test(ctxA.text), `${takeA.text} | ${ctxA.text}`);
    ok('10 the switched session now works in B', (await call('get_page_text')).text.length > 0 && !(await call('tabs_context_mcp')).err);

    // Closing A: its session is told what was lost and what is left; the sessions on B keep working.
    killRun(join(tmp, 'user-browser'));
    const lost = await poll(() => s3('tabs_context_mcp'), r => r.err);
    ok('10 closing a browser tells its session which one went and which are still connected', lost.err && new RegExp(`${nameA} disconnected\\. Still connected: ${nameB.split('-')[0]}\\.`).test(lost.text), lost.text);
    ok('10 the sessions on the other browser keep working', (await s2('get_page_text')).text.includes('second page') && !(await call('tabs_context_mcp')).err);
    const left = await poll(() => call('list_connected_browsers'), r => /Connected browsers \(1\)/.test(r.text));
    ok('10 the list shows only the browser that is left', /Connected browsers \(1\)/.test(left.text) && left.text.includes(nameB.split('-')[0]) && !left.text.includes(nameA), left.text);
    await s3('browser_close'); await s2('browser_close'); await call('browser_close');
    killRun(join(tmp, 'second-profile'));
  }
  try { execFileSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '${userPat}' -and $_.CommandLine -notlike '*--type=*' } | ForEach-Object { taskkill /PID $_.ProcessId /T /F }`], { stdio: 'ignore' }); } catch { /* cleaned in finally too */ }
  }

  // ---- idle shutdown (server runs with BROWSER_IDLE_MS=8000) ----
  await call('browser_launch', { browser: process.env.LIVE_BROWSER ?? 'chrome', headless: true, port: PORT });
  for (let i = 0; i < 3; i++) { await new Promise(r => setTimeout(r, 4000)); await call('browser_status'); } // 12s of activity gaps < 8s
  ok('activity keeps the browser alive', JSON.parse((await call('browser_status')).text).reachable === true);
  await new Promise(r => setTimeout(r, 11000)); // idle > 8s
  const idle = JSON.parse((await call('browser_status')).text);
  ok('idle browser is closed by the tool', idle.reachable === false && idle.launchedByThisTool === false, JSON.stringify(idle));
  const afterIdle = await call('tabs_context_mcp');
  ok('after idle shutdown tools say to relaunch', afterIdle.err && /browser_launch/.test(afterIdle.text), afterIdle.text);  console.log(`\nALL ${passed} CHECKS PASSED`);
} finally {
  // Each step has a deadline: a hung one must not stop the kills below from running.
  const within = (p, ms = 10000) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise(r => setTimeout(r, ms))]);
  await within(call('browser_close')); // never leave the test browsers behind, pass or fail
  for (const c of extraClients) await within(c.close());
  await within(stopBroker(brokerDir)); // only the broker this run started, proven by its command line
  killRun(tmp);
  await within(client.close());
  srv.close();
  await new Promise(r => setTimeout(r, 1500)); // let the browser release its files
  // Only this run's folder: another run's folder may belong to a run that is still going.
  try { rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch (e) { console.error('cleanup failed:', e.message); }
  if (existsSync(tmp)) { console.error(`RESIDUE: ${tmp} was not removed`); process.exitCode = 1; } // a run that leaves residue is a failing run
}
process.exit(process.exitCode ?? 0);
