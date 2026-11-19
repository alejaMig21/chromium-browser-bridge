// Cross-browser matrix runner. Drives the real tools against a real browser that already has the extension installed
// and writes one results table. It works only through the MCP tools, in a tab it opens itself on a page it serves, so it never
// touches the user's own tabs, mouse or focus; the steps that need the user (minimize, switch tab, a second session) are
// asked for in plain words.   node matrix.mjs --browser vivaldi [--results .scratch/cross-browser/results.md]
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import os from 'node:os';

export const BEHAVIOURS = ['attach', 'create tab with URL', 'read', 'click', 'screenshot size', 'popup native', 'screenshot while minimized', 'tab switch keeps work tab', 'two sessions', 'broker survives the starter closing'];
export const PAGE = '<title>matrix</title><body><h1>MATRIX-PAGE</h1><button id=b onclick="n++;o.textContent=\'clicked \'+n">Click me</button><p id=o>clicked 0</p><script>let n=0</script>';
const dims = png => (png ? [png.readUInt32BE(16), png.readUInt32BE(20)] : []);
const brief = t => String(t ?? '').replace(/\s+/g, ' ').slice(0, 160);

const BRAND = { chrome: 'Google Chrome', edge: 'Microsoft Edge', brave: 'Brave', opera: 'Opera' };
// Vivaldi announces Chromium, sometimes "Vivaldi" and sometimes "Google Chrome" too; Edge, Brave and Opera announce their own name.
// So the brand cannot tell Vivaldi from Chrome (the version check against the installed program does that for Chrome).
export const isBrowser = (browser, brands) => browser in BRAND ? brands.includes(BRAND[browser]) : browser === 'vivaldi' ? brands.includes('Vivaldi') || !['Microsoft Edge', 'Brave', 'Opera'].some(b => brands.includes(b)) : true;

export async function runMatrix({ call, ask, base, drive, browser, installedMajor }) {
  const rows = [];
  const row = (behaviour, result, evidence, kind = 'auto') => rows.push({ behaviour, result, evidence: brief(evidence), kind });
  // An automated check: a tool failure or a wrong answer is a fail with the evidence, and the run goes on.
  const auto = async (behaviour, fn) => { try { const [ok, evidence] = await fn(); row(behaviour, ok ? 'pass' : ok === null ? 'skipped' : 'fail', evidence); } catch (e) { row(behaviour, 'fail', e.message); } };
  // A manual check: asked in words; "skip" is recorded as skipped, never as a pass.
  const manual = async (behaviour, question, fn) => {
    const answer = String(await ask(question)).toLowerCase();
    if (answer === 'skip') return row(behaviour, 'skipped', 'manual step not done', 'manual');
    try { const [ok, evidence] = await fn(answer); row(behaviour, ok ? 'pass' : (ok === null ? 'skipped' : 'fail'), evidence, 'manual'); } catch (e) { row(behaviour, 'fail', e.message, 'manual'); }
  };
  const text = r => r.text ?? '';
  const COVERED = /covering the browser window/; // the bridge's plain message when a covered window paints nothing

  let attachedTo; // the connected browser browser_attach says it chose: "Browser: <name> (requested)..."
  await auto('attach', async () => { const r = await call('browser_attach', browser ? { browser } : {}); attachedTo = /^Browser: (\S+)/.exec(text(r))?.[1]; return [!r.err, text(r)]; });
  if (browser && rows[0].result === 'fail') { // not connected: refused, with what is connected, and nothing else is filed
    const listed = text(await call('list_connected_browsers').catch(() => ({})));
    rows.length = 0;
    const names = [...listed.matchAll(/^- (\S+?)(?: \(id \S+\))?:/gm)].map(m => m[1]);
    row('attached browser is the one asked for', 'fail', `asked for ${browser}, but it is not connected. ${names.length ? `Connected: ${names.join(', ')}` : 'No browser is connected'}.`);
    return rows;
  }
  let tabId;
  await auto('create tab with URL', async () => { const r = await call('tabs_create_mcp', { url: base }); tabId = /Created tab (\d+)/.exec(text(r))?.[1]; return [!r.err && !!tabId, text(r)]; });
  rows.userAgent = text(await call('javascript_tool', { text: 'navigator.userAgent' }).catch(() => ({})));
  if (browser) { // never file results under the wrong name: the attached browser must be the one asked for
    const brands = JSON.parse(text(await call('javascript_tool', { text: 'JSON.stringify((navigator.userAgentData?.brands ?? []).map(b => b.brand))' }).catch(() => ({}))) || '[]');
    // Vivaldi announces itself as "Google Chrome", so for browsers whose product version is their Chromium version the
    // attached browser's Chromium major must also equal the installed program's.
    const uaMajor = Number(/Chrome\/(\d+)/.exec(rows.userAgent)?.[1]);
    const wrongVersion = installedMajor && uaMajor && uaMajor !== installedMajor;
    const otherName = attachedTo && !attachedTo.toLowerCase().includes(browser.toLowerCase());
    if (otherName || !isBrowser(browser, brands) || wrongVersion) {
      rows.length = 0; // what was measured so far belongs to another browser
      row('attached browser is the one asked for', 'fail', `asked for ${browser}, but ${otherName ? `it attached to ${attachedTo}` : wrongVersion ? `the attached browser runs Chromium ${uaMajor} and the installed ${browser} is ${installedMajor}: it is another browser (Vivaldi announces itself as Google Chrome)` : `the attached browser announces: ${brands.join(', ')}`}`);
      if (tabId) await call('tabs_close_mcp', { tabId: Number(tabId) }).catch(() => {});
      await call('browser_close').catch(() => {});
      return rows;
    }
  }
  await auto('read', async () => { const r = await call('get_page_text'); return [!r.err && text(r).includes('MATRIX-PAGE'), text(r)]; });
  await auto('click', async () => {
    const tree = text(await call('read_page', { filter: 'interactive' }));
    const ref = /Click me[^\n]*\[(ref_\d+)\]/.exec(tree)?.[1];
    if (!ref) return [false, `no Click me button in: ${tree}`];
    const c = await call('computer', { action: 'left_click', ref });
    if (c.err) return [false, text(c)];
    const after = text(await call('get_page_text'));
    return [/clicked 1/.test(after), after];
  });
  await auto('screenshot size', async () => {
    const t0 = Date.now();
    const r = await call('computer', { action: 'screenshot' });
    const took = ` in ${Date.now() - t0} ms`;
    const [w, h] = (/\((\d+)x(\d+)\)/.exec(text(r)) ?? []).slice(1).map(Number);
    if (r.err && COVERED.test(text(r))) return [null, `not testable now, the browser window is covered by another window (a browser cannot paint it): ${text(r)}`];
    const [pw, ph] = dims(r.png);
    return [!r.err && r.images === 1 && w === pw && h === ph, r.err ? text(r) : `reported ${w}x${h}, image ${pw}x${ph}${took}`];
  });
  await auto('popup native', async () => { const r = await call('javascript_tool', { text: 'window.open.toString()' }); return [text(r).includes('[native code]'), text(r)]; });

  // Whether the window really is minimized is the system's word (the drive checks it) or the user's: a page cannot tell,
  // Chrome keeps reporting screenX 0 while minimized, Vivaldi reports -32000.
  const minimizedShot = async () => {
    const r = await call('computer', { action: 'screenshot' });
    if (r.err && COVERED.test(text(r))) return [null, `not testable now: after the restore the browser window stays covered by another window, and a browser paints nothing for a covered window: ${text(r)}`];
    return [!r.err && r.images === 1, text(r)];
  };
  const workTabRead = async () => { const r = await call('get_page_text'); return [!r.err && text(r).includes('MATRIX-PAGE'), text(r)]; };
  if (drive) {
    // The runner does the steps itself: nothing is asked, and what it did is the evidence. The minimized window is put back before anything else runs.
    const step = async (behaviour, act, fn) => {
      const a = await act().catch(e => ({ ok: false, evidence: e.message, note: e.message }));
      if (a.skip) return row(behaviour, 'skipped', a.note, 'driven'); // the step could not be run at all; a step that ran and went wrong is a fail below
      try { const [ok, evidence] = await fn(a); row(behaviour, ok ? 'pass' : ok === null ? 'skipped' : 'fail', evidence, 'driven'); } catch (e) { row(behaviour, 'fail', e.message, 'driven'); }
    };
    let minimized = false;
    await step('screenshot while minimized', async () => { const m = await drive.minimize(); minimized = m.ok; return m; }, minimizedShot);
    if (minimized) await drive.restore();
    await step('tab switch keeps work tab', () => drive.switchTabs(attachedTo), async a => { const [ok, ev] = await workTabRead(); return [ok, `${a.note ?? 'tabs switched'}; ${ev}`]; });
    await step('two sessions', () => drive.secondSession(attachedTo), async a => { const [ok, ev] = await workTabRead(); return [a.ok && ok, `${a.evidence}; first session: ${ev}`]; });
    await step('broker survives the starter closing', () => drive.closeSecond(), async a => { const r = await call('get_page_text'); return [a.ok && !r.err, `${a.evidence}; first session: ${text(r)}`]; });
  } else {
    await manual('screenshot while minimized', 'Minimize the browser window now, then press Enter (type skip to skip).', minimizedShot);
    await manual('tab switch keeps work tab', 'Switch to another tab of your browser, then press Enter (type skip to skip).', workTabRead);
    await manual('two sessions', 'Open a second Claude session, attach and open its own tab. Did both sessions keep working? (y, n or skip)', async a => [a === 'y', `user answered ${a}`]);
    await manual('broker survives the starter closing', 'Close the Claude session that started the broker. Does THIS session still work? (y, n or skip)', async a => {
      const r = await call('get_page_text');
      return [a === 'y' && !r.err, `user answered ${a}; ${text(r)}`];
    });
  }

  if (tabId) await call('tabs_close_mcp', { tabId: Number(tabId) }).catch(() => {});
  await call('browser_close').catch(() => {});
  return rows;
}

// Append the rows to the results file, writing the header once.
export function writeResults(rows, { browser, version, system, file, date = new Date().toISOString().slice(0, 10) }) {
  const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ');
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) writeFileSync(file, '# Cross-browser matrix results\n\nversion = the browser\'s user-agent token; browsers that do not announce their own name (Vivaldi) show the Chromium engine version.\n\n| date | browser | version | system | behaviour | result | evidence |\n|---|---|---|---|---|---|---|\n');
  appendFileSync(file, rows.map(r => `| ${date} | ${cell(browser)} | ${cell(version)} | ${cell(system)} | ${r.behaviour} | ${r.result} | ${cell(r.evidence)} |\n`).join(''));
}

// The real drive of `--drive`: what the manual rows ask a person to do, done by the runner. Everything goes through window and
// extension APIs (no mouse, no keys, nothing takes focus): the window is minimized and put back right behind the window that
// was in front, tabs are switched with the extension's reveal/hide (the steps a capture of a background tab uses), and the
// second session is a second MCP server process on the same broker.
export async function makeDrive({ browser, connect, base, makeBroker }) {
  const { execFile } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { brokerClient, defaultDir } = await import('./broker-client.mjs');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // The control channel must name the browser the attach chose ("chrome-3f9a"), or it fails when several are connected.
  let control;
  const broker = attachedTo => (control ??= (makeBroker ?? brokerClient)({ sessionId: 'matrix-drive', browser: attachedTo ?? browser }));
  const procName = { vivaldi: 'vivaldi', chrome: 'chrome', edge: 'msedge', brave: 'brave', opera: 'opera' }[browser] ?? browser;
  const script = join(fileURLToPath(new URL('.', import.meta.url)), 'matrix-window.ps1');
  const ps = (action, behind = 0) => new Promise(res => execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Action', action, '-Name', procName, '-Behind', String(behind)], { windowsHide: true }, (err, out) => { try { res(JSON.parse(out)); } catch { res({ ok: false, note: String(err?.message ?? out).slice(0, 120) }); } }));
  let behind = 0, minimized = false, second;
  const brokerPid = () => { try { return JSON.parse(readFileSync(join(defaultDir(), 'broker.json'), 'utf8')).pid; } catch { return null; } };
  const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
  return {
    async minimize() {
      if (process.platform !== 'win32') return { ok: false, skip: true, note: 'minimizing is automated on Windows only' };
      const r = await ps('minimize');
      if (!r.ok) return { ok: false, skip: true, note: r.note };
      behind = r.behind; minimized = !r.was; // a window the user had already minimized is left minimized at the end
      if (!r.iconic) return { ok: false, skip: true, note: 'the window did not minimize (the system says it is not iconic)' };
      await sleep(800);
      return { ok: true };
    },
    async restore() { if (minimized) { await ps('restore', behind); minimized = false; await sleep(400); } },
    async switchTabs(attachedTo) {
      const [tab] = await broker(attachedTo).tabs(base.replace(/\/$/, '')); // only the matrix's own tab is asked for
      if (!tab) return { ok: false, skip: true, note: 'the matrix tab was not found among the browser tabs' };
      const shown = await broker(attachedTo).reveal(tab.id); // the browser activates the matrix tab, as if the user had switched to it
      await sleep(700);
      await broker(attachedTo).hide(shown); // and back to the tab the user was on
      return { ok: true, note: `browser tab ${tab.id} was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user)` };
    },
    async secondSession(attachedTo) {
      second = await connect();
      const att = await second.call('browser_attach', attachedTo ?? browser ? { browser: attachedTo ?? browser } : {});
      const created = await second.call('tabs_create_mcp', { url: `${base}?second` });
      const id = /Created tab (\d+)/.exec(created.text)?.[1];
      second.tabId = id && Number(id);
      const read = id ? await second.call('get_page_text', { tabId: second.tabId }) : created;
      const st = await broker(attachedTo).status();
      return { ok: !att.err && !created.err && /MATRIX-PAGE/.test(read.text), evidence: `second session: attach ${att.err ? 'failed' : 'ok'}, own tab ${id ?? 'none'}, read ${/MATRIX-PAGE/.test(read.text) ? 'ok' : read.text.slice(0, 60)}; broker sessions ${st.sessions}` };
    },
    async closeSecond() {
      if (!second) return { ok: false, evidence: 'there was no second session to close' };
      const pid = brokerPid();
      if (second.tabId) await second.call('tabs_close_mcp', { tabId: second.tabId }).catch(() => {});
      await second.client.close().catch(() => {}); // the process of the second session ends, as when its Claude session is closed
      second = null;
      await sleep(1500);
      const st = await broker().status();
      return { ok: !!pid && alive(pid) && st.connected === true, evidence: `closed the second session; broker pid ${pid} ${pid && alive(pid) ? 'still alive' : 'GONE'}, up ${Math.round((st.uptimeMs ?? 0) / 1000)} s (it may predate this run, so the closed session need not be the one that started it)` };
    },
    async cleanup() {
      await this.restore();
      if (second) { if (second.tabId) await second.call('tabs_close_mcp', { tabId: second.tabId }).catch(() => {}); await second.client.close().catch(() => {}); }
      control?.close();
    },
  };
}

// ---- command line ----
if (import.meta.url === new URL(`file:///${process.argv[1]?.replaceAll('\\', '/')}`).href) {
  const { default: http } = await import('node:http');
  const { createInterface } = await import('node:readline/promises');
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const browser = arg('browser', 'unknown');
  const file = arg('results', '.scratch/cross-browser/results.md');
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(PAGE); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const serverPath = new URL('./server.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
  // One MCP session = one server process. The second session of --drive is a second process on the same broker.
  const connect = async () => {
    const client = new Client({ name: 'matrix', version: '1' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [serverPath], stderr: 'ignore' }));
    const call = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 }); const png = r.content.find(c => c.type === 'image'); return { err: !!r.isError, text: r.content.filter(c => c.type === 'text').map(c => c.text).join('\n'), images: r.content.filter(c => c.type === 'image').length, png: png && Buffer.from(png.data, 'base64') }; };
    return { client, call };
  };
  const { client, call } = await connect();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const driving = process.argv.includes('--drive');
  const ask = process.argv.includes('--auto') || driving ? async () => 'skip' : q => rl.question(`\n>> ${q}\n> `); // --auto: only what runs on its own
  const drive = driving ? await makeDrive({ browser, connect, base }) : undefined;
  console.log(`Matrix run for ${browser}${driving ? ' (--drive: minimizes and restores the browser window, switches tabs for a moment and opens a second session)' : ''}. The extension must already be installed in it.`);
  let rows;
  // Chrome and Edge: the product version of the installed program is its Chromium version (Windows; elsewhere not checked).
  let installedMajor;
  if (process.platform === 'win32' && ['chrome', 'edge'].includes(browser)) {
    const { resolveBrowser } = await import('./launcher.mjs');
    const { execFileSync } = await import('node:child_process');
    try { installedMajor = Number(execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Item '${resolveBrowser(browser).exe}').VersionInfo.ProductVersion`]).toString().split('.')[0]) || undefined; } catch { /* brand check only */ }
  }
  try { rows = await runMatrix({ call, ask, base, drive, browser, installedMajor }); }
  finally { await drive?.cleanup(); } // a minimized window is always put back, whatever happened
  const ua = rows.userAgent;
  writeResults(rows, { browser, version: /(Vivaldi|OPR|Edg|Chrome)\/[\d.]+/.exec(ua)?.[0] ?? ua, system: `${process.platform} ${os.release()}`, file });
  console.table(rows.map(({ behaviour, result, evidence }) => ({ behaviour, result, evidence: evidence.slice(0, 60) })));
  console.log(`Saved to ${file}`);
  rl.close(); srv.close(); await client.close();
  process.exit(rows.some(r => r.result === 'fail') ? 1 : 0);
}
