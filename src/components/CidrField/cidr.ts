// CIDR parsing and arithmetic for IPv4 and IPv6. Addresses are bigints (32 or 128 bits), so IPv6 ranges and counts
// are exact. Used by CidrField and CidrList, and exported for apps (allowlist checks, rule builders).

export type IpFamily = 'ipv4' | 'ipv6';

/** Which families a field or parser accepts. */
export type CidrFamily = IpFamily | 'both';

/** An IP address as a number. */
export interface IpAddress {
  family: IpFamily;
  /** The address as a 32-bit (IPv4) or 128-bit (IPv6) number. */
  value: bigint;
}

/** A parsed, normalised CIDR block. */
export interface Cidr {
  family: IpFamily;
  /** The network (first) address as a number, with the host bits cleared. */
  network: bigint;
  /** The prefix length: 0–32 for IPv4, 0–128 for IPv6. */
  prefix: number;
  /** The canonical text, such as `10.0.0.0/8` or `2001:db8::/32`. */
  text: string;
  /** The first and last addresses of the range, as text. */
  firstAddress: string;
  lastAddress: string;
  /** How many addresses the range holds. */
  size: bigint;
  /** The input had host bits set, so it was normalised (`10.0.0.5/8` became `10.0.0.0/8`). */
  hasHostBits: boolean;
  /** The input was a bare address, made a /32 or /128. */
  isBareAddress: boolean;
}

/** Why a text isn't a valid CIDR block. */
export type CidrError =
  'empty' | 'invalidAddress' | 'invalidPrefix' | 'missingPrefix' | 'wrongFamily';

export type CidrParseResult =
  { isValid: true; cidr: Cidr } | { isValid: false; error: CidrError; family?: IpFamily };

export interface ParseCidrOptions {
  /** Defaults to `both`. */
  family?: CidrFamily;
  /** Accepts a bare address as a /32 or /128. Defaults to true. */
  allowsHost?: boolean;
}

const WIDTH: Record<IpFamily, number> = { ipv4: 32, ipv6: 128 };

function allOnes(family: IpFamily): bigint {
  return (1n << BigInt(WIDTH[family])) - 1n;
}

function hostMask(family: IpFamily, prefix: number): bigint {
  return (1n << BigInt(WIDTH[family] - prefix)) - 1n;
}

function parseIpv4(text: string): bigint | undefined {
  const parts = text.split('.');
  if (parts.length !== 4) {
    return undefined;
  }
  let value = 0n;
  for (const part of parts) {
    // Decimal octets only; a leading zero ("010") is ambiguous (octal in some tools), so it's rejected.
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) {
      return undefined;
    }
    const octet = Number(part);
    if (octet > 255) {
      return undefined;
    }
    value = (value << 8n) | BigInt(octet);
  }
  return value;
}

function parseIpv6Groups(text: string): number[] | undefined {
  if (text === '') {
    return [];
  }
  const groups: number[] = [];
  const parts = text.split(':');
  for (const [index, part] of parts.entries()) {
    // An embedded IPv4 address may end the address ("::ffff:192.0.2.1").
    if (index === parts.length - 1 && part.includes('.')) {
      const v4 = parseIpv4(part);
      if (v4 === undefined) {
        return undefined;
      }
      groups.push(Number(v4 >> 16n), Number(v4 & 0xffffn));
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/i.test(part)) {
      return undefined;
    }
    groups.push(parseInt(part, 16));
  }
  return groups;
}

function parseIpv6(text: string): bigint | undefined {
  const halves = text.split('::');
  if (halves.length > 2) {
    return undefined;
  }
  const head = parseIpv6Groups(halves[0] ?? '');
  const tail = halves.length === 2 ? parseIpv6Groups(halves[1] ?? '') : [];
  if (!head || !tail) {
    return undefined;
  }
  const count = head.length + tail.length;
  if (halves.length === 1 ? count !== 8 : count > 7) {
    return undefined;
  }
  const groups = [...head, ...Array<number>(8 - count).fill(0), ...tail];
  return groups.reduce((value, group) => (value << 16n) | BigInt(group), 0n);
}

/** Parses an IPv4 or IPv6 address (no prefix, no zone). */
export function parseIpAddress(text: string): IpAddress | undefined {
  const trimmed = text.trim();
  if (trimmed.includes(':')) {
    const value = parseIpv6(trimmed);
    return value === undefined ? undefined : { family: 'ipv6', value };
  }
  const value = parseIpv4(trimmed);
  return value === undefined ? undefined : { family: 'ipv4', value };
}

/** Formats an address: dotted decimal for IPv4, RFC 5952 (lower case, longest zero run as `::`) for IPv6. */
export function formatIpAddress(family: IpFamily, value: bigint): string {
  if (family === 'ipv4') {
    return [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 0xffn)).join('.');
  }
  const groups = [112n, 96n, 80n, 64n, 48n, 32n, 16n, 0n].map((shift) =>
    Number((value >> shift) & 0xffffn),
  );
  // The longest run of two or more zero groups (the first, on a tie) becomes "::".
  let bestStart = -1;
  let bestLength = 1;
  for (let start = 0; start < 8; start++) {
    let length = 0;
    while (start + length < 8 && groups[start + length] === 0) {
      length++;
    }
    if (length > bestLength) {
      bestStart = start;
      bestLength = length;
    }
  }
  const hex = groups.map((group) => group.toString(16));
  if (bestStart < 0) {
    return hex.join(':');
  }
  return `${hex.slice(0, bestStart).join(':')}::${hex.slice(bestStart + bestLength).join(':')}`;
}

function makeCidr(family: IpFamily, address: bigint, prefix: number, isBareAddress: boolean): Cidr {
  const host = hostMask(family, prefix);
  const network = address & (allOnes(family) ^ host);
  const firstAddress = formatIpAddress(family, network);
  return {
    family,
    network,
    prefix,
    text: `${firstAddress}/${String(prefix)}`,
    firstAddress,
    lastAddress: formatIpAddress(family, network | host),
    size: host + 1n,
    hasHostBits: network !== address,
    isBareAddress,
  };
}

/**
 * Parses a CIDR block such as `10.0.0.0/8` or `2001:db8::/32`, normalising host bits (`10.0.0.5/8` becomes
 * `10.0.0.0/8`, with `hasHostBits` set). A bare address becomes a /32 or /128 unless `allowsHost` is false.
 */
export function parseCidr(text: string, options: ParseCidrOptions = {}): CidrParseResult {
  const { family: allowed = 'both', allowsHost = true } = options;
  const trimmed = text.trim();
  if (trimmed === '') {
    return { isValid: false, error: 'empty' };
  }
  const slash = trimmed.indexOf('/');
  const addressText = slash < 0 ? trimmed : trimmed.slice(0, slash);
  const address = parseIpAddress(addressText);
  if (!address) {
    return { isValid: false, error: 'invalidAddress' };
  }
  const { family } = address;
  if (allowed !== 'both' && allowed !== family) {
    return { isValid: false, error: 'wrongFamily', family };
  }
  if (slash < 0) {
    return allowsHost
      ? { isValid: true, cidr: makeCidr(family, address.value, WIDTH[family], true) }
      : { isValid: false, error: 'missingPrefix', family };
  }
  const prefixText = trimmed.slice(slash + 1);
  const prefix = Number(prefixText);
  if (!/^(0|[1-9]\d{0,2})$/.test(prefixText) || prefix > WIDTH[family]) {
    return { isValid: false, error: 'invalidPrefix', family };
  }
  return { isValid: true, cidr: makeCidr(family, address.value, prefix, false) };
}

/** The longest prefix for a family: 32 or 128. */
export function maxPrefix(family: IpFamily): number {
  return WIDTH[family];
}

function toCidr(value: string | Cidr): Cidr | undefined {
  if (typeof value !== 'string') {
    return value;
  }
  const result = parseCidr(value);
  return result.isValid ? result.cidr : undefined;
}

/** Whether `outer` holds all of `inner` (a block or a bare address). Invalid input and mixed families are false. */
export function cidrContains(outer: string | Cidr, inner: string | Cidr): boolean {
  const a = toCidr(outer);
  const b = toCidr(inner);
  if (a === undefined || b === undefined) {
    return false;
  }
  if (a.family !== b.family || a.prefix > b.prefix) {
    return false;
  }
  return (b.network & (allOnes(a.family) ^ hostMask(a.family, a.prefix))) === a.network;
}

/** Whether two blocks share any address. CIDR blocks either nest or are disjoint, so this is containment either way. */
export function cidrOverlaps(a: string | Cidr, b: string | Cidr): boolean {
  return cidrContains(a, b) || cidrContains(b, a);
}

/** Orders blocks by family (IPv4 first), then network address, then prefix (wider first). */
export function compareCidrs(a: Cidr, b: Cidr): number {
  if (a.family !== b.family) {
    return a.family === 'ipv4' ? -1 : 1;
  }
  if (a.network !== b.network) {
    return a.network < b.network ? -1 : 1;
  }
  return a.prefix - b.prefix;
}

/**
 * The smallest set of blocks that covers exactly the same addresses (route summarisation): duplicates and nested
 * blocks are dropped and adjacent siblings merge (`10.0.0.0/25` + `10.0.0.128/25` → `10.0.0.0/24`). Invalid entries
 * are ignored. The result is sorted, IPv4 first, as canonical text.
 */
export function summarizeCidrs(cidrs: Iterable<string | Cidr>): string[] {
  const sorted = [...cidrs]
    .map(toCidr)
    .filter((cidr): cidr is Cidr => cidr !== undefined)
    .sort(compareCidrs);
  const stack: Cidr[] = [];
  for (const cidr of sorted) {
    const top = stack.at(-1);
    if (top && cidrContains(top, cidr)) {
      continue;
    }
    stack.push(cidr);
    // Merge the top two while they're the two halves of a wider block.
    for (;;) {
      const right = stack.at(-1);
      const left = stack.at(-2);
      if (left === undefined || right === undefined) {
        break;
      }
      if (left.family !== right.family || left.prefix !== right.prefix) {
        break;
      }
      const prefix = left.prefix - 1;
      if (prefix < 0) {
        break;
      }
      const parent = makeCidr(left.family, left.network, prefix, false);
      if (parent.network !== left.network || left.network + left.size !== right.network) {
        break;
      }
      stack.splice(-2, 2, parent);
    }
  }
  return stack.map((cidr) => cidr.text);
}
