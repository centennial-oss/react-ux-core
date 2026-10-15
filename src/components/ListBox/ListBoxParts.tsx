// Shared list box pieces for Select, ComboBox and MultiSelect: styled options, sections and the empty state.

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Header,
  ListBoxItem,
  ListBoxSection,
  Text,
  type ListBoxItemProps,
  type ListBoxSectionProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';

export const listBoxClasses =
  'flex max-h-[inherit] flex-col gap-0.5 overflow-auto p-1 text-sm outline-none';

const optionClasses = [
  'group/option relative flex min-h-hit cursor-default items-center gap-2 rounded-control px-2 py-1.5 text-fg outline-none select-none',
  'data-focused:bg-surface-3 data-pressed:bg-surface-4 data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
].join(' ');

export interface OptionProps<T extends object = object> extends Omit<
  ListBoxItemProps<T>,
  'className' | 'style' | 'children'
> {
  children: ReactNode;
  icon?: IconComponent;
  /** Secondary text under the label. */
  description?: ReactNode;
  className?: string;
}

/** An option in a Select, ComboBox or MultiSelect. Shows a check when selected. */
export function Option<T extends object = object>({
  children,
  icon: Icon,
  description,
  className,
  textValue,
  ...rest
}: OptionProps<T>) {
  return (
    <ListBoxItem
      {...rest}
      textValue={textValue ?? (typeof children === 'string' ? children : undefined)}
      className={cn(optionClasses, className)}
    >
      {({ isSelected }) => (
        <>
          <span className="flex size-4 shrink-0 items-center justify-center">
            {isSelected && <Check aria-hidden="true" className="size-4 text-accent-fg" />}
          </span>
          {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />}
          <span className="flex min-w-0 flex-1 flex-col">
            <Text slot="label" className="truncate">
              {children}
            </Text>
            {description !== undefined && (
              <Text slot="description" className="text-xs text-fg-muted">
                {description}
              </Text>
            )}
          </span>
        </>
      )}
    </ListBoxItem>
  );
}

export interface OptionSectionProps<T extends object> extends Omit<
  ListBoxSectionProps<T>,
  'className' | 'style' | 'children' | 'items'
> {
  /** A visible heading for the section. Without one, give it an `aria-label`. */
  title?: ReactNode;
  /** The section's options. For a dynamic list, use `<Collection items={…}>` from react-aria-components. */
  children: ReactNode;
}

/** A group of options with an optional heading. */
export function OptionSection<T extends object>({
  title,
  children,
  ...rest
}: OptionSectionProps<T>) {
  return (
    <ListBoxSection {...rest} className="flex flex-col gap-0.5">
      {title !== undefined && (
        <Header className="px-2 pt-2 pb-1 text-xs font-semibold text-fg-muted">{title}</Header>
      )}
      {children}
    </ListBoxSection>
  );
}

/** Content for an empty list: no results, loading or an error. */
export function ListBoxEmpty({ children }: { children: ReactNode }) {
  return <div className="px-3 py-4 text-center text-sm text-fg-muted">{children}</div>;
}
