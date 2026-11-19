// The matrix runner, against a scripted fake browser: its table, its manual steps and what it is allowed to touch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BEHAVIOURS, runMatrix, writeResults, makeDrive } from './matrix.mjs';

const png = (w, h) => { const b = Buffer.alloc(24); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
// A fake browser that behaves like a healthy Chromium: every tool answers the way the real one does.
// `connected`: the browsers the broker reports; browser_attach picks the one asked for (or lands on `attachesTo` when set).
function fakeBrowser({ minimizedCaptureFails = false, brands = ['Not:A-Brand', 'Chromium', 'Google Chrome'], connected = ['chrome', 'edge', 'brave', 'opera', 'vivaldi'], attachesTo } = {}) {
  const used = [], attached = [];
  let clicked = 0;
  const call = async (name, args = {}) => {
    used.push(args.action ? `${name}:${args.action}` : name);
    const ok = (text, extra = {}) => ({ err: false, text, images: 0, ...extra });
    switch (name) {
      case 'browser_attach': {
        attached.push(args.browser);
        if (args.browser && !connected.includes(args.browser)) return { err: true, text: `Browser "${args.browser}" is not connected. Connected: ${connected.join(', ')}.`, images: 0 };
        return ok(`Browser: ${attachesTo ?? args.browser ?? connected[0]} (${args.browser ? 'requested' : 'only one connected'}). Attached to the user's own browser. Tabs in play: 1.`);
      }
      case 'list_connected_browsers': return ok(`Connected browsers (${connected.length}):\n${connected.map(n => `- ${n}: x`).join('\n')}`);
      case 'tabs_create_mcp': return ok(`Created tab 7 at ${args.url}`);
      case 'tabs_close_mcp': return ok('Closed tab 7');
      case 'get_page_text': return ok(`Title: matrix\nURL: x\n---\nMATRIX-PAGE clicked ${clicked}`);
      case 'javascript_tool':
        if (/window\.open/.test(args.text)) return ok('function open() { [native code] }');
        if (/screenX/.test(args.text)) return ok(JSON.stringify({ sx: -25600 }));
        if (/userAgentData/.test(args.text)) return ok(JSON.stringify(brands));
        if (/userAgent/.test(args.text)) return ok('Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36 Vivaldi/7.0');
        return ok('undefined');
      case 'read_page': return ok('button "Click me" [ref_1]');
      case 'computer':
        if (args.action === 'left_click') { clicked++; return ok('Clicked at (10, 10)'); }
        if (args.action === 'screenshot') {
          if (minimizedCaptureFails && used.includes('javascript_tool') && args.__minimized) return { err: true, text: 'timeout', images: 0 };
          return ok('Successfully captured screenshot (800x600) - ID: s1', { images: 1, png: png(800, 600) });
        }
        return ok('done');
      case 'browser_status': return ok(JSON.stringify({ broker: { sessions: 2 } }));
      case 'browser_close': return ok('Detached from the user\'s own browser');
    }
    return { err: true, text: `unexpected tool ${name}`, images: 0 };
  };
  return { call, used, attached };
}
const allYes = async () => 'y';

test('a healthy browser passes every behaviour that can run on its own', async () => {
  const f = fakeBrowser();
  const rows = await runMatrix({ call: f.call, ask: allYes, base: 'http://127.0.0.1:1/' });
  for (const name of BEHAVIOURS) assert.ok(rows.find(r => r.behaviour === name), `${name} was run`);
  assert.deepEqual(rows.filter(r => r.result !== 'pass').map(r => `${r.behaviour}: ${r.result} ${r.evidence}`), []);
});

test('a failing behaviour is reported with its evidence and does not stop the others', async () => {
  const f = fakeBrowser();
  const broken = async (name, args) => (name === 'computer' && args.action === 'left_click' ? { err: true, text: 'click refused', images: 0 } : f.call(name, args));
  const rows = await runMatrix({ call: broken, ask: allYes, base: 'http://127.0.0.1:1/' });
  const click = rows.find(r => r.behaviour === 'click');
  assert.equal(click.result, 'fail');
  assert.match(click.evidence, /click refused/);
  assert.ok(rows.filter(r => r.result === 'pass').length >= BEHAVIOURS.length - 3, 'the rest still ran');
});

test('a capture refused because another window covers the browser is skipped with the reason, not failed', async () => {
  const f = fakeBrowser();
  const covered = async (name, args) => (name === 'computer' && args.action === 'screenshot' ? { err: true, text: 'The tab was shown, but the browser paints nothing for it, usually because another window is covering the browser window.', images: 0 } : f.call(name, args));
  const rows = await runMatrix({ call: covered, ask: allYes, base: 'http://127.0.0.1:1/' });
  const shot = rows.find(r => r.behaviour === 'screenshot size');
  assert.equal(shot.result, 'skipped');
  assert.match(shot.evidence, /covered by another window/);
});

// Several browsers can have the extension installed but the broker serves one: results must never be filed under another name.
test('the run is refused, and filed as a failure, when the attached browser is not the one asked for', async () => {
  const rows = await runMatrix({ call: fakeBrowser().call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'edge' });
  const bad = rows.find(r => r.behaviour === 'attached browser is the one asked for');
  assert.equal(bad.result, 'fail');
  assert.match(bad.evidence, /Google Chrome/);
  assert.ok(!rows.some(r => r.behaviour === 'read'), 'nothing else ran against the wrong browser');
  assert.deepEqual(rows.map(r => r.behaviour), ['attached browser is the one asked for'], 'rows measured on the wrong browser are not filed under this name');
});

test('the run chooses its browser with browser_attach and the failure text no longer tells to close the other browsers', async () => {
  const f = fakeBrowser();
  const rows = await runMatrix({ call: f.call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'chrome' });
  assert.deepEqual(f.attached, ['chrome']);
  assert.equal(rows.find(r => r.behaviour === 'attach').result, 'pass');
  const bad = (await runMatrix({ call: fakeBrowser().call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'edge' })).find(r => r.behaviour === 'attached browser is the one asked for');
  assert.doesNotMatch(bad.evidence, /one browser at a time|close the other|disable their extension/i);
});

test('a browser that is not connected is a refused run with the connected list, and nothing else is filed', async () => {
  const f = fakeBrowser({ connected: ['chrome', 'edge'] });
  const rows = await runMatrix({ call: f.call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'vivaldi' });
  assert.deepEqual(rows.map(r => r.behaviour), ['attached browser is the one asked for']);
  assert.equal(rows[0].result, 'fail');
  assert.match(rows[0].evidence, /vivaldi.*not connected.*chrome, edge/);
  assert.ok(!f.used.includes('tabs_create_mcp'), 'no tab was opened');
});

test('results are never filed for a browser other than the one attached', async () => {
  const f = fakeBrowser({ attachesTo: 'edge' });
  const rows = await runMatrix({ call: f.call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'chrome' });
  assert.deepEqual(rows.map(r => r.behaviour), ['attached browser is the one asked for']);
  assert.match(rows[0].evidence, /asked for chrome.*attached to edge/);
});

test('the browser asked for is recognised by its brand: Chrome, Edge, Brave, Opera, and Vivaldi (which announces only Chromium)', async () => {
  const cases = [['chrome', ['Chromium', 'Google Chrome']], ['edge', ['Chromium', 'Microsoft Edge']], ['brave', ['Chromium', 'Brave']], ['opera', ['Chromium', 'Opera']], ['vivaldi', ['Not:A-Brand', 'Chromium']], ['vivaldi', ['Chromium', 'Vivaldi']], ['vivaldi', ['Not:A-Brand', 'Chromium', 'Google Chrome']]];
  for (const [browser, brands] of cases) {
    const rows = await runMatrix({ call: fakeBrowser({ brands }).call, ask: allYes, base: 'http://127.0.0.1:1/', browser });
    assert.ok(!rows.some(r => r.behaviour === 'attached browser is the one asked for'), `${browser} with ${brands} was accepted`);
  }
  const rows = await runMatrix({ call: fakeBrowser({ brands: ['Chromium', 'Microsoft Edge'] }).call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'vivaldi' });
  assert.ok(rows.some(r => r.behaviour === 'attached browser is the one asked for' && r.result === 'fail'), 'Edge is not Vivaldi');
});

// Vivaldi announces itself as "Google Chrome": the brand cannot tell them apart, the Chromium version of the installed program can.
test('a browser that announces the brand of another is refused by its Chromium version against the installed program', async () => {
  const same = await runMatrix({ call: fakeBrowser().call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'chrome', installedMajor: 131 }); // the fake reports Chrome/131
  assert.ok(!same.some(r => r.behaviour === 'attached browser is the one asked for'), 'the same major is accepted');
  const other = await runMatrix({ call: fakeBrowser().call, ask: allYes, base: 'http://127.0.0.1:1/', browser: 'chrome', installedMajor: 154 });
  const bad = other.find(r => r.behaviour === 'attached browser is the one asked for');
  assert.equal(bad.result, 'fail');
  assert.match(bad.evidence, /Chromium 131.*installed chrome.*154/);
  assert.ok(!other.some(r => r.behaviour === 'read'));
});

// With a drive the runner performs the manual steps itself instead of asking, and records what it did.
function fakeDrive(over = {}) {
  const log = [];
  return {
    log,
    minimize: async () => { log.push('minimize'); return { ok: true }; },
    restore: async () => { log.push('restore'); },
    switchTabs: async () => { log.push('switch'); return { ok: true, note: 'activated and returned' }; },
    secondSession: async () => { log.push('second'); return { ok: true, evidence: 'second session read its own tab' }; },
    closeSecond: async () => { log.push('closeSecond'); return { ok: true, evidence: 'broker pid 1 alive' }; },
    ...over,
  };
}

test('with a drive, nothing is asked and every row is run by the runner, minimized window restored last', async () => {
  const d = fakeDrive();
  const asked = [];
  const rows = await runMatrix({ call: fakeBrowser().call, ask: async q => { asked.push(q); return 'y'; }, base: 'http://127.0.0.1:1/', drive: d });
  assert.deepEqual(asked, []);
  assert.deepEqual(d.log, ['minimize', 'restore', 'switch', 'second', 'closeSecond']);
  assert.deepEqual(rows.filter(r => r.result !== 'pass').map(r => `${r.behaviour}: ${r.result} ${r.evidence}`), []);
});

test('with a drive, the steps that reach the browser are told which connected browser the attach chose', async () => {
  const seen = [];
  const d = fakeDrive({ switchTabs: async (base, name) => { seen.push(['switch', name]); return { ok: true }; }, secondSession: async (base, name) => { seen.push(['second', name]); return { ok: true, evidence: 'ok' }; } });
  await runMatrix({ call: fakeBrowser({ attachesTo: 'chrome-3f9a' }).call, ask: async () => 'y', base: 'http://127.0.0.1:1/', drive: d });
  assert.deepEqual(seen, [['switch', 'chrome-3f9a'], ['second', 'chrome-3f9a']]);
});

// The real drive's way to the broker, with the broker client and the second MCP session replaced.
test('the real drive sends the browser to its control channel and to the second session\'s attach', async () => {
  const made = [], calls = [];
  const makeBroker = opts => { made.push(opts); return { tabs: async () => [{ id: 3 }], reveal: async () => ({}), hide: async () => {}, status: async () => ({ sessions: 2, connected: true }) }; };
  const second = { call: async (name, args) => { calls.push([name, args]); return { err: false, text: name === 'tabs_create_mcp' ? 'Created tab 9' : 'MATRIX-PAGE' }; }, client: { close: async () => {} } };
  const d = await makeDrive({ browser: 'chrome', connect: async () => second, base: 'http://127.0.0.1:1/', makeBroker });
  assert.equal((await d.switchTabs('http://127.0.0.1:1/', 'chrome-3f9a')).ok, true);
  assert.deepEqual(made.map(o => [o.sessionId, o.browser]), [['matrix-drive', 'chrome-3f9a']]);
  assert.equal((await d.secondSession('http://127.0.0.1:1/', 'chrome-3f9a')).ok, true);
  assert.deepEqual(calls[0], ['browser_attach', { browser: 'chrome-3f9a' }]);
  assert.equal(made.length, 1, 'one control client for the whole run');
});

test('with a drive, a window that cannot be minimized skips that row with the reason and still restores nothing', async () => {
  const d = fakeDrive({ minimize: async () => ({ ok: false, skip: true, note: 'no window found' }) });
  const rows = await runMatrix({ call: fakeBrowser().call, ask: async () => 'y', base: 'http://127.0.0.1:1/', drive: d });
  const r = rows.find(x => x.behaviour === 'screenshot while minimized');
  assert.equal(r.result, 'skipped');
  assert.match(r.evidence, /no window found/);
  assert.ok(!d.log.includes('restore'));
});

test('a capture after a restore that leaves the window covered is skipped with the reason, in the minimized row too', async () => {
  const f = fakeBrowser();
  const covered = async (name, args) => (name === 'computer' && args.action === 'screenshot' ? { err: true, text: 'The tab was shown, but the browser paints nothing for it, usually because another window is covering the browser window.', images: 0 } : f.call(name, args));
  const rows = await runMatrix({ call: covered, ask: async () => 'y', base: 'http://127.0.0.1:1/', drive: fakeDrive() });
  const r = rows.find(x => x.behaviour === 'screenshot while minimized');
  assert.equal(r.result, 'skipped');
  assert.match(r.evidence, /covered by another window/);
});

test('a minimized window is judged by the system, not by screenX: Chrome keeps reporting screenX 0 while minimized', async () => {
  const f = fakeBrowser();
  const chromeLike = async (name, args) => (name === 'javascript_tool' && /screenX/.test(args.text) ? { err: false, text: JSON.stringify({ sx: 0 }), images: 0 } : f.call(name, args));
  const rows = await runMatrix({ call: chromeLike, ask: async () => 'y', base: 'http://127.0.0.1:1/', drive: fakeDrive() });
  assert.equal(rows.find(r => r.behaviour === 'screenshot while minimized').result, 'pass');
});

test('with a drive, a second session that fails to work fails the two-sessions row with its evidence', async () => {
  const d = fakeDrive({ secondSession: async () => ({ ok: false, evidence: 'second session could not read' }) });
  const rows = await runMatrix({ call: fakeBrowser().call, ask: async () => 'y', base: 'http://127.0.0.1:1/', drive: d });
  const r = rows.find(x => x.behaviour === 'two sessions');
  assert.equal(r.result, 'fail');
  assert.match(r.evidence, /could not read/);
});

test('manual steps are asked, and a step the user skips is recorded as skipped, not as a pass', async () => {
  const asked = [];
  const rows = await runMatrix({ call: fakeBrowser().call, ask: async q => { asked.push(q); return 'skip'; }, base: 'http://127.0.0.1:1/' });
  assert.ok(asked.length >= 2, 'minimize and tab switch are manual');
  assert.ok(rows.filter(r => /manual/.test(r.kind ?? '')).every(r => r.result === 'skipped'));
});

test('the runner only uses browser tools, never anything that moves the mouse or takes focus on the user\'s machine', async () => {
  const f = fakeBrowser();
  await runMatrix({ call: f.call, ask: allYes, base: 'http://127.0.0.1:1/' });
  const allowed = new Set(['browser_attach', 'tabs_create_mcp', 'tabs_close_mcp', 'get_page_text', 'javascript_tool', 'read_page', 'computer:left_click', 'computer:screenshot', 'browser_status', 'browser_close', 'find']);
  assert.deepEqual(f.used.filter(u => !allowed.has(u)), []);
});

test('the results table records browser, version, system, behaviour, result and evidence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'matrix-'));
  const file = join(dir, 'results.md');
  writeResults([{ behaviour: 'attach', result: 'pass', evidence: 'Attached' }, { behaviour: 'click', result: 'fail', evidence: 'refused | x' }], { browser: 'vivaldi', version: 'Vivaldi/7.0', system: 'win32 10.0', file, date: '2026-11-18' });
  writeResults([{ behaviour: 'attach', result: 'pass', evidence: 'ok' }], { browser: 'brave', version: 'Chrome/131', system: 'darwin 23', file, date: '2026-11-19' });
  const text = readFileSync(file, 'utf8');
  assert.match(text, /^\| date \| browser \| version \| system \| behaviour \| result \| evidence \|/m);
  assert.match(text, /\| 2026-11-18 \| vivaldi \| Vivaldi\/7\.0 \| win32 10\.0 \| click \| fail \| refused \\\| x \|/);
  assert.equal((text.match(/^\| date/gm) ?? []).length, 1, 'header written once');
  assert.match(text, /\| 2026-11-19 \| brave \|/);
  rmSync(dir, { recursive: true, force: true });
});
