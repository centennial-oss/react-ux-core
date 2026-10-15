import { useSelector } from '@tanstack/react-form';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocale } from 'react-aria-components';
import { Banner } from '../components/Banner/Banner';
import { Button } from '../components/Button/Button';
import {
  DescriptionList,
  type DescriptionItem,
} from '../components/DescriptionList/DescriptionList';
import { Separator } from '../components/Separator/Separator';
import { useTimeZone } from '../provider/context';
import { cn } from '../utils/cn';
import { isFieldVisible, isInputField } from './fieldIndex';
import { formatFieldValue, type FormatContext } from './format';
import type { AnyFieldConfig } from './internalTypes';
import { getAt, normalizePath } from './paths';
import { useFormRuntime } from './runtime';
import { useFormMessages } from './messages';

function listColumns(columns: number): 1 | 2 | 3 {
  return columns >= 3 ? 3 : columns === 1 ? 1 : 2;
}

/** The view-mode rendering of a list of entries: description lists, with arrays, banners and dividers between. */
function viewEntries(
  fields: readonly AnyFieldConfig[],
  values: unknown,
  scopePath: string,
  columns: number,
  context: Omit<FormatContext, 'scope'>,
): ReactNode[] {
  const scope: unknown = scopePath === '' ? values : getAt(values, scopePath);
  const blocks: ReactNode[] = [];
  let items: DescriptionItem[] = [];
  const flush = () => {
    if (items.length > 0) {
      blocks.push(
        <DescriptionList
          key={`list-${String(blocks.length)}`}
          items={items}
          columns={listColumns(columns)}
        />,
      );
      items = [];
    }
  };

  for (const field of fields) {
    if (!isFieldVisible(field, scope)) {
      continue;
    }
    if (!isInputField(field)) {
      if (field.type === 'display') {
        items.push({
          id: field.id,
          label: field.label,
          value:
            typeof field.content === 'function' ? field.content(scope as never) : field.content,
        });
        continue;
      }
      flush();
      blocks.push(
        field.type === 'banner' ? (
          <Banner key={field.id} tone={field.tone ?? 'info'} title={field.title}>
            {typeof field.content === 'function' ? field.content(scope as never) : field.content}
          </Banner>
        ) : (
          <div key={field.id} className="flex flex-col gap-2">
            <Separator />
            {field.label !== undefined && (
              <p className="text-sm font-semibold text-fg">{field.label}</p>
            )}
          </div>
        ),
      );
      continue;
    }
    const name = normalizePath(field.name);
    const path = scopePath === '' ? name : `${scopePath}.${name}`;
    const value = getAt(values, path);
    if (field.type === 'array') {
      flush();
      const list: unknown[] = Array.isArray(value) ? (value as unknown[]) : [];
      blocks.push(
        <div key={path} className="flex flex-col gap-3">
          <p className="text-sm font-medium text-fg">{field.label}</p>
          {list.length === 0 ? (
            <p className="text-sm text-fg-muted">{context.messages.notSet}</p>
          ) : (
            list.map((item, index) => (
              <div
                key={`${path}[${String(index)}]`}
                className="flex flex-col gap-2 rounded-card border border-border p-3"
              >
                <p className="text-sm font-semibold text-fg">
                  {field.itemLabel?.(item as never, index) ??
                    context.messages.itemNumber({ index: index + 1 })}
                </p>
                {viewEntries(
                  field.fields ?? [],
                  values,
                  `${path}[${String(index)}]`,
                  field.columns ?? 1,
                  context,
                )}
              </div>
            ))
          )}
        </div>,
      );
      continue;
    }
    items.push({
      id: path,
      label: field.label,
      value: formatFieldValue(field, value, { ...context, scope }),
      infoTip: field.infoTip,
    });
  }
  flush();
  return blocks;
}

/** View mode: the form's values read-only, laid out by the same sections, with Edit when the toggle is on. */
export function FormView({ className }: { className?: string }) {
  const { form, sections, hasEditToggle, actions, setMode } = useFormRuntime();
  const messages = useFormMessages();
  const { locale } = useLocale();
  const timeZone = useTimeZone();
  const values: unknown = useSelector(form.store, (state) => state.values as unknown);
  const context = { locale, timeZone, messages };

  return (
    <div className={cn('@container/form flex flex-col gap-6', className)}>
      {hasEditToggle && actions.kind !== 'none' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            icon={Pencil}
            onPress={() => {
              setMode('edit');
            }}
          >
            {messages.edit}
          </Button>
        </div>
      )}
      {sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-3">
          {section.title !== undefined && (
            <h3 className="text-base font-semibold text-fg">{section.title}</h3>
          )}
          {section.description !== undefined && (
            <p className="text-sm text-fg-muted">{section.description}</p>
          )}
          {viewEntries(section.fields, values, '', section.columns, context)}
        </section>
      ))}
    </div>
  );
}
