// The RichTextEditor's features: which toolbar items show, which nodes the editor registers, which Markdown syntax
// it reads and writes, and which formatting survives a paste. One resolved set drives all four, so a feature that's
// off can't sneak back in through the clipboard or a stored value.

/** A RichTextEditor feature. `embed` is reserved: it's accepted but not implemented yet. */
export type EditorFeature =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'link'
  | 'heading'
  | 'quote'
  | 'list'
  | 'checklist'
  | 'codeBlock'
  | 'image'
  | 'table'
  | 'divider'
  | 'mention'
  | 'embed';

/** How the editor's `value` is stored. */
export type EditorFormat = 'markdown' | 'html' | 'json';

/** The common set: everything but `embed`. `mention` only takes effect with `loadMentions`. */
export const defaultEditorFeatures: readonly EditorFeature[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'link',
  'heading',
  'quote',
  'list',
  'checklist',
  'codeBlock',
  'image',
  'table',
  'divider',
  'mention',
];

/** The features an editor actually uses. */
export type EditorFeatureSet = ReadonlySet<EditorFeature>;

/**
 * Resolves the features an editor uses: Markdown has no underline, mentions need a loader, and `embed` isn't
 * implemented yet.
 */
export function resolveFeatures(
  features: readonly EditorFeature[],
  format: EditorFormat,
  hasMentionLoader: boolean,
): EditorFeatureSet {
  const set = new Set(features);
  set.delete('embed');
  if (format === 'markdown') {
    set.delete('underline');
  }
  if (!hasMentionLoader) {
    set.delete('mention');
  }
  return set;
}
