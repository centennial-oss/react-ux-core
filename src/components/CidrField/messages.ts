import type { IpFamily } from './cidr';

/** Strings for CidrField and CidrList. */
export interface CidrFieldMessages {
  /** The input's placeholder for the families it accepts. */
  cidrPlaceholder: (params: { family: IpFamily | 'both' }) => string;
  /** Under a valid block: its range and size. `count` is formatted; `size` is the exact number, for plurals. */
  cidrRange: (params: { first: string; last: string; count: string; size: bigint }) => string;
  /** Under a /32 or /128. */
  cidrSingleAddress: (params: { address: string }) => string;
  /** Shown and announced after host bits are cleared ("10.0.0.5/8" → "10.0.0.0/8"). */
  cidrNormalized: (params: { from: string; to: string }) => string;
  /** Shown and announced after a bare address gets a /32 or /128. */
  cidrHostExpanded: (params: { from: string; to: string }) => string;
  cidrInvalidAddress: string;
  /** The prefix is out of range for the family. */
  cidrInvalidPrefix: (params: { max: number }) => string;
  /** A bare address where a prefix is required (`allowsHost` is false). */
  cidrMissingPrefix: string;
  /** The block is the wrong family for the field. */
  cidrIpv4Only: string;
  cidrIpv6Only: string;
  /** CidrList: the field that adds entries, and its hint. */
  cidrListAddLabel: string;
  cidrListAddHint: string;
  cidrListAdd: string;
  /** Names an entry's field ("Range 3"). */
  cidrEntry: (params: { index: number }) => string;
  /** An entry's remove button. */
  cidrRemove: (params: { cidr: string }) => string;
  /** Problems an entry has with another. */
  cidrDuplicate: (params: { other: string }) => string;
  cidrCoveredBy: (params: { other: string }) => string;
  cidrCovers: (params: { other: string }) => string;
  /** The list's status line. */
  cidrListSummary: (params: {
    count: number;
    overlaps: number;
    duplicates: number;
    invalid: number;
  }) => string;
  /** The button that combines overlapping, duplicate and adjacent ranges. */
  cidrMerge: (params: { from: number; to: number }) => string;
  /** Announcements. */
  cidrListMerged: (params: { from: number; to: number }) => string;
  cidrListAdded: (params: { count: number; normalized: number; invalid: number }) => string;
  cidrListRemoved: (params: { cidr: string }) => string;
  /** The limit, under the add field. */
  cidrListMax: (params: { max: number }) => string;
  /** Announced instead of `cidrListAdded` when a paste goes past the limit. */
  cidrListTooMany: (params: { added: number; skipped: number; max: number }) => string;
}

const plural = (count: number, one: string, other: string) =>
  `${String(count)} ${count === 1 ? one : other}`;

/** English defaults of CidrField's and CidrList's strings. */
export const defaultCidrFieldMessages: CidrFieldMessages = {
  cidrPlaceholder: ({ family }) =>
    family === 'ipv4'
      ? '10.0.0.0/8'
      : family === 'ipv6'
        ? '2001:db8::/32'
        : '10.0.0.0/8 or 2001:db8::/32',
  cidrRange: ({ first, last, count, size }) =>
    `${first} – ${last}, ${count} ${size === 1n ? 'address' : 'addresses'}`,
  cidrSingleAddress: ({ address }) => `${address}, a single address`,
  cidrNormalized: ({ from, to }) => `Changed ${from} to ${to}, the start of its range.`,
  cidrHostExpanded: ({ from, to }) => `Saved ${from} as ${to}, a single address.`,
  cidrInvalidAddress: 'Enter an IP address and prefix, such as 10.0.0.0/8.',
  cidrInvalidPrefix: ({ max }) => `The prefix must be a number from 0 to ${String(max)}.`,
  cidrMissingPrefix: 'Add a prefix length, such as /24.',
  cidrIpv4Only: 'Enter an IPv4 range.',
  cidrIpv6Only: 'Enter an IPv6 range.',
  cidrListAddLabel: 'Add ranges',
  cidrListAddHint: 'Paste several at once, one per line.',
  cidrListAdd: 'Add',
  cidrEntry: ({ index }) => `Range ${String(index)}`,
  cidrRemove: ({ cidr }) => `Remove ${cidr}`,
  cidrDuplicate: ({ other }) => `Duplicate of ${other}`,
  cidrCoveredBy: ({ other }) => `Already covered by ${other}`,
  cidrCovers: ({ other }) => `Also covers ${other}`,
  cidrListSummary: ({ count, overlaps, duplicates, invalid }) =>
    [
      plural(count, 'range', 'ranges'),
      overlaps > 0 ? plural(overlaps, 'overlap', 'overlaps') : '',
      duplicates > 0 ? plural(duplicates, 'duplicate', 'duplicates') : '',
      invalid > 0 ? `${String(invalid)} invalid` : '',
    ]
      .filter(Boolean)
      .join(', '),
  cidrMerge: ({ from, to }) => `Merge ${String(from)} ranges into ${String(to)}`,
  cidrListMerged: ({ from, to }) => `Merged ${String(from)} ranges into ${String(to)}.`,
  cidrListAdded: ({ count, normalized, invalid }) =>
    [
      `Added ${plural(count, 'range', 'ranges')}.`,
      normalized > 0 ? `${String(normalized)} normalised.` : '',
      invalid > 0 ? `${String(invalid)} invalid.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  cidrListRemoved: ({ cidr }) => `Removed ${cidr}.`,
  cidrListMax: ({ max }) => `Up to ${String(max)} ranges.`,
  cidrListTooMany: ({ added, skipped, max }) =>
    `Added ${plural(added, 'range', 'ranges')}. ${plural(skipped, 'range was', 'ranges were')} not added: the limit is ${String(max)}.`,
};
