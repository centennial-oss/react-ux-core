// Type tests: compiled by `make typecheck`, not run.
import { Plus } from 'lucide-react';
import { IconButton } from './IconButton';

export const missingLabel = (
  // @ts-expect-error aria-label is required
  <IconButton icon={Plus} />
);

export const toggleWithRepeat = (
  // @ts-expect-error a toggle can't also repeat
  <IconButton icon={Plus} aria-label="Add" isSelected onRepeat={() => undefined} />
);

export const action = (
  <IconButton icon={Plus} aria-label="Add" onRepeat={() => undefined} repeatDelay={300} />
);
export const toggle = (
  <IconButton icon={Plus} aria-label="Add" defaultSelected onChange={(isOn: boolean) => isOn} />
);
