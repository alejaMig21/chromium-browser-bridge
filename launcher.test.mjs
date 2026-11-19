import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBrowser, launchArgs, ownsProcess } from './launcher.mjs';

test('resolves known browser names and explicit paths', () => {
  assert.match(resolveBrowser('vivaldi', () => true).exe, /vivaldi\.exe$/i);
  assert.equal(resolveBrowser('chrome', () => true).name, 'chrome');
  assert.equal(resolveBrowser('C:/x/mybrowser.exe', () => true).name, 'mybrowser');
});

test('on macOS and Linux a known browser is found in that system\'s usual places', () => {
  assert.equal(resolveBrowser('chrome', p => p === '/usr/bin/google-chrome', { platform: 'linux' }).exe, '/usr/bin/google-chrome');
  assert.equal(resolveBrowser('brave', p => p === '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', { platform: 'darwin', home: '/Users/me' }).name, 'brave');
  assert.throws(() => resolveBrowser('vivaldi', () => false, { platform: 'darwin', home: '/Users/me' }), /Applications.Vivaldi\.app/);
  assert.equal(resolveBrowser('/Applications/Arc.app/Contents/MacOS/Arc', () => true, { platform: 'darwin' }).name, 'Arc', 'an explicit path keeps its own name');
});

test('throws when the browser executable is missing', () => {
  assert.throws(() => resolveBrowser('brave', () => false), /not found/i);
});

test('launch args: dedicated profile per browser, loopback-only debug port', () => {
  const a = launchArgs({ name: 'vivaldi', port: 9222, root: 'D:/p', headless: false });
  assert.ok(a.includes('--user-data-dir=D:/p/profile-vivaldi'));
  assert.ok(a.includes('--remote-debugging-port=9222'));
  assert.ok(a.includes('--remote-debugging-address=127.0.0.1'));
  assert.ok(!a.includes('--headless=new'));
  assert.ok(launchArgs({ name: 'chrome', port: 9223, root: 'D:/p', headless: true }).includes('--headless=new'));
});

test('ownsProcess only accepts a command line that uses our profile dir', () => {
  const root = 'D:/p';
  assert.equal(ownsProcess('"vivaldi.exe" --user-data-dir=D:/p/profile-vivaldi --remote-debugging-port=9222', 'vivaldi', root), true);
  assert.equal(ownsProcess('"vivaldi.exe" --single-argument https://x', 'vivaldi', root), false);
  assert.equal(ownsProcess('"vivaldi.exe" --user-data-dir=C:/Users/me/AppData/Local/Vivaldi/User Data', 'vivaldi', root), false);
});

