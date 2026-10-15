import type { CalendarDate } from '@internationalized/date';
import type { ReactNode } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  FieldConfig,
  FieldRenderer,
  FieldRendererProps,
  FormConfig,
  TextFieldConfig,
} from './types';

interface Customer {
  name: string;
  nickname?: string;
  age: number | null;
  isActive: boolean;
  region: string | null;
  tags: string[];
  joined: CalendarDate | null;
  address: { city: string; postcode: string };
  contacts: { email: string; isPrimary: boolean }[];
}

describe('FormConfig types', () => {
  it('ties each field type to paths of its value type', () => {
    expectTypeOf<{ type: 'text'; name: 'name'; label: string }>().toExtend<FieldConfig<Customer>>();
    expectTypeOf<{ type: 'text'; name: 'nickname'; label: string }>().toExtend<
      FieldConfig<Customer>
    >();
    expectTypeOf<{ type: 'text'; name: 'address.city'; label: string }>().toExtend<
      FieldConfig<Customer>
    >();
    expectTypeOf<{ type: 'number'; name: 'age'; label: string }>().toExtend<
      FieldConfig<Customer>
    >();
    expectTypeOf<{ type: 'checkbox'; name: 'isActive'; label: string }>().toExtend<
      FieldConfig<Customer>
    >();
    expectTypeOf<{ type: 'date'; name: 'joined'; label: string }>().toExtend<
      FieldConfig<Customer>
    >();
    // A number field can't point at a string, and a text field can't point at a boolean.
    expectTypeOf<{ type: 'number'; name: 'name'; label: string }>().not.toExtend<
      FieldConfig<Customer>
    >();
    expectTypeOf<{ type: 'text'; name: 'isActive'; label: string }>().not.toExtend<
      FieldConfig<Customer>
    >();
    expectTypeOf<{ type: 'text'; name: 'missing'; label: string }>().not.toExtend<
      FieldConfig<Customer>
    >();
  });

  it('types array item fields relative to the item', () => {
    const contacts = {
      type: 'array',
      name: 'contacts',
      label: 'Contacts',
      newItem: { email: '', isPrimary: false },
      fields: [
        { type: 'email', name: 'email', label: 'Email' },
        { type: 'checkbox', name: 'isPrimary', label: 'Primary' },
      ],
    } as const satisfies FieldConfig<Customer>;
    expectTypeOf(contacts.name).toEqualTypeOf<'contacts'>();
    expectTypeOf<{
      type: 'array';
      name: 'contacts';
      label: string;
      newItem: { email: string; isPrimary: boolean };
      fields: [{ type: 'text'; name: 'isPrimary'; label: string }];
    }>().not.toExtend<FieldConfig<Customer>>();
  });

  it('accepts registered custom types only', () => {
    expectTypeOf<{ type: 'sitePicker'; name: 'region'; label: string }>().toExtend<
      FormConfig<Customer, 'sitePicker'>['fields'][number]
    >();
    expectTypeOf<{ type: 'sitePicker'; name: 'region'; label: string }>().not.toExtend<
      FormConfig<Customer>['fields'][number]
    >();
  });

  it('lets renderers for specific types fit a registry', () => {
    function TextRenderer(props: FieldRendererProps<TextFieldConfig<unknown>, string>): ReactNode {
      return props.field.value;
    }
    expectTypeOf(TextRenderer).toExtend<FieldRenderer>();
  });
});

describe('internal config shapes', () => {
  it('accept every public field config', async () => {
    const { isInputField } = await import('./fieldIndex');
    const fields: FormConfig<Customer>['fields'] = [];
    expectTypeOf(fields).toExtend<readonly import('./internalTypes').AnyFieldConfig[]>();
    expectTypeOf(isInputField).toBeFunction();
  });
});

describe('component generics', () => {
  it('infers the value type for callbacks, the ref handle and wizard steps', async () => {
    const { ConfigForm } = await import('./ConfigForm');
    type Handle = import('./useFormController').ConfigFormHandle<Customer>;
    const config: FormConfig<Customer> = {
      defaultValues: {} as Customer,
      fields: [{ type: 'text', name: 'name', label: 'Name' }],
    };
    expectTypeOf(ConfigForm<Customer>)
      .parameter(0)
      .toHaveProperty('onSuccess')
      .toEqualTypeOf<
        ((event: import('./useFormController').FormSuccessEvent<Customer>) => void) | undefined
      >();
    expectTypeOf<Handle['getValues']>().returns.toEqualTypeOf<Customer>();
    expectTypeOf(config).toExtend<Parameters<typeof ConfigForm<Customer>>[0]['config']>();
    // Wizard steps list fields by name.
    expectTypeOf<{ id: 'a'; title: string; fields: ['address.city'] }>().toExtend<
      import('./containers/WizardForm').WizardStep<Customer>
    >();
  });
});
