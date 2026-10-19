// Parses pasted `KEY=value` lines: a .env file (comments, `export`, quoted and multi-line values) or HTTP-style
// `Name: value` lines.

export interface ParsedKeyValue {
  key: string;
  value: string;
}

const ESCAPES: Readonly<Record<string, string>> = { n: '\n', r: '\r', t: '\t' };

/** Reads a double-quoted value starting after its opening quote; returns the value and where it ended. */
function readDoubleQuoted(text: string, start: number): { value: string; end: number } {
  let value = '';
  let index = start;
  while (index < text.length) {
    const char = text.charAt(index);
    if (char === '\\' && index + 1 < text.length) {
      const next = text.charAt(index + 1);
      value += ESCAPES[next] ?? next;
      index += 2;
      continue;
    }
    if (char === '"') {
      return { value, end: index + 1 };
    }
    value += char;
    index++;
  }
  return { value, end: index };
}

/** The rest of the line after `index`. */
function lineEnd(text: string, index: number): number {
  const newline = text.indexOf('\n', index);
  return newline < 0 ? text.length : newline;
}

/**
 * Parses `KEY=value` lines (a .env block) into pairs. Blank lines and `#` comments are skipped, `export ` is dropped,
 * values may be quoted (double quotes allow escapes and line breaks; single quotes are literal), and unquoted values
 * lose a trailing ` # comment`. Lines without `=` but in `Name: value` form (HTTP headers) are read too; any other
 * line is a key with an empty value.
 */
export function parseKeyValueText(text: string): ParsedKeyValue[] {
  const source = text.replace(/\r\n?/g, '\n');
  const pairs: ParsedKeyValue[] = [];
  let index = 0;
  while (index < source.length) {
    const end = lineEnd(source, index);
    const line = source.slice(index, end).trim();
    if (line === '' || line.startsWith('#')) {
      index = end + 1;
      continue;
    }
    const body = line.replace(/^export\s+/, '');
    const equals = body.indexOf('=');
    if (equals < 0) {
      const header = /^([^\s:]+)\s*:\s*(.*)$/.exec(body);
      pairs.push(
        header ? { key: header[1] ?? '', value: header[2] ?? '' } : { key: body, value: '' },
      );
      index = end + 1;
      continue;
    }
    const key = body.slice(0, equals).trim();
    const rest = body.slice(equals + 1).trimStart();
    if (rest.startsWith('"')) {
      // A double-quoted value may run onto the following lines: read from the source, not the line.
      const valueStart = source.indexOf('"', source.indexOf('=', index)) + 1;
      const quoted = readDoubleQuoted(source, valueStart);
      pairs.push({ key, value: quoted.value });
      index = lineEnd(source, quoted.end) + 1;
      continue;
    }
    if (rest.startsWith("'")) {
      const close = rest.indexOf("'", 1);
      pairs.push({ key, value: close < 0 ? rest.slice(1) : rest.slice(1, close) });
    } else {
      pairs.push({ key, value: rest.replace(/\s+#.*$/, '').trim() });
    }
    index = end + 1;
  }
  return pairs.filter((pair) => pair.key !== '' || pair.value !== '');
}

/** Whether pasted text should split into rows: several lines, or one `KEY=value` line. */
export function isKeyValuePaste(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  return lines.length > 1 || (lines.length === 1 && lines[0]?.includes('=') === true);
}
