// Type tests: compiled by `make typecheck`, not run.
import { useState } from 'react';
import { Option } from '../ListBox';
import { MultiSelect } from '../MultiSelect/MultiSelect';
import { Select } from './Select';

type AssignmentStatus = 'draft' | 'submitted' | 'graded';

/** A Select bound to union-typed state takes the setter with no cast. */
export function BoundToState() {
  const [status, setStatus] = useState<AssignmentStatus>('draft');
  return (
    <Select label="Status" value={status} onChange={setStatus}>
      <Option id="draft">Draft</Option>
      <Option id="submitted">Submitted</Option>
    </Select>
  );
}

/** `onChange` receives the union inferred from `value`, never null unless clearable. */
export function InfersFromValue() {
  const [status, setStatus] = useState<AssignmentStatus>('draft');
  return (
    <Select
      label="Status"
      value={status}
      onChange={(next) => {
        const exact: AssignmentStatus = next;
        setStatus(exact);
      }}
    >
      <Option id="draft">Draft</Option>
    </Select>
  );
}

/** `defaultValue` doesn't widen the type a typed handler sets. */
export const defaultDoesNotWiden = (
  // @ts-expect-error 'lost' isn't an AssignmentStatus.
  <Select label="Status" defaultValue="lost" onChange={(next: AssignmentStatus) => next}>
    <Option id="draft">Draft</Option>
  </Select>
);

/** With `isClearable`, `onChange` may receive null. */
export function ClearableAddsNull() {
  const [status, setStatus] = useState<AssignmentStatus | null>(null);
  return (
    <Select
      label="Status"
      value={status}
      isClearable
      onChange={(next) => {
        // @ts-expect-error A clearable Select can report null.
        const exact: AssignmentStatus = next;
        setStatus(exact);
      }}
    >
      <Option id="draft">Draft</Option>
    </Select>
  );
}

/** A Select with an explicit item type still compiles. */
export const explicitItemType = (
  <Select<{ id: string; name: string }> label="Region" items={[{ id: 'n', name: 'North' }]}>
    {(item) => <Option id={item.id}>{item.name}</Option>}
  </Select>
);

/** MultiSelect infers its ids' union from `value`. */
export function MultiSelectInfers() {
  const [statuses, setStatuses] = useState<AssignmentStatus[]>([]);
  return (
    <MultiSelect
      label="Statuses"
      items={[{ id: 'draft' as const }, { id: 'submitted' as const }]}
      value={statuses}
      onChange={setStatuses}
    >
      {(item) => <Option id={item.id}>{item.id}</Option>}
    </MultiSelect>
  );
}
