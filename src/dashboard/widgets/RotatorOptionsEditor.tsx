// The rotator's Display tab: seconds per widget, the controls, and its widgets, which can be added (from the
// registered types), configured (in the usual configure dialog), reordered and removed.

import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from 'lucide-react';
import { use, useEffect, useState } from 'react';
import { IconButton } from '../../components/IconButton/IconButton';
import { MenuItem } from '../../components/Menu/Menu';
import { MenuButton } from '../../components/Menu/MenuButtons';
import { NumberField } from '../../components/NumberField/NumberField';
import { Switch } from '../../components/Switch/Switch';
import { DashboardRuntimeContext } from '../context/DashboardContexts';
import { WidgetConfigureDialog } from '../Dashboard/WidgetConfigureDialog';
import { createWidgetInstance } from '../document/document';
import { readText } from '../messages';
import type { JsonValue, WidgetInstance, WidgetOptionsEditorProps } from '../types';
import { rotatorChildren, type RotatorWidgetOptions } from './rotatorWidget';

export function RotatorOptionsEditor({
  value,
  onChange,
  onValidityChange,
  messages,
}: WidgetOptionsEditorProps<RotatorWidgetOptions>) {
  const runtime = use(DashboardRuntimeContext);
  const registry = runtime?.widgetTypes;
  const children = rotatorChildren(value);
  const [configuring, setConfiguring] = useState<string | null>(null);
  useEffect(() => {
    onValidityChange(true);
  }, [onValidityChange]);

  const setChildren = (next: WidgetInstance[]) => {
    onChange({ ...value, children: next as unknown as JsonValue[] });
  };
  const titleOf = (child: WidgetInstance) => {
    const definition = registry?.get(child.type);
    return child.title ?? (definition ? readText(definition.displayName, messages) : child.type);
  };
  const move = (from: number, to: number) => {
    const next = [...children];
    const [moved] = next.splice(from, 1);
    if (moved) {
      next.splice(to, 0, moved);
      setChildren(next);
    }
  };
  // Containers don't nest.
  const addable = registry?.types.filter((type) => type.capabilities?.isContainer !== true) ?? [];
  const child = children.find((entry) => entry.id === configuring);

  return (
    <div className="flex flex-col gap-3">
      <NumberField
        label={messages.optionInterval}
        value={Math.round(value.intervalMs / 1000)}
        minValue={1}
        maxValue={600}
        step={1}
        onChange={(seconds) => {
          onChange({ ...value, intervalMs: Math.max(1, seconds ?? 5) * 1000 });
        }}
      />
      <Switch
        isSelected={value.hasControls}
        onChange={(hasControls) => {
          onChange({ ...value, hasControls });
        }}
      >
        {messages.optionControls}
      </Switch>
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">{messages.rotatorChildren}</h4>
        {children.length === 0 ? (
          <p className="text-sm text-fg-muted">{messages.rotatorEmpty}</p>
        ) : (
          <ol aria-label={messages.rotatorChildren} className="flex flex-col gap-1">
            {children.map((entry, position) => {
              const title = titleOf(entry);
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-1 rounded-control border border-border px-2 py-1"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
                  {registry?.get(entry.type) && (
                    <IconButton
                      icon={Settings2}
                      aria-label={`${messages.configure}: ${title}`}
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        setConfiguring(entry.id);
                      }}
                    />
                  )}
                  <IconButton
                    icon={ArrowUp}
                    aria-label={messages.moveUp({ item: title })}
                    size="sm"
                    variant="ghost"
                    isDisabled={position === 0}
                    onPress={() => {
                      move(position, position - 1);
                    }}
                  />
                  <IconButton
                    icon={ArrowDown}
                    aria-label={messages.moveDown({ item: title })}
                    size="sm"
                    variant="ghost"
                    isDisabled={position === children.length - 1}
                    onPress={() => {
                      move(position, position + 1);
                    }}
                  />
                  <IconButton
                    icon={Trash2}
                    aria-label={`${messages.remove}: ${title}`}
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setChildren(children.filter((other) => other.id !== entry.id));
                    }}
                  />
                </li>
              );
            })}
          </ol>
        )}
        {addable.length > 0 && (
          <MenuButton
            label={messages.addWidgetAction}
            icon={Plus}
            size="sm"
            className="self-start"
            onAction={(key) => {
              const type = registry?.get(String(key));
              if (type) {
                const created = createWidgetInstance(type);
                setChildren([...children, created]);
                if (type.dataShape !== null) {
                  setConfiguring(created.id);
                }
              }
            }}
          >
            {addable.map((type) => (
              <MenuItem key={type.type} id={type.type}>
                {readText(type.displayName, messages)}
              </MenuItem>
            ))}
          </MenuButton>
        )}
      </div>
      {child && registry && (
        <WidgetConfigureDialog
          instance={child}
          widgetTypes={registry}
          dataSources={runtime.dataSources}
          runtimeContext={runtime.context}
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setConfiguring(null);
            }
          }}
          onApply={(configured) => {
            setChildren(children.map((other) => (other.id === configured.id ? configured : other)));
          }}
        />
      )}
    </div>
  );
}
