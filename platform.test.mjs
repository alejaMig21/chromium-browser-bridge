// The platform layer answers for Windows, macOS and Linux from any machine: the platform is a parameter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BROWSER_NAMES, installGuide, browserPaths, discoveryDir, extensionsPage, parseProcessList, listCommand, commandLineCommand, killTree, pickBrowserPid, regValue, programFromCommand, defaultBrowserProgram, matchBrowsers } from './platform.mjs';

test('every supported browser has a place to look on every system', () => {
  for (const p of ['win32', 'darwin', 'linux'])
    for (const name of BROWSER_NAMES) assert.ok(browserPaths(name, p, { LOCALAPPDATA: 'C:\\L' }, '/home/me').length > 0, `${name} on ${p}`);
});

test('Windows browser locations come from the program folders and the local app data folder', () => {
  const env = { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' };
  assert.match(browserPaths('vivaldi', 'win32', env, 'C:\\Users\\me')[0], /AppData.Local.Vivaldi.Application.vivaldi\.exe$/);
  assert.ok(browserPaths('chrome', 'win32', env, '').some(p => /Google.Chrome.Application.chrome\.exe$/.test(p)));
  assert.ok(browserPaths('edge', 'win32', env, '').some(p => /msedge\.exe$/.test(p)));
});

test('macOS browser locations are application bundles, system and per-user', () => {
  assert.ok(browserPaths('chrome', 'darwin', {}, '/Users/me').includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
  assert.ok(browserPaths('vivaldi', 'darwin', {}, '/Users/me').includes('/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'));
  assert.ok(browserPaths('edge', 'darwin', {}, '/Users/me').includes('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'));
  assert.ok(browserPaths('brave', 'darwin', {}, '/Users/me').includes('/Users/me/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'));
});

test('Linux browser locations cover packages and snaps', () => {
  assert.ok(browserPaths('chrome', 'linux', {}, '/home/me').includes('/usr/bin/google-chrome-stable'));
  assert.ok(browserPaths('chromium', 'linux', {}, '/home/me').includes('/snap/bin/chromium'));
  assert.ok(browserPaths('brave', 'linux', {}, '/home/me').includes('/usr/bin/brave-browser'));
  assert.ok(browserPaths('edge', 'linux', {}, '/home/me').includes('/usr/bin/microsoft-edge'));
  assert.ok(browserPaths('opera', 'linux', {}, '/home/me').includes('/usr/bin/opera'));
});

test('the discovery folder is the usual per-user location of each system', () => {
  assert.match(discoveryDir('win32', { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' }, 'C:\\Users\\me'), /AppData.Local.local-claude-browser-manager$/);
  assert.equal(discoveryDir('darwin', {}, '/Users/me'), '/Users/me/Library/Application Support/local-claude-browser-manager');
  assert.equal(discoveryDir('linux', {}, '/home/me'), '/home/me/.local/state/local-claude-browser-manager');
  assert.equal(discoveryDir('linux', { XDG_STATE_HOME: '/state' }, '/home/me'), '/state/local-claude-browser-manager');
});

test('each browser has its own extensions page address, unknown ones have none', () => {
  assert.equal(extensionsPage('chrome'), 'chrome://extensions');
  assert.equal(extensionsPage('edge'), 'edge://extensions');
  assert.equal(extensionsPage('brave'), 'brave://extensions');
  assert.equal(extensionsPage('opera'), 'opera://extensions');
  assert.equal(extensionsPage('vivaldi'), 'vivaldi://extensions');
  assert.equal(extensionsPage('chromium'), 'chrome://extensions');
  assert.equal(extensionsPage('firefox'), undefined);
});

test('the install guide names the browser\'s own extensions page and the steps', () => {
  const g = installGuide('brave', 'D:/ext');
  assert.match(g, /brave:\/\/extensions/);
  assert.match(g, /Developer mode/);
  assert.match(g, /Load unpacked/);
  assert.match(g, /D:\/ext/);
  assert.doesNotMatch(g, /vivaldi:\/\//, 'only the named browser\'s address');
});

test('without a named browser the guide lists every supported browser\'s address', () => {
  const g = installGuide(undefined, 'D:/ext');
  for (const a of ['chrome://extensions', 'edge://extensions', 'brave://extensions', 'opera://extensions', 'vivaldi://extensions']) assert.ok(g.includes(a), a);
});

test('browsers without a debugger extension API are reported as unsupported, with no install steps', () => {
  for (const b of ['firefox', 'safari', 'Firefox']) {
    const g = installGuide(b, 'D:/ext');
    assert.match(g, /not supported/i);
    assert.doesNotMatch(g, /Load unpacked/);
  }
});

test('process commands differ by system, and the output is parsed the same way', () => {
  assert.equal(listCommand('win32').file, 'powershell');
  assert.deepEqual(listCommand('linux'), { file: 'ps', args: ['-eo', 'pid=,args='] });
  assert.deepEqual(commandLineCommand(42, 'darwin'), { file: 'ps', args: ['-p', '42', '-o', 'args='] });
  assert.equal(commandLineCommand(42, 'win32').file, 'powershell');
  assert.deepEqual(parseProcessList('  123 /usr/bin/x --a b\n45 node c.js\n\n'), [{ pid: 123, cmd: '/usr/bin/x --a b' }, { pid: 45, cmd: 'node c.js' }]);
});

test('a browser pid is picked only from a process that carries our profile and port, never a helper', () => {
  const list = [
    { pid: 1, cmd: '"vivaldi.exe" --user-data-dir=D:\\p\\profile-vivaldi --remote-debugging-port=9333 --type=renderer' },
    { pid: 2, cmd: '"vivaldi.exe" --user-data-dir=D:\\p\\profile-vivaldi --remote-debugging-port=9333' },
    { pid: 3, cmd: '"vivaldi.exe" --user-data-dir=C:\\Users\\me\\AppData\\Local\\Vivaldi\\User Data' },
    { pid: 4, cmd: '"vivaldi.exe" --user-data-dir=D:\\p\\profile-vivaldi --remote-debugging-port=9444' },
  ];
  assert.equal(pickBrowserPid(list, 'vivaldi', 9333), 2);
  assert.equal(pickBrowserPid(list, 'vivaldi', 9555), null);
});

test('stopping a process tree: taskkill on Windows, the process group then the pid elsewhere', async () => {
  const ran = [], killed = [];
  await killTree(7, { platform: 'win32', run: (file, args) => ran.push([file, ...args]), kill: () => {} });
  assert.deepEqual(ran, [['taskkill', '/PID', '7', '/T', '/F']]);
  await killTree(7, { platform: 'linux', run: () => assert.fail('no shell tool on posix'), kill: (pid, sig) => killed.push([pid, sig]) });
  assert.deepEqual(killed, [[-7, 'SIGTERM']]);
  const second = [];
  await killTree(8, { platform: 'darwin', run: () => {}, kill: (pid, sig) => { second.push(pid); if (pid < 0) throw new Error('ESRCH'); } });
  assert.deepEqual(second, [-8, 8], 'falls back to the pid when it leads no process group');
});

// ---- system default browser (Windows) ----
const USER_CHOICE = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice\r\n    Hash    REG_SZ    abc/DEF=\r\n    ProgId    REG_SZ    VivaldiHTM.QWERTY123\r\n\r\n';
const OPEN_CMD = 'HKEY_CLASSES_ROOT\\VivaldiHTM.QWERTY123\\shell\\open\\command\r\n    (Default)    REG_SZ    "C:\\Users\\me\\AppData\\Local\\Vivaldi\\Application\\vivaldi.exe" -- "%1"\r\n\r\n';

test('regValue reads one named value from reg query text', () => {
  assert.equal(regValue(USER_CHOICE, 'ProgId'), 'VivaldiHTM.QWERTY123');
  assert.equal(regValue(OPEN_CMD, '(Default)'), '"C:\\Users\\me\\AppData\\Local\\Vivaldi\\Application\\vivaldi.exe" -- "%1"');
  assert.equal(regValue('ERROR: The system was unable to find the specified registry key or value.', 'ProgId'), undefined);
});

test('programFromCommand gives the lower-case executable name without extension', () => {
  assert.equal(programFromCommand('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --single-argument %1'), 'chrome');
  assert.equal(programFromCommand('C:\\Windows\\msedge.EXE -url %1'), 'msedge');
  assert.equal(programFromCommand('"C:\\Users\\me\\Vivaldi\\vivaldi.exe" -- "%1"'), 'vivaldi');
  assert.equal(programFromCommand(''), undefined);
  assert.equal(programFromCommand(undefined), undefined);
});

test('defaultBrowserProgram follows UserChoice then the ProgId open command', async () => {
  const calls = [];
  const run = async (file, args) => { calls.push(args.join(' ')); return /UserChoice/.test(args.join(' ')) ? USER_CHOICE : OPEN_CMD; };
  assert.equal(await defaultBrowserProgram({ run, platform: 'win32' }), 'vivaldi');
  assert.match(calls[1], /VivaldiHTM\.QWERTY123\\shell\\open\\command/);
});

test('defaultBrowserProgram returns nothing off Windows, on a missing key, a failure or a timeout', async () => {
  const never = async () => { throw new Error('must not run'); };
  assert.equal(await defaultBrowserProgram({ run: never, platform: 'linux' }), undefined);
  assert.equal(await defaultBrowserProgram({ run: async () => { throw new Error('key not found'); }, platform: 'win32' }), undefined);
  assert.equal(await defaultBrowserProgram({ run: async () => 'garbage', platform: 'win32' }), undefined);
  assert.equal(await defaultBrowserProgram({ run: () => new Promise(() => {}), platform: 'win32', timeoutMs: 50 }), undefined);
});

test('defaultBrowserProgram reads a real answer on this Windows machine', { skip: process.platform !== 'win32' }, async () => {
  const p = await defaultBrowserProgram();
  assert.ok(p === undefined || (typeof p === 'string' && p.length > 0 && p === p.toLowerCase())); // whatever this host's default is
});

// ---- one name matcher for the broker, its client and the MCP server ----
const rows = [{ name: 'chrome-3f9a', base: 'chrome', instance: '3f9a1b2c-0000' }, { name: 'chrome-bbbb', base: 'chrome', instance: 'bbbb2222' }, { name: 'msedge', base: 'msedge' }];
const names = (want, list = rows, opts) => matchBrowsers(want, list, opts).map(r => r.name);

test('matchBrowsers: the exact name or program name first, then the name that contains it', () => {
  assert.deepEqual(names('msedge'), ['msedge']);
  assert.deepEqual(names('EDGE'), ['msedge']);
  assert.deepEqual(names('chrome'), ['chrome-3f9a', 'chrome-bbbb']); // the program name is exact for both: ambiguous, not "none"
  assert.deepEqual(names('brave'), []);
});

test('matchBrowsers: name-xxxx still finds its entry when the suffix is no longer displayed', () => {
  assert.deepEqual(names('chrome-3f9a', [{ name: 'chrome', base: 'chrome', instance: '3f9a1b2c-0000' }]), ['chrome']);
  assert.deepEqual(names('chrome-3f9a', [{ name: 'chrome', base: 'chrome', instance: 'bbbb2222' }]), []);
  assert.deepEqual(names('chrome-3f9a', [{ name: 'chrome', base: 'chrome' }]), []); // a legacy entry has no id to match
});

test('matchBrowsers with exactOnly never picks a name that merely contains the request', () => {
  const list = [{ name: 'chromehelper' }, { name: 'msedge' }];
  assert.deepEqual(names('chrome', list), ['chromehelper']);
  assert.deepEqual(names('chrome', list, { exactOnly: true }), []);
  assert.deepEqual(names('msedge', list, { exactOnly: true }), ['msedge']);
});
