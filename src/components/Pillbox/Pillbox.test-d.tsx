// Type tests: compiled by `make typecheck`, not run.
import { LayoutGrid, List } from 'lucide-react';
import { Pillbox } from './Pillbox';

type View = 'list' | 'grid';

/** `onChange` receives the union of the option ids, not a plain string. */
export const inferred = (
  <Pillbox
    aria-label="View"
    options={[
      { id: 'list', label: 'List' },
      { id: 'grid', label: 'Grid' },
    ]}
    defaultValue="grid"
    onChange={(view) => {
      const exact: View = view;
      return exact;
    }}
  />
);

const viewOptions = [
  { id: 'list', label: 'List', icon: List },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
] as const;

export const fromConstOptions = (
  <Pillbox aria-label="View" options={viewOptions} value="list" isIconOnly />
);

export const unknownValue = (
  <Pillbox
    aria-label="View"
    options={viewOptions}
    // @ts-expect-error "table" isn't one of the options
    value="table"
  />
);

export const unknownDefaultValue = (
  <Pillbox
    aria-label="View"
    options={viewOptions}
    // @ts-expect-error "table" isn't one of the options
    defaultValue="table"
  />
);

export const wrongHandler = (
  <Pillbox
    aria-label="View"
    options={viewOptions}
    // @ts-expect-error the handler must accept every option id
    onChange={(view: 'list') => view}
  />
);

export const missingLabel = (
  // @ts-expect-error the group needs aria-label or aria-labelledby
  <Pillbox options={viewOptions} />
);

export const labelledBy = <Pillbox aria-labelledby="view-label" options={viewOptions} />;

export const iconOnlyWithoutIcons = (
  // @ts-expect-error icon-only mode needs an icon on every option
  <Pillbox aria-label="View" isIconOnly options={[{ id: 'list', label: 'List' }]} />
);

export const controlledAndUncontrolled = (
  // @ts-expect-error value and defaultValue can't both be set
  <Pillbox aria-label="View" options={viewOptions} value="list" defaultValue="grid" />
);
