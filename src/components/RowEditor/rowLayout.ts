// The layout shared by the row editors (ScheduleEditor, TierEditor, KeyValueEditor): a table with column headings
// when the editor is wide enough, and a card per row with visible field labels when it isn't (phones, narrow
// columns).
import { useElementWidth } from '../../utils/useElementWidth';

/** The editor width, in pixels, from which rows show as a table. */
export const ROW_TABLE_MIN_WIDTH = 640;

/** A ref for the editor's root, whether it's wide, and the label props for a field in either layout. */
export function useRowLayout(minWidth = ROW_TABLE_MIN_WIDTH) {
  const [ref, width] = useElementWidth();
  const isWide = (width ?? 0) >= minWidth;
  /** In the table the column heading shows the label, so the field takes it as its accessible name only. */
  const fieldLabel = (text: string) => (isWide ? { 'aria-label': text } : { label: text });
  return { ref, isWide, fieldLabel };
}
