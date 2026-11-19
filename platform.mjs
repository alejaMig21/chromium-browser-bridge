// Everything that differs by operating system lives here, with the platform as a parameter so Windows, macOS and
// Linux can all be tested from any machine. Pure functions answer "where" and "which command"; killTree is the only
// one that acts, and it takes the way to run a command and to send a signal as parameters too.
import path from 'node:path';
import { homedir } from 'node:os';

export const BROWSER_NAMES = ['chrome', 'edge', 'brave', 'opera', 'vivaldi', 'chromium'];

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
