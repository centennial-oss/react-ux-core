// Template text helpers: filling `{{keyword}}` placeholders, finding unknown keywords, counting SMS parts, and
// finding an open "{{" before the caret.

/** A keyword the template may use, written `{{keyword}}`. */
export interface TemplateEditorKeyword {
  keyword: string;
  description: string;
  /** A sample value, used in the example. */
  example: string;
}

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

/** The template with each known keyword replaced by its example; unknown keywords stay as written. */
export function renderTemplate(
  template: string,
  keywords: readonly TemplateEditorKeyword[],
): string {
  const examples = new Map(keywords.map((k) => [k.keyword, k.example]));
  return template.replace(PLACEHOLDER, (match, keyword: string) => examples.get(keyword) ?? match);
}

/** Keywords the template uses that aren't in `keywords`. */
export function unknownKeywords(
  template: string,
  keywords: readonly TemplateEditorKeyword[],
): string[] {
  const known = new Set(keywords.map((k) => k.keyword));
  const unknown = new Set<string>();
  for (const [, keyword = ''] of template.matchAll(PLACEHOLDER)) {
    if (!known.has(keyword)) unknown.add(keyword);
  }
  return [...unknown];
}

/** SMS parts for a message of `length` characters: 160 fit in one; longer messages use 153 per part. */
export function smsParts(length: number): number {
  if (length === 0) return 0;
  return length <= 160 ? 1 : Math.ceil(length / 153);
}

/** An open "{{" before the caret, and what's been typed after it. */
export interface Trigger {
  start: number;
  query: string;
}

export function findTrigger(text: string, caret: number): Trigger | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf('{{');
  if (start < 0) return null;
  const query = before.slice(start + 2);
  return /^[\w.]*$/.test(query) ? { start, query } : null;
}

export function sameTrigger(a: Trigger | null, b: Trigger | null): boolean {
  return a === b || (a !== null && b !== null && a.start === b.start && a.query === b.query);
}
