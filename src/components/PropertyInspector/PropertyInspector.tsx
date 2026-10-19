// PropertyInspector: the selected object's properties in an editor's side panel (a shape in a drawing tool, a node in
// a graph, a resource's settings). Each property type maps to a CCUX field; properties sit in collapsible groups;
// compact density puts labels beside small inputs (stacking them in narrow panels); number labels scrub the value by
// dragging. With several objects selected, properties that differ show "Mixed" and an edit applies to all of them.

import { useMemo, useRef, type ReactNode, type Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { HeadingLevel } from '../../utils/types';
import { Accordion, Disclosure } from '../Disclosure/Disclosure';
import { EmptyState } from '../EmptyState/EmptyState';
import { defaultPropertyInspectorMessages } from './messages';
import { PropertyControl } from './PropertyControl';
import { ScrubLabel } from './ScrubLabel';
import { selectionOf, sharedValue, vectorComponent, type PropertyValues } from './values';

export type PropertyType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'color'
  | 'duration'
  | 'bytes'
  | 'money'
  | 'json'
  | 'vector2'
  | 'angle';

/**
 * A property and how to edit it. Values by type: strings for `text`, `enum` and `color` (a chart token or "#rrggbb"),
 * numbers for `number`, `angle` (degrees), `duration` (milliseconds) and `bytes`, a decimal string for `money`, a
 * boolean for `boolean`, any JSON value for `json`, and `{ x, y }` for `vector2`.
 */
export interface PropertyDef {
  id: string;
  label: string;
  type: PropertyType;
  /** The collapsible group the property sits in. Properties without one come first, outside any group. */
  group?: string;
  /** The choices for an `enum` property. */
  options?: readonly { id: string; label: string }[];
  /** The unit after a number or vector ("px"), the angle's unit (defaults to "°"), or a money property's ISO 4217 currency (defaults to "USD"). */
  unit?: string;
  /** The smallest value of a number, angle, vector, duration, bytes or money property. */
  min?: number;
  max?: number;
  /** The step for the arrow keys and scrubbing. Defaults to 1. */
  step?: number;
  isReadOnly?: boolean;
  /** Help under the input. */
  description?: ReactNode;
}

export interface PropertyInspectorProps {
  properties: readonly PropertyDef[];
  /**
   * The values of the selected object, or of each selected object. Properties whose values differ show "Mixed". An
   * empty list shows `emptyState`.
   */
  values: PropertyValues;
  /**
   * Called with a property's new value, once per edit, whatever the number of selected objects: apply it to every
   * selected object. When a `vector2` property's other component is mixed, the value holds only the edited component
   * (`{ x }` or `{ y }`): merge it into each object's vector.
   */
  onChange: (id: string, value: unknown) => void;
  /** Labels beside small inputs, stacking in narrow panels. Defaults to true; false stacks every label above a full-size input. */
  isCompact?: boolean;
  /** Shown when nothing is selected. Defaults to the `propertyEmpty` message. */
  emptyState?: ReactNode;
  /** The groups expanded at first. Defaults to all of them. */
  defaultExpandedGroups?: readonly string[];
  /** The level of the group headings. Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Names the inspector, such as "Shape properties". */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const fullWidthTypes = new Set<PropertyType>(['json', 'duration', 'bytes']);

function PropertyRow({
  def,
  selection,
  onChange,
  isCompact,
}: {
  def: PropertyDef;
  selection: readonly Readonly<Record<string, unknown>>[];
  onChange: (id: string, value: unknown) => void;
  isCompact: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { value, isMixed } = sharedValue(selection, (object) => object[def.id]);
  const mixedAxes = new Set<'x' | 'y'>();
  for (const axis of ['x', 'y'] as const) {
    if (sharedValue(selection, (object) => vectorComponent(object[def.id], axis)).isMixed) {
      mixedAxes.add(axis);
    }
  }
  // JSON and the unit fields (a number with a unit picker) need the full width; the rest sit beside their labels.
  const isBeside = isCompact && !fullWidthTypes.has(def.type);
  const isScrubbable = def.type === 'number' || def.type === 'angle';
  const change = (next: unknown) => {
    onChange(def.id, next);
  };

  return (
    <div
      ref={rowRef}
      data-property={def.id}
      className={cn(
        'grid min-w-0 gap-1.5',
        isBeside &&
          '@2xs:grid-cols-[minmax(4.5rem,2fr)_minmax(0,3fr)] @2xs:items-start @2xs:gap-x-3',
      )}
    >
      {/* The visible label; inputs carry the same text as their accessible name. */}
      <span
        className={cn(
          'min-w-0 text-sm font-medium break-words text-fg',
          isBeside && '@2xs:pt-1.5 @2xs:font-normal @2xs:text-fg-muted',
        )}
      >
        {isScrubbable ? (
          <ScrubLabel
            value={isMixed || typeof value !== 'number' ? null : value}
            step={def.step}
            min={def.min}
            max={def.max}
            isDisabled={def.isReadOnly}
            onScrub={change}
            onPress={() => {
              rowRef.current?.querySelector<HTMLInputElement>('input')?.focus();
            }}
          >
            {def.label}
          </ScrubLabel>
        ) : (
          <span aria-hidden="true">{def.label}</span>
        )}
      </span>
      <div className="min-w-0">
        <PropertyControl
          def={def}
          value={value}
          isMixed={isMixed}
          mixedAxes={mixedAxes}
          isMultiple={selection.length > 1}
          onChange={change}
          size={isCompact ? 'sm' : 'md'}
        />
      </div>
    </div>
  );
}

/** Edits the selected object's (or objects') properties, in collapsible groups, with scrubbable numbers. */
export function PropertyInspector({
  properties,
  values,
  onChange,
  isCompact = true,
  emptyState,
  defaultExpandedGroups,
  headingLevel = 3,
  'aria-label': ariaLabel,
  className,
  ref,
}: PropertyInspectorProps) {
  const messages = useEntryMessages(defaultPropertyInspectorMessages);
  const selection = selectionOf(values);
  // Ungrouped properties, then each group in the order it first appears.
  const { ungrouped, groups } = useMemo(() => {
    const byGroup = new Map<string, PropertyDef[]>();
    const loose: PropertyDef[] = [];
    for (const def of properties) {
      if (def.group === undefined) {
        loose.push(def);
      } else {
        byGroup.set(def.group, [...(byGroup.get(def.group) ?? []), def]);
      }
    }
    return { ungrouped: loose, groups: [...byGroup] };
  }, [properties]);

  const rows = (defs: readonly PropertyDef[]) => (
    <div className={cn('flex min-w-0 flex-col', isCompact ? 'gap-2' : 'gap-4')}>
      {defs.map((def) => (
        <PropertyRow
          key={def.id}
          def={def}
          selection={selection}
          onChange={onChange}
          isCompact={isCompact}
        />
      ))}
    </div>
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      className={cn('@container flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      {selection.length === 0 ? (
        (emptyState ?? <EmptyState title={messages.propertyEmpty} headingLevel={headingLevel} />)
      ) : (
        <>
          {selection.length > 1 && (
            <p className="text-xs text-fg-muted">
              {messages.propertySelectionCount({ count: selection.length })}
            </p>
          )}
          {ungrouped.length > 0 && rows(ungrouped)}
          {groups.length > 0 && (
            <Accordion
              allowsMultipleExpanded
              defaultExpandedKeys={defaultExpandedGroups ?? groups.map(([name]) => name)}
            >
              {groups.map(([name, defs]) => (
                <Disclosure key={name} id={name} title={name} headingLevel={headingLevel}>
                  {rows(defs)}
                </Disclosure>
              ))}
            </Accordion>
          )}
        </>
      )}
    </div>
  );
}
