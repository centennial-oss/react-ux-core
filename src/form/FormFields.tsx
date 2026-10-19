import { useSelector } from '@tanstack/react-form';
import { useState, type ReactNode } from 'react';
import { Banner } from '../components/Banner/Banner';
import { Disclosure } from '../components/Disclosure/Disclosure';
import { Separator } from '../components/Separator/Separator';
import { cn } from '../utils/cn';
import { ArrayField } from './ArrayField';
import { isFieldVisible, isInputField } from './fieldIndex';
import { FieldSlot, spanClass } from './FieldSlot';
import type { AnyDisplayConfig, AnyFieldConfig } from './internalTypes';
import { getAt, normalizePath } from './paths';
import { useFormRuntime, type ResolvedSection } from './runtime';

/** Grid columns of a section, from the form's own width (a container query) up; phones get one column. */
const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @min-[40rem]/form:grid-cols-2',
  3: 'grid-cols-1 @min-[40rem]/form:grid-cols-3',
  4: 'grid-cols-1 @min-[40rem]/form:grid-cols-4',
} as const;

export function fieldGridClasses(columns: 1 | 2 | 3 | 4, className?: string): string {
  return cn('grid gap-x-4 gap-y-5', columnClasses[columns], className);
}

/** The value scope of an entry: the whole form, or an array item. */
function useScopeValues(scopePath: string): unknown {
  const { form } = useFormRuntime();
  return useSelector(form.store, (state) => {
    const values: unknown = state.values;
    return scopePath === '' ? values : getAt(values, scopePath);
  });
}

function DisplayEntry({
  field,
  scopePath,
  columns,
}: {
  field: AnyDisplayConfig;
  scopePath: string;
  columns: number;
}) {
  const scope = useScopeValues(scopePath);
  const content: ReactNode =
    typeof field.content === 'function' ? field.content(scope as never) : field.content;
  if (field.type === 'separator') {
    return (
      <div className="col-span-full flex flex-col gap-2 pt-2">
        <Separator />
        {field.label !== undefined && (
          <p className="text-sm font-semibold text-fg">{field.label}</p>
        )}
      </div>
    );
  }
  if (field.type === 'banner') {
    return (
      <Banner tone={field.tone ?? 'info'} title={field.title} className="col-span-full">
        {content}
      </Banner>
    );
  }
  return (
    <div className={cn('flex min-w-0 flex-col gap-1 text-sm', spanClass(field.colSpan, columns))}>
      {field.label !== undefined && <p className="font-medium text-fg">{field.label}</p>}
      <div className="text-fg-muted">{content}</div>
    </div>
  );
}

/** One config entry, shown only while its `visibleWhen` allows. */
export function FieldEntry({
  field,
  scopePath,
  columns,
}: {
  field: AnyFieldConfig;
  scopePath: string;
  columns: number;
}) {
  const { form } = useFormRuntime();
  const isVisible = useSelector(form.store, (state) => {
    const values: unknown = state.values;
    return isFieldVisible(field, scopePath === '' ? values : getAt(values, scopePath));
  });
  if (!isVisible) {
    return null;
  }
  if (!isInputField(field)) {
    return <DisplayEntry field={field} scopePath={scopePath} columns={columns} />;
  }
  const name = normalizePath(field.name);
  const path = scopePath === '' ? name : `${scopePath}.${name}`;
  if (field.type === 'array') {
    return <ArrayField field={field} path={path} columns={columns} />;
  }
  return <FieldSlot field={field} path={path} scopePath={scopePath} columns={columns} />;
}

function SectionFields({ section }: { section: ResolvedSection }) {
  return (
    <div className={fieldGridClasses(section.columns)}>
      {section.fields.map((field) => (
        <FieldEntry
          key={isInputField(field) ? normalizePath(field.name) : field.id}
          field={field}
          scopePath=""
          columns={section.columns}
        />
      ))}
    </div>
  );
}

function FormSectionView({ section }: { section: ResolvedSection }) {
  const { forcedOpenSections } = useFormRuntime();
  const [isExpanded, setExpanded] = useState(section.defaultExpanded);
  const hasHeading = section.title !== undefined;

  if (section.isCollapsible && hasHeading) {
    return (
      <Disclosure
        title={section.title}
        isExpanded={isExpanded || forcedOpenSections.has(section.id)}
        onExpandedChange={setExpanded}
        className="rounded-card border border-border"
        classNames={{ trigger: 'px-4', panel: 'px-4 pb-4' }}
      >
        {section.description !== undefined && (
          <p className="pb-4 text-sm text-fg-muted">{section.description}</p>
        )}
        <SectionFields section={section} />
      </Disclosure>
    );
  }

  if (!hasHeading) {
    return <SectionFields section={section} />;
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-base font-semibold text-fg">{section.title}</legend>
      <div className="mt-1 flex flex-col gap-4">
        {section.description !== undefined && (
          <p className="text-sm text-fg-muted">{section.description}</p>
        )}
        <SectionFields section={section} />
      </div>
    </fieldset>
  );
}

/** Every section of the form, in order. */
export function FormFields() {
  const { sections } = useFormRuntime();
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <FormSectionView key={section.id} section={section} />
      ))}
    </div>
  );
}
