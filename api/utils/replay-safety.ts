/**
 * Replay safety - block SSRF and replay loops
 *
 * WHY: Replay can be abused to hit internal services (localhost, 10.x, etc.)
 *     Block private/local IPs by default. Optional domain allowlist.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

const PRIVATE_IP_PATTERNS = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^169\.254\./,              // link-local
  /^127\./,                   // loopback
  /^fc00:/i,                  // IPv6 private
  /^fe80:/i,                  // IPv6 link-local
];

export function isUrlSafeForReplay(url: string, allowlist: string[] = []): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname?.toLowerCase() ?? '';

    if (BLOCKED_HOSTS.has(hostname)) return false;

    for (const domain of allowlist) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return true;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    if (PRIVATE_IP_PATTERNS.some((re) => re.test(hostname))) return false;

    return true;
  } catch {
    return false;
  }
}
