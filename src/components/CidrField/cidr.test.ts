import { describe, expect, it } from 'vitest';
import { mixedCidrEntries } from '../../../test/cidr';
import {
  cidrContains,
  cidrOverlaps,
  formatIpAddress,
  parseCidr,
  parseIpAddress,
  summarizeCidrs,
  type Cidr,
} from './cidr';
import { checkCidrEntries, splitCidrText } from './cidrChecks';

function valid(text: string, options?: Parameters<typeof parseCidr>[1]): Cidr {
  const result = parseCidr(text, options);
  if (!result.isValid) {
    throw new Error(`${text} should be valid, got ${result.error}`);
  }
  return result.cidr;
}

function errorOf(text: string, options?: Parameters<typeof parseCidr>[1]) {
  const result = parseCidr(text, options);
  return result.isValid ? undefined : result.error;
}

describe('parseIpAddress / formatIpAddress', () => {
  it('parses dotted IPv4 and rejects bad octets and leading zeros', () => {
    expect(parseIpAddress('192.0.2.1')).toEqual({ family: 'ipv4', value: 0xc0000201n });
    expect(parseIpAddress('256.0.0.1')).toBeUndefined();
    expect(parseIpAddress('1.2.3')).toBeUndefined();
    expect(parseIpAddress('01.2.3.4')).toBeUndefined();
    expect(parseIpAddress('1.2.3.4.5')).toBeUndefined();
  });

  it('parses IPv6 with ::, embedded IPv4 and mixed case, and rejects zones and bad groups', () => {
    expect(parseIpAddress('::')).toEqual({ family: 'ipv6', value: 0n });
    expect(parseIpAddress('::1')).toEqual({ family: 'ipv6', value: 1n });
    expect(parseIpAddress('2001:DB8::1')?.value).toBe(0x20010db8000000000000000000000001n);
    expect(parseIpAddress('::ffff:192.0.2.1')?.value).toBe(0xffffc0000201n);
    expect(parseIpAddress('1:2:3:4:5:6:7:8')?.family).toBe('ipv6');
    expect(parseIpAddress('1:2:3:4:5:6:7')).toBeUndefined();
    expect(parseIpAddress('1::2::3')).toBeUndefined();
    expect(parseIpAddress('fe80::1%eth0')).toBeUndefined();
    expect(parseIpAddress('12345::')).toBeUndefined();
    expect(parseIpAddress('1:2:3:4:5:6:7:8:9')).toBeUndefined();
  });

  it('formats IPv6 per RFC 5952', () => {
    const format = (text: string) => {
      const address = parseIpAddress(text);
      return address && formatIpAddress(address.family, address.value);
    };
    expect(format('2001:0DB8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
    expect(format('2001:db8:0:0:1:0:0:1')).toBe('2001:db8::1:0:0:1');
    expect(format('2001:db8:0:1:1:1:1:1')).toBe('2001:db8:0:1:1:1:1:1');
    expect(format('0:0:0:0:0:0:0:0')).toBe('::');
    expect(format('1:0:0:0:0:0:0:0')).toBe('1::');
    expect(format('2001:0:0:1:0:0:0:1')).toBe('2001:0:0:1::1');
  });
});

describe('parseCidr', () => {
  it('normalises host bits and describes the range', () => {
    const cidr = valid('10.0.0.5/8');
    expect(cidr.text).toBe('10.0.0.0/8');
    expect(cidr.hasHostBits).toBe(true);
    expect(cidr.firstAddress).toBe('10.0.0.0');
    expect(cidr.lastAddress).toBe('10.255.255.255');
    expect(cidr.size).toBe(16_777_216n);
    expect(valid(' 10.0.0.0/8 ').hasHostBits).toBe(false);
  });

  it('handles IPv6 with exact BigInt counts', () => {
    const cidr = valid('2001:db8::1/64');
    expect(cidr.text).toBe('2001:db8::/64');
    expect(cidr.lastAddress).toBe('2001:db8::ffff:ffff:ffff:ffff');
    expect(cidr.size).toBe(18_446_744_073_709_551_616n);
    expect(valid('::/0').size).toBe(1n << 128n);
  });

  it('turns bare addresses into /32 or /128 unless allowsHost is false', () => {
    expect(valid('203.0.113.7').text).toBe('203.0.113.7/32');
    expect(valid('203.0.113.7').isBareAddress).toBe(true);
    expect(valid('2620:fe::fe').text).toBe('2620:fe::fe/128');
    expect(errorOf('203.0.113.7', { allowsHost: false })).toBe('missingPrefix');
  });

  it('reports why input is invalid', () => {
    expect(errorOf('')).toBe('empty');
    expect(errorOf('   ')).toBe('empty');
    expect(errorOf('example.com/8')).toBe('invalidAddress');
    expect(errorOf('10.0.0.0/33')).toBe('invalidPrefix');
    expect(errorOf('10.0.0.0/')).toBe('invalidPrefix');
    expect(errorOf('10.0.0.0/08')).toBe('invalidPrefix');
    expect(errorOf('2001:db8::/129')).toBe('invalidPrefix');
    expect(errorOf('2001:db8::/32', { family: 'ipv4' })).toBe('wrongFamily');
    expect(errorOf('10.0.0.0/8', { family: 'ipv6' })).toBe('wrongFamily');
  });
});

describe('cidrContains / cidrOverlaps', () => {
  it('checks nesting of blocks and addresses, by family', () => {
    expect(cidrContains('10.0.0.0/8', '10.20.0.0/16')).toBe(true);
    expect(cidrContains('10.20.0.0/16', '10.0.0.0/8')).toBe(false);
    expect(cidrContains('10.0.0.0/8', '10.1.2.3')).toBe(true);
    expect(cidrContains('10.0.0.0/8', '11.0.0.0')).toBe(false);
    expect(cidrContains('0.0.0.0/0', '::1')).toBe(false);
    expect(cidrContains('2001:db8::/32', '2001:db8:1::/48')).toBe(true);
    expect(cidrContains('nonsense', '10.0.0.0/8')).toBe(false);
    expect(cidrOverlaps('10.20.0.0/16', '10.0.0.0/8')).toBe(true);
    expect(cidrOverlaps('192.168.1.0/25', '192.168.1.128/25')).toBe(false);
  });
});

describe('summarizeCidrs', () => {
  it('merges adjacent halves, drops nested blocks and duplicates, and sorts IPv4 first', () => {
    expect(summarizeCidrs(['192.168.1.128/25', '192.168.1.0/25'])).toEqual(['192.168.1.0/24']);
    expect(
      summarizeCidrs(['10.0.0.0/26', '10.0.0.64/26', '10.0.0.128/25', '10.0.0.7', '10.0.0.0/26']),
    ).toEqual(['10.0.0.0/24']);
    expect(summarizeCidrs(['2001:db8::/33', '2001:db8:8000::/33', '10.0.0.0/8'])).toEqual([
      '10.0.0.0/8',
      '2001:db8::/32',
    ]);
    // Neighbours that aren't two halves of one block stay apart.
    expect(summarizeCidrs(['10.0.0.128/25', '10.0.1.0/25'])).toEqual([
      '10.0.0.128/25',
      '10.0.1.0/25',
    ]);
    expect(summarizeCidrs(['0.0.0.0/1', '128.0.0.0/1'])).toEqual(['0.0.0.0/0']);
    expect(summarizeCidrs(['bad', '10.0.0.0/8'])).toEqual(['10.0.0.0/8']);
  });
});

describe('checkCidrEntries', () => {
  it('flags 2 overlaps and 1 invalid entry in the 20 mixed entries, on both entries of each pair', () => {
    const check = checkCidrEntries(mixedCidrEntries);
    expect(check.overlapCount).toBe(2);
    expect(check.duplicateCount).toBe(0);
    expect(check.invalidCount).toBe(1);
    expect(check.entries[0]?.issues).toEqual([
      { kind: 'covers', otherIndex: 1, other: '10.20.0.0/16' },
    ]);
    expect(check.entries[1]?.issues).toEqual([
      { kind: 'coveredBy', otherIndex: 0, other: '10.0.0.0/8' },
    ]);
    expect(check.entries[8]?.issues[0]?.kind).toBe('coveredBy');
    expect(check.entries[13]?.result.isValid).toBe(false);
    // Merging leaves the 17 valid blocks less the 2 nested ones, with the /25 pair as one /24.
    const merged = summarizeCidrs(mixedCidrEntries);
    expect(merged).toContain('192.168.1.0/24');
    expect(merged).toHaveLength(16);
  });

  it('flags duplicates on both entries, and skips the checks when asked', () => {
    const check = checkCidrEntries(['10.0.0.0/8', '10.0.0.9/8']);
    expect(check.duplicateCount).toBe(1);
    expect(check.entries[1]?.issues).toEqual([
      { kind: 'duplicate', otherIndex: 0, other: '10.0.0.0/8' },
    ]);
    expect(checkCidrEntries(['10.0.0.0/8', '10.0.0.0/8'], 'both', false).duplicateCount).toBe(0);
  });

  it('splits pasted text on lines, commas and spaces', () => {
    expect(splitCidrText('10.0.0.0/8\n 2001:db8::/32,192.0.2.1 ;\r\n\n')).toEqual([
      '10.0.0.0/8',
      '2001:db8::/32',
      '192.0.2.1',
    ]);
  });
});
