// Everything that differs by operating system lives here, with the platform as a parameter so Windows, macOS and
// Linux can all be tested from any machine. Pure functions answer "where" and "which command"; killTree is the only
// one that acts, and it takes the way to run a command and to send a signal as parameters too.
import path from 'node:path';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';

export const BROWSER_NAMES = ['chrome', 'edge', 'brave', 'opera', 'vivaldi', 'chromium'];

// The one place that decides which connected browsers a requested name means. `rows` are { name (as listed), base? (the
// program name, default = name), instance? (id) }. Matches, in order: the listed or program name exactly, or "<program>-<first
// characters of the instance id>" (a name shown with a suffix still finds its entry after the sibling profile left and the
// suffix is no longer displayed); else, unless exactOnly, the names that contain the request.
export function matchBrowsers(want, rows, { exactOnly = false } = {}) {
  const w = String(want).toLowerCase();
  const exact = rows.filter(r => {
    const base = r.base ?? r.name;
    return r.name === w || base === w || (!!r.instance && w.length > base.length + 1 && w.startsWith(`${base}-`) && r.instance.toLowerCase().startsWith(w.slice(base.length + 1)));
  });
  return exact.length || exactOnly ? exact : rows.filter(r => r.name.includes(w));
}

// The promise's answer, or nothing once `ms` have passed.
const withTimeout = (promise, ms) => {
  let timer;
  return Promise.race([promise, new Promise(r => { timer = setTimeout(r, ms, undefined); })]).finally(() => clearTimeout(timer));
};

const joinFor = p => (p === 'win32' ? path.win32.join : path.posix.join);

// Candidate executables, best first. The first one that exists is used.
export function browserPaths(name, platform = process.platform, env = process.env, home = homedir()) {
  const j = joinFor(platform);
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA ?? '';
    const pf = env.ProgramFiles ?? 'C:\\Program Files', pf86 = env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    return {
      chrome: [j(pf, 'Google/Chrome/Application/chrome.exe'), j(pf86, 'Google/Chrome/Application/chrome.exe'), j(local, 'Google/Chrome/Application/chrome.exe')],
      edge: [j(pf86, 'Microsoft/Edge/Application/msedge.exe'), j(pf, 'Microsoft/Edge/Application/msedge.exe')],
      brave: [j(pf, 'BraveSoftware/Brave-Browser/Application/brave.exe'), j(local, 'BraveSoftware/Brave-Browser/Application/brave.exe')],
      opera: [j(local, 'Programs/Opera/opera.exe'), j(pf, 'Opera/opera.exe')],
      vivaldi: [j(local, 'Vivaldi/Application/vivaldi.exe'), j(pf, 'Vivaldi/Application/vivaldi.exe')],
      chromium: [j(local, 'Chromium/Application/chrome.exe')],
    }[name] ?? [];
  }
  if (platform === 'darwin') {
    const bundle = (app, bin) => [`/Applications/${app}.app/Contents/MacOS/${bin}`, `${home}/Applications/${app}.app/Contents/MacOS/${bin}`];
    return {
      chrome: bundle('Google Chrome', 'Google Chrome'),
      edge: bundle('Microsoft Edge', 'Microsoft Edge'),
      brave: bundle('Brave Browser', 'Brave Browser'),
      opera: bundle('Opera', 'Opera'),
      vivaldi: bundle('Vivaldi', 'Vivaldi'),
      chromium: bundle('Chromium', 'Chromium'),
    }[name] ?? [];
  }
  return {
    chrome: ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/opt/google/chrome/chrome'],
    edge: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/opt/microsoft/msedge/msedge'],
    brave: ['/usr/bin/brave-browser', '/usr/bin/brave', '/opt/brave.com/brave/brave'],
    opera: ['/usr/bin/opera', '/opt/opera/opera', '/snap/bin/opera'],
    vivaldi: ['/usr/bin/vivaldi', '/usr/bin/vivaldi-stable', '/opt/vivaldi/vivaldi'],
    chromium: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
  }[name] ?? [];
}

// Where the broker leaves its discovery file: the usual per-user location of each system.
export function discoveryDir(platform = process.platform, env = process.env, home = homedir()) {
  const j = joinFor(platform);
  if (platform === 'win32') return j(env.LOCALAPPDATA ?? home, 'local-claude-browser-manager');
  if (platform === 'darwin') return j(home, 'Library/Application Support', 'local-claude-browser-manager');
  return j(env.XDG_STATE_HOME ?? j(home, '.local/state'), 'local-claude-browser-manager');
}

// The address a user opens to load the extension, per browser. Browsers without a debugger extension API have none.
export const extensionsPage = name => ({
  chrome: 'chrome://extensions', chromium: 'chrome://extensions', edge: 'edge://extensions',
  brave: 'brave://extensions', opera: 'opera://extensions', vivaldi: 'vivaldi://extensions',
})[name];

const UNSUPPORTED = ['firefox', 'safari', 'librewolf', 'waterfox', 'tor'];
// What to tell a user whose extension is not connected: how to load it in their browser, or that their browser cannot.
export function installGuide(browser, extensionDir) {
  const b = String(browser ?? '').toLowerCase();
  if (UNSUPPORTED.some(u => b.includes(u))) return `${browser} is not supported: the Local Browser Bridge needs the chrome.debugger extension API, which only Chromium-based browsers (${BROWSER_NAMES.join(', ')}) offer.`;
  const known = BROWSER_NAMES.includes(b);
  const where = known ? extensionsPage(b) : `your browser's extensions page (${BROWSER_NAMES.filter(n => n !== 'chromium').map(n => extensionsPage(n)).join(', ')})`;
  return `The Local Browser Bridge extension is not connected. If it was never installed, the user does it once: open ${where}, switch on Developer mode, choose "Load unpacked" and pick ${extensionDir}. It then connects by itself, with no sign-in and no prompts.`;
}

// "pid command line" lines, as both PowerShell (below) and ps print them.
export const parseProcessList = text => String(text ?? '').split(/\r?\n/).flatMap(line => {
  const m = /^\s*(\d+)\s+(.*\S)\s*$/.exec(line);
  return m ? [{ pid: Number(m[1]), cmd: m[2] }] : [];
});
export const listCommand = platform => (platform === 'win32'
  ? { file: 'powershell', args: ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.CommandLine)" }'] }
  : { file: 'ps', args: ['-eo', 'pid=,args='] });
export const commandLineCommand = (pid, platform) => (platform === 'win32'
  ? { file: 'powershell', args: ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}").CommandLine`] }
  : { file: 'ps', args: ['-p', String(Number(pid)), '-o', 'args='] });

const fwd = s => s.replaceAll('\\', '/');
// The browser we launched: carries our profile folder and our debug port, and is the main process, not a helper.
export const pickBrowserPid = (processes, name, port) => processes.find(({ cmd }) => {
  const c = fwd(cmd);
  return c.includes('--user-data-dir=') && c.includes(`profile-${name}`) && c.includes(`--remote-debugging-port=${Number(port)}`) && !c.includes('--type=');
})?.pid ?? null;

// Stop a process and what it started. Windows: taskkill on the tree. Elsewhere: the process group (our browser is started
// as a group leader), then the pid itself when it leads none.
export async function killTree(pid, { platform = process.platform, run, kill = process.kill.bind(process) } = {}) {
  if (platform === 'win32') return run('taskkill', ['/PID', String(pid), '/T', '/F']);
  try { kill(-pid, 'SIGTERM'); } catch { kill(pid, 'SIGTERM'); }
}

// The pid on the client side of a loopback connection, from `netstat -ano -p tcp` text: the row whose local port is the
// client's port and whose foreign port is the server's (the listener's own row has the two the other way round).
export function ownerPid(text, clientPort, serverPort) {
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const m = /^\s*TCP\s+\S+:(\d+)\s+\S+:(\d+)\s+\S+\s+(\d+)\s*$/.exec(line);
    if (m && Number(m[1]) === Number(clientPort) && Number(m[2]) === Number(serverPort)) return Number(m[3]);
  }
}

const runCommand = (file, args) => new Promise((resolve, reject) =>
  execFile(file, args, { windowsHide: true, timeout: 2000 }, (err, out) => (err ? reject(err) : resolve(String(out)))));

// The data of one named value in `reg query` text ("    Name    REG_SZ    data"), or nothing.
export function regValue(text, name) {
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const m = /^\s+(.+?)\s+REG_\w+\s+(.*?)\s*$/.exec(line);
    if (m && m[1].toLowerCase() === name.toLowerCase()) return m[2];
  }
}

// The program name (executable file name, no extension, lower case) at the start of a shell open command, or nothing.
export function programFromCommand(command) {
  const m = /^\s*(?:"([^"]+)"|(\S+))/.exec(String(command ?? ''));
  const exe = m && (m[1] ?? m[2]);
  return exe ? path.win32.basename(exe, path.win32.extname(exe)).toLowerCase() || undefined : undefined;
}

// The program that opens http links on this Windows user account (UserChoice ProgId, then that ProgId's open command),
// named like the broker names browsers. Anything else (no key, failure, slow answer, other systems) is nothing.
export async function defaultBrowserProgram({ run = runCommand, timeoutMs = 2000, platform = process.platform } = {}) {
  if (platform !== 'win32') return undefined;
  return withTimeout((async () => {
    const progId = regValue(await run('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice', '/v', 'ProgId']), 'ProgId');
    if (!progId) return undefined;
    return programFromCommand(regValue(await run('reg', ['query', `HKCR\\${progId}\\shell\\open\\command`, '/ve']), '(Default)'));
  })().catch(() => undefined), timeoutMs);
}

// Which program opened a connection to the bridge: its executable's full path, or nothing. Windows only (netstat for the
// owning pid, one PowerShell call for the path, about half a second). Any failure, or no answer within timeoutMs, is nothing.
export async function programOfConnection({ req, remoteAddress, remotePort }, { run = runCommand, timeoutMs = 2000, platform = process.platform } = {}) {
  if (platform !== 'win32' || !remotePort || !/^(::ffff:)?127\./.test(remoteAddress ?? '') && remoteAddress !== '::1') return undefined;
  return withTimeout((async () => {
    const pid = ownerPid(await run('netstat', ['-ano', '-p', 'tcp']), remotePort, req.socket.localPort);
    if (!pid) return undefined;
    const out = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${pid}).Path`]);
    return out.trim() || undefined;
  })().catch(() => undefined), timeoutMs);
}
