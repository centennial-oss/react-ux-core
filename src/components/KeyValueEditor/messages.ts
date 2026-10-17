/** Strings for KeyValueEditor. */
export interface KeyValueEditorMessages {
  /** The key column's default heading. */
  kvKey: string;
  /** The add button's default text. */
  kvAdd: string;
  /** Names a row without a key ("Row 3"); rows with a key are named by it. */
  kvRow: (params: { index: number }) => string;
  /** A row's remove button ("Remove header Accept"); `label` is the key column's heading. */
  kvRemove: (params: { label: string; key: string }) => string;
  /** A row's secret toggle (pressed while the value is masked). */
  kvSecretToggle: (params: { key: string }) => string;
  /** A secret value's show and hide buttons. */
  kvShowValue: (params: { key: string }) => string;
  kvHideValue: (params: { key: string }) => string;
  /** Row errors. */
  kvDuplicateKey: (params: { key: string }) => string;
  kvKeyRequired: string;
  /** The limit, under the add button. */
  kvMaxRows: (params: { max: number }) => string;
  /** Announcements. */
  kvAdded: (params: { index: number }) => string;
  kvRemoved: (params: { item: string }) => string;
  kvPasted: (params: { count: number }) => string;
  /** Announced when a paste goes past `maxRows`. */
  kvPastedTooMany: (params: { count: number; skipped: number; max: number }) => string;
}

/** English defaults of KeyValueEditor's strings. */
export const defaultKeyValueEditorMessages: KeyValueEditorMessages = {
  kvKey: 'Key',
  kvAdd: 'Add row',
  kvRow: ({ index }) => `Row ${String(index)}`,
  kvRemove: ({ label, key }) => `Remove ${label.toLocaleLowerCase()} ${key}`,
  kvSecretToggle: ({ key }) => `Treat ${key} as a secret`,
  kvShowValue: ({ key }) => `Show value of ${key}`,
  kvHideValue: ({ key }) => `Hide value of ${key}`,
  kvDuplicateKey: ({ key }) => `${key} is used more than once`,
  kvKeyRequired: 'Enter a key for this value',
  kvMaxRows: ({ max }) => `Up to ${String(max)} rows.`,
  kvAdded: ({ index }) => `Row ${String(index)} added.`,
  kvRemoved: ({ item }) => `Removed ${item}.`,
  kvPasted: ({ count }) => `Pasted ${String(count)} ${count === 1 ? 'row' : 'rows'}.`,
  kvPastedTooMany: ({ count, skipped, max }) =>
    `Pasted ${String(count)} ${count === 1 ? 'row' : 'rows'}. ${String(skipped)} more didn’t fit: the limit is ${String(max)}.`,
};
