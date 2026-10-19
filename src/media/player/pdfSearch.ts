// Text search over a PDF page's text items. pdf.js splits a page's text into runs (one per text-layer span); a match
// can cross runs, so each match is a list of parts, one per run it touches. Runs that end a line count as followed
// by a space, so a phrase broken over two lines still matches.

/** One run's share of a match: characters `[start, end)` of text item `item`. */
export interface PdfMatchPart {
  item: number;
  start: number;
  end: number;
}

export interface PdfMatch {
  page: number;
  parts: PdfMatchPart[];
}

/** A page's text runs, as the text layer lays them out. */
export interface PdfPageText {
  items: readonly string[];
  /** Whether each run ends a line. */
  endsLine?: readonly boolean[];
}

/** Lower-cases text, so "INV-0042" and "inv-0042" match. */
function fold(text: string): string {
  return text.toLocaleLowerCase();
}

/** Every match of `query` on a page (case-insensitive, whitespace-tolerant). */
export function findPageMatches(page: number, text: PdfPageText, query: string): PdfMatch[] {
  const needle = fold(query.trim()).replace(/\s+/g, ' ');
  if (needle === '') {
    return [];
  }
  // The page as one string, with each character's run and offset, collapsing whitespace as we go.
  let haystack = '';
  const owners: { item: number; offset: number }[] = [];
  text.items.forEach((item, index) => {
    for (let offset = 0; offset < item.length; offset += 1) {
      // Character by character, so offsets stay those of the run even where lower-casing changes a length.
      const char = fold(item[offset] ?? '').charAt(0);
      if (/\s/.test(char)) {
        if (haystack.endsWith(' ')) {
          continue;
        }
        haystack += ' ';
      } else {
        haystack += char;
      }
      owners.push({ item: index, offset });
    }
    if (text.endsLine?.[index] && !haystack.endsWith(' ')) {
      haystack += ' ';
      owners.push({ item: -1, offset: 0 });
    }
  });

  const matches: PdfMatch[] = [];
  let from = haystack.indexOf(needle);
  while (from !== -1) {
    const parts: PdfMatchPart[] = [];
    for (let position = from; position < from + needle.length; position += 1) {
      const owner = owners[position];
      if (!owner || owner.item < 0) {
        continue;
      }
      const last = parts[parts.length - 1];
      if (last?.item === owner.item) {
        // The same run (extending over any whitespace that was collapsed).
        last.end = owner.offset + 1;
      } else {
        parts.push({ item: owner.item, start: owner.offset, end: owner.offset + 1 });
      }
    }
    if (parts.length > 0) {
      matches.push({ page, parts });
    }
    from = haystack.indexOf(needle, from + needle.length);
  }
  return matches;
}
