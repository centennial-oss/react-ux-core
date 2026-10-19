// Groups of toolbar controls with a separator between neighbouring groups: Toolbar's items, and the formatting
// toolbars of the RichTextEditor and MarkdownEditor.
import type { ReactElement } from 'react';
import { Separator } from '../Separator/Separator';

/**
 * A toolbar's items, group by group, with a separator (`separatorClassName` sets its margins) between groups: vertical
 * in a horizontal toolbar, horizontal in a vertical one. `render` gives each item its keyed element.
 */
export function renderToolbarGroups<T>(
  groups: readonly (readonly T[])[],
  separatorClassName: string,
  render: (item: T) => ReactElement,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): ReactElement[] {
  return groups.flatMap((group, groupIndex) => {
    const items = group.map(render);
    return groupIndex > 0
      ? [
          <Separator
            key={`separator-${String(groupIndex)}`}
            orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
            className={separatorClassName}
          />,
          ...items,
        ]
      : items;
  });
}
