// Tab-separated text, the format spreadsheets (Excel, Google Sheets, Numbers) exchange on the clipboard. Cells with
// tabs, line breaks or quotes are quoted, with quotes doubled.

function quote(cell: string): string {
  return /[\t\r\n"]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

/** Writes cells as tab-separated text, one line per row. */
export function toTsv(matrix: readonly (readonly string[])[]): string {
  return matrix.map((row) => row.map(quote).join('\t')).join('\n');
}

/**
 * Reads tab-separated text into rows of cells. Quoted cells may hold tabs, line breaks and doubled quotes. A final
 * line break (which spreadsheets add) doesn't make an empty row.
 */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let index = 0;
  let isQuoted = false;
  let atCellStart = true;
  while (index < text.length) {
    const char = text.charAt(index);
    if (isQuoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        isQuoted = false;
        index++;
        continue;
      }
      cell += char;
      index++;
      continue;
    }
    if (char === '"' && atCellStart) {
      isQuoted = true;
      atCellStart = false;
      index++;
      continue;
    }
    if (char === '\t') {
      row.push(cell);
      cell = '';
      atCellStart = true;
      index++;
      continue;
    }
    if (char === '\r' || char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      atCellStart = true;
      index += char === '\r' && text[index + 1] === '\n' ? 2 : 1;
      continue;
    }
    cell += char;
    atCellStart = false;
    index++;
  }
  if (cell !== '' || row.length > 0 || !atCellStart) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
