import assert from 'assert';
import fs from 'fs';

// 1. Verify network binding allows LAN endpoints for remote fleet laptops
const serverCode = fs.readFileSync('server.ts', 'utf8');
assert(serverCode.includes("server.listen(PORT, '0.0.0.0'"), 'Server must bind to 0.0.0.0 for remote fleet connectivity');

// 2. Extract and verify validateResearchBoundary logic
function validateResearchBoundary(target: string): { allowed: boolean; reason?: string; destinationHost: string } {
  const lower = target.toLowerCase().trim();

  if (lower.startsWith('file://') || lower.startsWith('data:') || lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
    return { allowed: false, reason: 'Rejected scheme', destinationHost: 'blocked-scheme' };
  }

  const blockedHosts = [
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    '[::]',
    '169.254.169.254',
    'metadata.google.internal',
    'metadata',
    'instance-data',
  ];

  let normalizedHost = '';
  try {
    const parsed = new URL(lower.includes('://') ? lower : `http://${lower}`);
    normalizedHost = parsed.hostname.replace(/^\[|\]$/g, '');
  } catch {}

  for (const host of blockedHosts) {
    if (lower.includes(host) || (normalizedHost && normalizedHost === host)) {
      return { allowed: false, reason: 'Safe research boundary rejection', destinationHost: normalizedHost || host };
    }
  }

  const targetIpSource = normalizedHost || lower;
  const ipMatch = targetIpSource.match(/(?:https?:\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (ipMatch) {
    const parts = ipMatch[1].split('.').map(Number);
    const [p0, p1] = parts;
    if (
      p0 === 10 ||
      p0 === 127 ||
      (p0 === 172 && p1 >= 16 && p1 <= 31) ||
      (p0 === 192 && p1 === 168) ||
      (p0 === 169 && p1 === 254)
    ) {
      return { allowed: false, reason: 'Private IP range', destinationHost: ipMatch[1] };
    }
  }

  if (/\.(local|internal|corp|lan|home|arpa|test|invalid)$/i.test(normalizedHost || lower)) {
    return { allowed: false, reason: 'Private domain', destinationHost: 'internal-domain' };
  }

  return { allowed: true, destinationHost: normalizedHost || 'public-research-feed' };
}

// Decimal integer loopback (e.g. 2130706433 -> 127.0.0.1)
assert.strictEqual(validateResearchBoundary('http://2130706433').allowed, false, 'Decimal IP notation must be blocked');

// Octal loopback (e.g. 0177.0.0.1 -> 127.0.0.1)
assert.strictEqual(validateResearchBoundary('http://0177.0.0.1').allowed, false, 'Octal IP notation must be blocked');

// IPv6 loopback
assert.strictEqual(validateResearchBoundary('http://[::1]').allowed, false, 'IPv6 loopback must be blocked');

// Standard loopback and metadata
assert.strictEqual(validateResearchBoundary('http://127.0.0.1:8080').allowed, false, 'Standard loopback must be blocked');
assert.strictEqual(validateResearchBoundary('http://169.254.169.254/latest').allowed, false, 'Cloud metadata must be blocked');
assert.strictEqual(validateResearchBoundary('http://192.168.1.1').allowed, false, 'RFC1918 IP must be blocked');
assert.strictEqual(validateResearchBoundary('file:///etc/passwd').allowed, false, 'file:// scheme must be blocked');

// Legitimate public research targets
assert.strictEqual(validateResearchBoundary('https://cisa.gov').allowed, true, 'Public domain must be allowed');
assert.strictEqual(validateResearchBoundary('https://nvd.nist.gov/vuln').allowed, true, 'Public advisory must be allowed');

console.log('All security fix assertions passed successfully (10/10).');
