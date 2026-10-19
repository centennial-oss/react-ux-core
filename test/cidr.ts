// Shared CIDR fixtures for CidrField and CidrList tests and stories (documentation ranges and well-known blocks).

/**
 * 20 mixed IPv4/IPv6 entries: two overlaps (10.20.0.0/16 inside 10.0.0.0/8, and 2001:db8:1::/48 inside
 * 2001:db8::/32), one invalid entry (999.1.1.1/24), and two adjacent /25s that merge into a /24.
 */
export const mixedCidrEntries = [
  '10.0.0.0/8',
  '10.20.0.0/16',
  '192.168.1.0/25',
  '192.168.1.128/25',
  '172.16.0.0/12',
  '203.0.113.7',
  '198.51.100.0/24',
  '2001:db8::/32',
  '2001:db8:1::/48',
  '2400:cb00::/32',
  'fd00::/8',
  '2606:4700::/32',
  '100.64.0.0/10',
  '999.1.1.1/24',
  '169.254.0.0/16',
  '2a00:1450::/32',
  '192.0.2.0/24',
  '2001:4860::/32',
  '8.8.4.0/24',
  '2620:fe::fe',
] as const;

/** The same entries as pasted text, one per line. */
export const mixedCidrText = mixedCidrEntries.join('\n');
