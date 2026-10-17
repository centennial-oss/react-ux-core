// The input for one property, picked by its type. Every input is named by `aria-label` (the row shows the same text
// as its visible label). A property whose value differs between the selected objects shows the "Mixed" placeholder
// (or note) and no value; editing it sets one value for all of them.

import { useId, useRef, useState, type ReactNode } from 'react';
import { useEntryMessages } from '../../provider/context';
import { ColorField, type ColorValue } from '../ColorField/ColorField';
import { JsonEditor } from '../JsonEditor/JsonEditor';
import { Option } from '../ListBox/ListBoxParts';
import { MoneyField } from '../MoneyField/MoneyField';
import { NumberField } from '../NumberField/NumberField';
import { Select } from '../Select/Select';
import { Switch } from '../Switch/Switch';
import { TextField } from '../TextField/TextField';
import { ByteSizeField } from '../UnitField/ByteSizeField';
import { DurationField } from '../UnitField/DurationField';
import { defaultPropertyInspectorMessages } from './messages';
import type { PropertyDef } from './PropertyInspector';
import { ScrubLabel } from './ScrubLabel';
import { vectorComponent, type Vector2 } from './values';

export interface PropertyControlProps {
  def: PropertyDef;
  value: unknown;
  isMixed: boolean;
  /** For `vector2`: which components differ between the selected objects. */
  mixedAxes: ReadonlySet<'x' | 'y'>;
  /** Whether several objects are selected. */
  isMultiple: boolean;
  onChange: (value: unknown) => void;
  size: 'sm' | 'md';
}

const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);

/** JSON text for a JSON property. Keeps what's typed while it's invalid; reports parsed values only. */
function JsonProperty({
  def,
  value,
  isMixed,
  onChange,
  mixedNote,
}: Pick<PropertyControlProps, 'def' | 'value' | 'isMixed' | 'onChange'> & {
  mixedNote: ReactNode;
}) {
  const format = (next: unknown) =>
    isMixed || next === undefined ? '' : JSON.stringify(next, null, 2);
  const [text, setText] = useState(() => format(value));
  const [shown, setShown] = useState(() => format(value));
  // When the value changes from outside, the text follows.
  if (format(value) !== shown) {
    setShown(format(value));
    setText(format(value));
  }
  return (
    <JsonEditor
      aria-label={def.label}
      value={text}
      onChange={(next) => {
        setText(next);
        try {
          const parsed: unknown = JSON.parse(next);
          setShown(JSON.stringify(parsed, null, 2));
          onChange(parsed);
        } catch {
          // Invalid JSON stays in the editor, which reports the problem.
        }
      }}
      isReadOnly={def.isReadOnly}
      description={isMixed ? mixedNote : def.description}
      minRows={3}
      maxRows={12}
    />
  );
}

export function PropertyControl({
  def,
  value,
  isMixed,
  mixedAxes,
  isMultiple,
  onChange,
  size,
}: PropertyControlProps) {
  const messages = useEntryMessages(defaultPropertyInspectorMessages);
  const placeholder = isMixed ? messages.propertyMixed : undefined;
  const mixedNote = <span className="font-medium text-fg">{messages.propertyMixed}</span>;
  const common = {
    'aria-label': def.label,
    isReadOnly: def.isReadOnly,
    description: def.description,
    size,
  };
  const step = def.step ?? 1;

  switch (def.type) {
    case 'text':
      return (
        <TextField
          {...common}
          value={isMixed || typeof value !== 'string' ? '' : value}
          placeholder={placeholder}
          onChange={onChange}
          autoComplete="off"
        />
      );
    case 'number':
    case 'angle':
      return (
        <NumberField
          {...common}
          value={isMixed ? null : asNumber(value)}
          placeholder={placeholder}
          minValue={def.min}
          maxValue={def.max}
          step={step}
          suffix={def.type === 'angle' ? (def.unit ?? messages.propertyDegrees) : def.unit}
          onChange={(next) => {
            if (next !== null) {
              onChange(next);
            }
          }}
        />
      );
    case 'boolean':
      return (
        <Switch
          aria-label={def.label}
          isReadOnly={def.isReadOnly}
          description={def.description}
          isSelected={!isMixed && value === true}
          onChange={onChange}
        >
          {isMixed ? <span className="text-fg-muted">{messages.propertyMixed}</span> : undefined}
        </Switch>
      );
    case 'enum':
      return (
        <Select
          aria-label={def.label}
          description={def.description}
          size={size}
          items={def.options ?? []}
          value={isMixed || typeof value !== 'string' ? null : value}
          placeholder={placeholder}
          isDisabled={def.isReadOnly}
          onChange={onChange}
        >
          {(option) => <Option id={option.id}>{option.label}</Option>}
        </Select>
      );
    case 'color':
      return (
        <ColorField
          aria-label={def.label}
          value={isMixed || typeof value !== 'string' ? null : (value as ColorValue)}
          description={isMixed ? mixedNote : def.description}
          isDisabled={def.isReadOnly}
          onChange={onChange}
        />
      );
    case 'duration':
      return (
        <DurationField
          {...common}
          value={isMixed ? null : asNumber(value)}
          placeholder={placeholder}
          minValue={def.min}
          maxValue={def.max}
          onChange={(next) => {
            if (next !== null) {
              onChange(next);
            }
          }}
        />
      );
    case 'bytes':
      return (
        <ByteSizeField
          {...common}
          value={isMixed ? null : asNumber(value)}
          placeholder={placeholder}
          minValue={def.min}
          maxValue={def.max}
          onChange={(next) => {
            if (next !== null) {
              onChange(next);
            }
          }}
        />
      );
    case 'money':
      return (
        <MoneyField
          {...common}
          currency={def.unit ?? 'USD'}
          value={isMixed || typeof value !== 'string' ? null : value}
          placeholder={placeholder}
          minValue={def.min === undefined ? undefined : String(def.min)}
          maxValue={def.max === undefined ? undefined : String(def.max)}
          allowsNegative={def.min === undefined || def.min < 0}
          onChange={(next) => {
            if (next !== null) {
              onChange(next);
            }
          }}
        />
      );
    case 'json':
      return (
        <JsonProperty
          def={def}
          value={value}
          isMixed={isMixed}
          onChange={onChange}
          mixedNote={mixedNote}
        />
      );
    case 'vector2':
      return (
        <Vector2Property
          def={def}
          value={value}
          mixedAxes={mixedAxes}
          isMultiple={isMultiple}
          onChange={onChange}
          size={size}
        />
      );
  }
}

/** Two number fields for X and Y, each scrubbable by its letter. */
function Vector2Property({
  def,
  value,
  mixedAxes,
  isMultiple,
  onChange,
  size,
}: Pick<PropertyControlProps, 'def' | 'value' | 'mixedAxes' | 'isMultiple' | 'onChange' | 'size'>) {
  const messages = useEntryMessages(defaultPropertyInspectorMessages);
  const groupRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  const step = def.step ?? 1;
  const axes = [
    { axis: 'x' as const, label: messages.propertyAxisX },
    { axis: 'y' as const, label: messages.propertyAxisY },
  ];
  const setAxis = (axis: 'x' | 'y', next: number) => {
    const other = axis === 'x' ? 'y' : 'x';
    const otherValue = vectorComponent(value, other);
    // With several objects whose other component differs, only the edited component is sent; the app merges it.
    if (isMultiple && mixedAxes.has(other)) {
      const partial: Partial<Vector2> = axis === 'x' ? { x: next } : { y: next };
      onChange(partial);
      return;
    }
    const vector: Vector2 =
      axis === 'x' ? { x: next, y: otherValue ?? 0 } : { x: otherValue ?? 0, y: next };
    onChange(vector);
  };
  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={def.label}
      aria-describedby={def.description !== undefined ? descriptionId : undefined}
      className="@container/vector flex min-w-0 flex-col gap-1.5"
    >
      {/* Side by side when there's room for both numbers; one above the other in a narrow panel. */}
      <div className="grid min-w-0 grid-cols-1 gap-2 @[16rem]/vector:grid-cols-2">
        {axes.map(({ axis, label }) => {
          const component = mixedAxes.has(axis) ? null : vectorComponent(value, axis);
          return (
            <div key={axis} data-axis={axis} className="min-w-0">
              <NumberField
                aria-label={label}
                size={size}
                value={component}
                placeholder={mixedAxes.has(axis) ? messages.propertyMixed : undefined}
                minValue={def.min}
                maxValue={def.max}
                step={step}
                isReadOnly={def.isReadOnly}
                prefix={
                  <ScrubLabel
                    value={component}
                    step={step}
                    min={def.min}
                    max={def.max}
                    isDisabled={def.isReadOnly}
                    onScrub={(next) => {
                      setAxis(axis, next);
                    }}
                    onPress={() => {
                      groupRef.current
                        ?.querySelector<HTMLInputElement>(`[data-axis="${axis}"] input`)
                        ?.focus();
                    }}
                    className="-ms-1 px-1 text-xs font-semibold"
                  >
                    {label}
                  </ScrubLabel>
                }
                suffix={def.unit}
                onChange={(next) => {
                  if (next !== null) {
                    setAxis(axis, next);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      {def.description !== undefined && (
        <span id={descriptionId} className="text-xs text-fg-muted">
          {def.description}
        </span>
      )}
    </div>
  );
}
