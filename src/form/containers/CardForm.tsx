import type { ReactNode } from 'react';
import { Card } from '../../components/Card/Card';
import type { HeadingLevel } from '../../utils/types';
import { FormElement } from '../ConfigForm';
import { FormActionBar } from '../FormActionBar';
import { FormView } from '../FormView';
import { FormRuntimeContext } from '../runtime';
import { useFormController, type FormControllerOptions } from '../useFormController';

export interface CardFormProps<V, TCustom extends string = never> extends FormControllerOptions<
  V,
  TCustom
> {
  title?: ReactNode;
  description?: ReactNode;
  /** The card title's heading level. Defaults to the Card default. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * A ConfigForm in a Card, with the buttons in the card footer. With `hasEditToggle` the card shows the record
 * read-only until Edit is pressed, so a detail card and its edit form share one definition.
 */
export function CardForm<V, TCustom extends string = never>({
  title,
  description,
  headingLevel,
  className,
  ...options
}: CardFormProps<V, TCustom>) {
  const runtime = useFormController(options);
  const isEditing = runtime.mode === 'edit';
  return (
    <FormRuntimeContext.Provider value={runtime}>
      <Card
        title={title}
        description={description}
        headingLevel={headingLevel}
        className={className}
        footer={isEditing ? <FormActionBar isSticky={false} className="w-full" /> : undefined}
      >
        {isEditing ? <FormElement /> : <FormView />}
      </Card>
    </FormRuntimeContext.Provider>
  );
}
