import test from 'node:test';
import assert from 'node:assert/strict';
import { checkUrl } from './policy.mjs';

const open = { allowedDomains: [], blockedDomains: [] };

test('allows ordinary https and local http by default', () => {
  assert.equal(checkUrl('https://example.com/a', open).ok, true);
  assert.equal(checkUrl('http://127.0.0.1:8080/x', open).ok, true);
  assert.equal(checkUrl('about:blank', open).ok, true);
});

test('blocks internal and script schemes', () => {
  for (const u of ['file:///C:/x.txt', 'chrome://settings', 'vivaldi://settings', 'javascript:alert(1)', 'chrome-extension://abc/x.html', 'view-source:https://example.com'])
    assert.equal(checkUrl(u, open).ok, false, u);
});

test('blocks sensitive domains and their subdomains', () => {
  assert.equal(checkUrl('https://paypal.com', open).ok, false);
  assert.equal(checkUrl('https://www.paypal.com/signin', open).ok, false);
  assert.equal(checkUrl('https://onlinebanking.example.com', open).ok, false);
  assert.equal(checkUrl('https://notpaypal.com', open).ok, true);
});

test('allowlist mode permits only listed domains and subdomains', () => {
  const p = { allowedDomains: ['example.com'], blockedDomains: [] };
  assert.equal(checkUrl('https://example.com', p).ok, true);
  assert.equal(checkUrl('https://docs.example.com', p).ok, true);
  assert.equal(checkUrl('https://evilexample.com', p).ok, false);
  assert.equal(checkUrl('about:blank', p).ok, true);
});

test('blocked wins over allowed, user blocklist applies', () => {
  const p = { allowedDomains: ['example.com'], blockedDomains: ['example.com'] };
  assert.equal(checkUrl('https://example.com', p).ok, false);
  assert.equal(checkUrl('https://foo.test', { allowedDomains: [], blockedDomains: ['foo.test'] }).ok, false);
});

test('malformed url is rejected', () => {
  assert.equal(checkUrl('not a url', open).ok, false);
});
