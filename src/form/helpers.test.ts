import { CalendarDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defaultMessages as coreMessages } from '../provider/messages';
import { defaultFormMessages } from './messages';
import { findField } from './fieldIndex';
import type { AnyFieldConfig } from './internalTypes';
import { itemPath, normalizePath, pointerToPath } from './paths';
import { problemToSubmitResult, responseToSubmitResult } from './problemDetails';
import { builtInError, createFieldValidators, schemaIssuesToErrors } from './validation';
import { buildPatch, getDirtyFields, isMissingValue, prepareSubmitValues } from './values';

const defaultMessages = { ...coreMessages, ...defaultFormMessages };

const fields: AnyFieldConfig[] = [
  { type: 'text', name: 'name', label: 'Name' },
  { type: 'text', name: 'nickname', label: 'Nickname', emptyAs: 'omit' },
  { type: 'number', name: 'age', label: 'Age', emptyAs: 'empty-string' },
  { type: 'text', name: 'address.city', label: 'City' },
  {
    type: 'text',
    name: 'vatNumber',
    label: 'VAT number',
    visibleWhen: (values: { isBusiness: boolean }) => values.isBusiness,
  },
  { type: 'checkbox', name: 'isBusiness', label: 'Business' },
  { type: 'multiselect', name: 'tags', label: 'Tags' },
  {
    type: 'array',
    name: 'contacts',
    label: 'Contacts',
    newItem: { email: '', phone: '' },
    fields: [
      { type: 'email', name: 'email', label: 'Email' },
      {
        type: 'phone',
        name: 'phone',
        label: 'Phone',
        visibleWhen: (item: { email: string }) => item.email !== '',
      },
    ],
  },
];

const defaults = {
  name: 'Ada',
  nickname: '',
  age: null,
  address: { city: 'London' },
  vatNumber: '',
  isBusiness: false,
  tags: [],
  contacts: [{ email: 'ada@example.com', phone: '' }],
};

describe('paths', () => {
  it('normalizes array indexes to brackets', () => {
    expect(normalizePath('contacts.0.email')).toBe('contacts[0].email');
    expect(normalizePath('contacts[0].email')).toBe('contacts[0].email');
    expect(normalizePath('address.city')).toBe('address.city');
    expect(itemPath('contacts', 2, 'email')).toBe('contacts[2].email');
  });

  it('turns JSON pointers into field paths', () => {
    expect(pointerToPath('/contacts/0/email')).toBe('contacts[0].email');
    expect(pointerToPath('#/address/city')).toBe('address.city');
    expect(pointerToPath('/a~1b/c~0d')).toBe('a/b.c~d');
  });
});

describe('findField', () => {
  it('finds top-level, nested and array item fields with their visibility', () => {
    expect(findField(fields, 'address.city', defaults)?.path).toBe('address.city');
    expect(findField(fields, 'vatNumber', defaults)?.isVisible).toBe(false);
    expect(findField(fields, 'vatNumber', { ...defaults, isBusiness: true })?.isVisible).toBe(true);
    const phone = findField(fields, 'contacts.0.phone', defaults);
    expect(phone?.path).toBe('contacts[0].phone');
    expect(phone?.isVisible).toBe(true);
    expect(
      findField(fields, 'contacts[0].phone', { ...defaults, contacts: [{ email: '', phone: '' }] })
        ?.isVisible,
    ).toBe(false);
    expect(findField(fields, 'unknown', defaults)).toBeUndefined();
  });
});

describe('values', () => {
  it('checks required values by type', () => {
    const field = (type: string) => ({ type, name: 'x', isRequired: true });
    expect(isMissingValue(field('checkbox'), false)).toBe(true);
    expect(isMissingValue(field('checkbox'), true)).toBe(false);
    expect(isMissingValue(field('text'), '   ')).toBe(true);
    expect(isMissingValue(field('number'), 0)).toBe(false);
    expect(isMissingValue(field('number'), null)).toBe(true);
    expect(isMissingValue(field('multiselect'), [])).toBe(true);
    expect(isMissingValue(field('date'), new CalendarDate(2026, 1, 1))).toBe(false);
  });

  it('applies emptyAs and leaves out hidden fields on submit', () => {
    const values = {
      ...defaults,
      name: '',
      vatNumber: 'GB123',
      contacts: [{ email: '', phone: '555' }],
    };
    const submitted = prepareSubmitValues(values, fields, {
      emptyAs: 'null',
      shouldSubmitHiddenFields: false,
    });
    expect(submitted.name).toBeNull();
    expect('nickname' in submitted).toBe(false);
    expect(submitted.age).toBe('');
    expect('vatNumber' in submitted).toBe(false);
    // Lists stay empty arrays unless the field sets emptyAs.
    expect(submitted.tags).toEqual([]);
    // Inside items: the empty email becomes null; the hidden phone is left out.
    expect(submitted.contacts).toEqual([{ email: null }]);
    // The original values aren't changed.
    expect(values.vatNumber).toBe('GB123');

    const withHidden = prepareSubmitValues(values, fields, {
      emptyAs: 'empty-string',
      shouldSubmitHiddenFields: true,
    });
    expect(withHidden.vatNumber).toBe('GB123');
    expect(withHidden.name).toBe('');
  });

  it('lists dirty fields by deep comparison and builds a patch of changes and clears', () => {
    const values = {
      ...defaults,
      name: '',
      address: { city: 'Paris' },
      tags: ['vip'],
      contacts: [{ email: 'ada@example.com', phone: '' }],
    };
    const options = { emptyAs: 'omit' as const, shouldSubmitHiddenFields: false };
    expect(getDirtyFields(values, defaults, fields, options)).toEqual([
      'name',
      'address.city',
      'tags',
    ]);
    // An unchanged copy of the contacts array isn't dirty.
    expect(buildPatch(values, defaults, fields, options)).toEqual({
      name: null,
      address: { city: 'Paris' },
      tags: ['vip'],
    });
  });
});

describe('validation', () => {
  it('runs built-in checks', () => {
    const check = (field: Parameters<typeof builtInError>[0], value: unknown) =>
      builtInError(field, value, defaultMessages);
    expect(check({ type: 'text', name: 'x', isRequired: true }, '')).toBe('Required');
    expect(check({ type: 'email', name: 'x' }, 'ada@')).toBe(defaultMessages.invalidEmail);
    expect(check({ type: 'email', name: 'x' }, 'ada@example.com')).toBeUndefined();
    expect(check({ type: 'email', name: 'x' }, '')).toBeUndefined();
    expect(check({ type: 'url', name: 'x' }, 'example.com')).toBe(defaultMessages.invalidUrl);
    expect(check({ type: 'url', name: 'x' }, 'https://example.com')).toBeUndefined();
    expect(check({ type: 'text', name: 'x', minLength: 3 }, 'ab')).toBe(
      'Use at least 3 characters',
    );
    expect(check({ type: 'array', name: 'x', minItems: 2 }, [1])).toBe('Add at least 2 items');
    expect(check({ type: 'array', name: 'x', maxItems: 1 }, [1, 2])).toBe('Use at most 1 item');
  });

  it('runs a sync validate in the sync validator', () => {
    const validators = createFieldValidators(
      { type: 'text', name: 'x', validate: (value: string) => (value === 'bad' ? 'No' : null) },
      () => ({}),
      () => defaultMessages,
    );
    expect(validators.onDynamic({ value: 'bad' })).toBe('No');
    expect(validators.onDynamic({ value: 'good' })).toBeUndefined();
  });

  it('moves an async validate to the async validator and reuses its first promise', async () => {
    let calls = 0;
    const validators = createFieldValidators(
      {
        type: 'text',
        name: 'x',
        validate: async (value: string) => {
          calls += 1;
          await Promise.resolve();
          return value === 'taken' ? 'Already taken' : undefined;
        },
      },
      () => ({}),
      () => defaultMessages,
    );
    expect(validators.onDynamic({ value: 'taken' })).toBeUndefined();
    const signal = new AbortController().signal;
    await expect(validators.onDynamicAsync?.({ value: 'taken', signal })).resolves.toBe(
      'Already taken',
    );
    expect(calls).toBe(1);
    // From now on only the async validator calls it.
    expect(validators.onDynamic({ value: 'free' })).toBeUndefined();
    await expect(validators.onDynamicAsync?.({ value: 'free', signal })).resolves.toBeUndefined();
    expect(calls).toBe(2);
  });

  it('maps schema issues to visible fields and puts the rest on the form', () => {
    const schema = z
      .object({
        name: z.string().min(1, 'Name is required'),
        vatNumber: z.string().min(1, 'VAT is required'),
        contacts: z.array(z.object({ email: z.email('Bad email'), phone: z.string() })),
        extra: z.string(),
      })
      .refine(() => false, { message: 'Whole form is wrong' });
    const values = { ...defaults, name: '', contacts: [{ email: 'nope', phone: '' }] };
    const result = schema['~standard'].validate(values);
    if (result instanceof Promise) {
      throw new Error('expected a sync schema');
    }
    const errors = schemaIssuesToErrors(result.issues ?? [], values, fields);
    expect(errors?.fields).toEqual({
      name: 'Name is required',
      'contacts[0].email': 'Bad email',
    });
    // `extra` has no field, so its message goes to the form; the hidden VAT number's issue is dropped.
    expect(errors?.form).toContain('expected string');
  });
});

describe('problem details', () => {
  it('maps field errors by pointer or name, and the detail to the form error', () => {
    expect(
      problemToSubmitResult({
        type: 'https://example.com/validation',
        title: 'Invalid request',
        detail: 'Some fields are invalid.',
        status: 422,
        errors: [
          { pointer: '/contacts/0/email', detail: 'Email is in use' },
          { name: 'address.city', detail: 'Unknown city' },
          { detail: 'Try again later' },
        ],
      }),
    ).toEqual({
      ok: false,
      formError: 'Some fields are invalid. Try again later',
      fieldErrors: { 'contacts[0].email': 'Email is in use', 'address.city': 'Unknown city' },
    });
    expect(problemToSubmitResult({ title: 'Conflict' })).toEqual({
      ok: false,
      formError: 'Conflict',
    });
    // A generic title adds nothing next to field errors.
    expect(
      problemToSubmitResult({
        title: 'Invalid request',
        errors: [{ pointer: '/name', detail: 'Taken' }],
      }),
    ).toEqual({ ok: false, fieldErrors: { name: 'Taken' } });
    expect(problemToSubmitResult('oops')).toEqual({ ok: false });
  });

  it('reads a fetch response', async () => {
    await expect(responseToSubmitResult(new Response(null, { status: 204 }))).resolves.toEqual({
      ok: true,
    });
    const problem = new Response(JSON.stringify({ detail: 'Nope', errors: [] }), {
      status: 400,
      headers: { 'content-type': 'application/problem+json' },
    });
    await expect(responseToSubmitResult(problem)).resolves.toEqual({
      ok: false,
      formError: 'Nope',
    });
    await expect(
      responseToSubmitResult(new Response('Bad gateway', { status: 502 })),
    ).resolves.toEqual({ ok: false });
  });
});
