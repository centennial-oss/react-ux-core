// A dialog that lists choices with an icon, a name and a description, grouped by category and searchable when there
// are many: the widget picker (EDIT-09) and the template picker (NAV-13).

import { useMemo, useState } from 'react';
import { ListBox, useFilter } from 'react-aria-components';
import { Dialog } from '../../components/Dialog/Dialog';
import {
  ListBoxEmpty,
  listBoxClasses,
  Option,
  OptionSection,
} from '../../components/ListBox/ListBoxParts';
import { SearchField } from '../../components/SearchField/SearchField';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useDragOut, type DragStartPoint } from './typeDrag';

/** More choices than this, and the dialog gets a search field. */
const SEARCH_FROM = 8;

/** One thing to choose. */
export interface PickerChoice {
  id: string;
  label: string;
  description?: string;
  icon?: IconComponent;
  /** Choices are grouped by category, in first-seen order. */
  category: string;
}

export interface PickerDialogProps {
  title: string;
  choices: readonly PickerChoice[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Called with the chosen id; the dialog closes. */
  onSelect: (id: string) => void;
  searchLabel: string;
  /** Shown when nothing matches. */
  emptyText: string;
  /** Lets a choice be dragged out (onto the grid, EDIT-11): called as the drag starts, and the dialog closes. */
  onChoiceDragStart?: (id: string, point: DragStartPoint) => void;
}

/** Choices by category, in a dialog: searchable when there are more than eight. */
export function PickerDialog({
  title,
  choices,
  isOpen,
  onOpenChange,
  onSelect,
  searchLabel,
  emptyText,
  onChoiceDragStart,
}: PickerDialogProps) {
  const [query, setQuery] = useState('');
  const onDragPointerDown = useDragOut(
    onChoiceDragStart &&
      ((id, point) => {
        onChoiceDragStart(id, point);
        setQuery('');
        onOpenChange(false);
      }),
  );
  const { contains } = useFilter({ sensitivity: 'base' });
  const groups = useMemo(() => {
    const byCategory = new Map<string, PickerChoice[]>();
    for (const choice of choices) {
      if (
        query !== '' &&
        !contains(choice.label, query) &&
        !contains(choice.description ?? '', query)
      ) {
        continue;
      }
      byCategory.set(choice.category, [...(byCategory.get(choice.category) ?? []), choice]);
    }
    return [...byCategory.entries()];
  }, [choices, query, contains]);
  const hasOneGroup = groups.length === 1;

  return (
    <Dialog
      title={title}
      isOpen={isOpen}
      onOpenChange={(open) => {
        setQuery('');
        onOpenChange(open);
      }}
      size="md"
    >
      {(close) => (
        <div className="flex flex-col gap-3 pb-2">
          {choices.length > SEARCH_FROM && (
            <SearchField aria-label={searchLabel} value={query} onChange={setQuery} />
          )}
          <div onPointerDownCapture={onDragPointerDown}>
            <ListBox
              aria-label={title}
              className={cn(listBoxClasses, 'max-h-none p-0')}
              onAction={(key) => {
                onSelect(String(key));
                close();
              }}
              renderEmptyState={() => <ListBoxEmpty>{emptyText}</ListBoxEmpty>}
            >
              {groups.map(([category, members]) => {
                const options = members.map((choice) => (
                  <Option
                    key={choice.id}
                    id={choice.id}
                    icon={choice.icon}
                    textValue={choice.label}
                    description={choice.description}
                  >
                    {choice.label}
                  </Option>
                ));
                return hasOneGroup && category === '' ? (
                  options
                ) : (
                  <OptionSection key={category} title={category}>
                    {options}
                  </OptionSection>
                );
              })}
            </ListBox>
          </div>
        </div>
      )}
    </Dialog>
  );
}
