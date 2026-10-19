import { ChevronDown } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import {
  Button as AriaButton,
  Disclosure as AriaDisclosure,
  DisclosureGroup as AriaDisclosureGroup,
  DisclosurePanel,
  Heading,
  type DisclosureGroupProps as AriaDisclosureGroupProps,
  type DisclosureProps as AriaDisclosureProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { disabledClasses } from '../../utils/stateClasses';
import type { HeadingLevel } from '../../utils/types';

type ReplacedProps = 'className' | 'style' | 'children' | 'render';

export interface DisclosureProps extends Omit<AriaDisclosureProps, ReplacedProps> {
  /** The trigger's label. */
  title: ReactNode;
  /** The content shown when expanded. */
  children: ReactNode;
  /** The heading element around the trigger. Defaults to 3. */
  headingLevel?: HeadingLevel;
  className?: string;
  classNames?: { trigger?: string; panel?: string };
  ref?: Ref<HTMLDivElement>;
}

const chevron =
  'size-4 shrink-0 text-fg-muted transition-transform duration-(--duration-fast) in-data-expanded:rotate-180';

/**
 * A section that expands and collapses. The trigger is a real button with `aria-expanded`, inside a heading.
 * Controlled with `isExpanded` / `onExpandedChange` or uncontrolled with `defaultExpanded`.
 */
export function Disclosure({
  title,
  children,
  headingLevel = 3,
  className,
  classNames,
  ...rest
}: DisclosureProps) {
  return (
    <AriaDisclosure {...rest} className={cn('group/disclosure text-fg', className)}>
      <Heading level={headingLevel} className="text-sm font-medium">
        <AriaButton
          slot="trigger"
          className={cn(
            'hit-area flex w-full cursor-pointer items-center justify-between gap-3 rounded-control py-2 text-start',
            'data-focus-visible:focus-ring',
            disabledClasses,
            classNames?.trigger,
          )}
        >
          <span className="min-w-0">{title}</span>
          <ChevronDown aria-hidden="true" className={chevron} />
        </AriaButton>
      </Heading>
      {/* Padding lives on an inner element: the collapsed panel (hidden="until-found") must take no space. */}
      <DisclosurePanel>
        <div className={cn('pb-3 text-sm', classNames?.panel)}>{children}</div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}

export interface AccordionProps extends Omit<AriaDisclosureGroupProps, ReplacedProps> {
  /** `Disclosure` items, each with an `id` that `expandedKeys` refers to. */
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A group of disclosures. One item is open at a time unless `allowsMultipleExpanded` is set. Controlled with
 * `expandedKeys` / `onExpandedChange` or uncontrolled with `defaultExpandedKeys`.
 */
export function Accordion({ className, children, ...rest }: AccordionProps) {
  return (
    <AriaDisclosureGroup
      {...rest}
      className={cn(
        'flex flex-col divide-y divide-border border-y border-border *:px-1',
        className,
      )}
    >
      {children}
    </AriaDisclosureGroup>
  );
}

export interface CollapsibleCardProps extends Omit<AriaDisclosureProps, ReplacedProps> {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconComponent;
  /** Controls in the header, outside the trigger (so they don't toggle the card). */
  actions?: ReactNode;
  footer?: ReactNode;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** A Card whose body expands and collapses from its header. */
export function CollapsibleCard({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  headingLevel = 3,
  children,
  className,
  ...rest
}: CollapsibleCardProps) {
  return (
    <AriaDisclosure
      {...rest}
      className={cn(
        'flex min-w-0 flex-col rounded-card border border-border bg-surface-2 text-fg shadow-raised',
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Heading level={headingLevel} className="min-w-0 flex-1">
          <AriaButton
            slot="trigger"
            className={cn(
              'hit-area flex w-full cursor-pointer items-start gap-3 rounded-control text-start',
              'data-focus-visible:focus-ring',
              disabledClasses,
            )}
          >
            {Icon && <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-fg-muted" />}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold">{title}</span>
              {description !== undefined && (
                <span className="mt-0.5 text-sm font-normal text-fg-muted">{description}</span>
              )}
            </span>
            <ChevronDown aria-hidden="true" className={cn(chevron, 'mt-1')} />
          </AriaButton>
        </Heading>
        {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <DisclosurePanel>
        <div className="border-t border-border p-4">{children}</div>
        {footer !== undefined && <div className="border-t border-border px-4 py-3">{footer}</div>}
      </DisclosurePanel>
    </AriaDisclosure>
  );
}
