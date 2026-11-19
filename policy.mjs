// URL policy: the browser-control server calls checkUrl before any navigation or tool action.
// Blocked always wins. A non-empty allowedDomains turns on strict allowlist mode.
import { readFileSync } from 'node:fs';

const SENSITIVE = [
  'paypal.com', 'stripe.com', 'accounts.google.com', 'login.microsoftonline.com', 'appleid.apple.com',
  '1password.com', 'bitwarden.com', 'lastpass.com', 'coinbase.com', 'binance.com', 'chase.com',
  'bankofamerica.com', 'wellsfargo.com', 'irs.gov', 'console.anthropic.com', 'claude.ai',
];
const BLOCKED_SCHEMES = new Set(['file:', 'chrome:', 'vivaldi:', 'edge:', 'brave:', 'devtools:', 'javascript:', 'chrome-extension:', 'view-source:', 'data:', 'blob:', 'ftp:']);

const hostMatches = (host, pattern) => pattern === '*' || host === pattern || host.endsWith('.' + pattern);

export function loadPolicy(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return { allowedDomains: [], blockedDomains: [] }; }
}

export function checkUrl(raw, policy) {
  let u;
  try { u = new URL(raw); } catch { return { ok: false, reason: `Malformed URL: ${raw}` }; }
  if (raw === 'about:blank') return { ok: true };
  if (BLOCKED_SCHEMES.has(u.protocol) || !/^https?:$/.test(u.protocol)) return { ok: false, reason: `Scheme not allowed: ${u.protocol}` };
  const host = u.hostname.toLowerCase();
  const blocked = [...SENSITIVE, ...(policy.blockedDomains ?? [])];
  if (blocked.some(p => hostMatches(host, p)) || /banking|^bank\./.test(host))
    return { ok: false, reason: `Blocked by policy: ${host}` };
  const allowed = policy.allowedDomains ?? [];
  if (allowed.length && !allowed.some(p => hostMatches(host, p))) return { ok: false, reason: `Not in allowedDomains: ${host}` };
  return { ok: true };
}
