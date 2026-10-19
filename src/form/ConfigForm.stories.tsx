import { CalendarDate, Time, parseAbsolute } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2, Home } from 'lucide-react';
import { z } from 'zod';
import { ConfigForm } from './ConfigForm';
import type { FieldOption, FormConfig, SubmitResult } from './types';

const meta = {
  title: 'Form/ConfigForm',
  component: ConfigForm,
  parameters: { layout: 'padded' },
  // Each story renders its own typed config; this only satisfies the required prop.
  args: { config: { defaultValues: {}, fields: [] } },
} satisfies Meta<typeof ConfigForm>;
export default meta;
type Story = StoryObj<typeof meta>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const saved = async (): Promise<SubmitResult> => {
  await wait(600);
  return { ok: true, message: 'Saved' };
};

const tariffs: FieldOption[] = [
  { id: 'flat', label: 'Flat rate' },
  { id: 'tou', label: 'Time of use', description: 'Cheaper at night' },
  { id: 'demand', label: 'Demand charge' },
];

interface Everything {
  name: string;
  email: string;
  phone: string;
  website: string;
  password: string;
  notes: string;
  capacity: number | null;
  deposit: string | null;
  discount: number | null;
  tariff: string | null;
  owner: string | null;
  tags: string[];
  channels: string[];
  billing: string | null;
  kind: string;
  isActive: boolean;
  hasAlerts: boolean;
  startsOn: CalendarDate | null;
  period: { start: CalendarDate; end: CalendarDate } | null;
  readAt: Time | null;
  installedAt: ReturnType<typeof parseAbsolute> | null;
  window: { kind: 'relative'; from: string; to: string } | null;
}

const owners: FieldOption[] = [
  { id: 'ada', label: 'Ada Lovelace' },
  { id: 'grace', label: 'Grace Hopper' },
  { id: 'katherine', label: 'Katherine Johnson' },
];

const everything: FormConfig<Everything> = {
  defaultValues: {
    name: 'North substation',
    email: 'ops@example.com',
    phone: '',
    website: 'https://example.com',
    password: '',
    notes: '',
    capacity: 250,
    deposit: '1200.00',
    discount: 0.1,
    tariff: 'tou',
    owner: 'grace',
    tags: ['vip'],
    channels: ['email'],
    billing: 'monthly',
    kind: 'home',
    isActive: true,
    hasAlerts: false,
    startsOn: new CalendarDate(2026, 3, 14),
    period: { start: new CalendarDate(2026, 3, 1), end: new CalendarDate(2026, 3, 31) },
    readAt: new Time(7, 30),
    installedAt: parseAbsolute('2026-03-14T16:30:00Z', 'America/Denver'),
    window: { kind: 'relative', from: '-24h', to: 'now' },
  },
  layout: [
    {
      id: 'text',
      title: 'Text',
      columns: 2,
      fields: ['name', 'email', 'phone', 'website', 'password', 'notes'],
    },
    {
      id: 'numbers',
      title: 'Numbers',
      columns: 3,
      fields: ['capacity', 'deposit', 'discount'],
    },
    {
      id: 'choices',
      title: 'Choices',
      columns: 2,
      fields: ['tariff', 'owner', 'tags', 'kind', 'channels', 'billing', 'isActive', 'hasAlerts'],
    },
    {
      id: 'dates',
      title: 'Dates and times',
      columns: 2,
      fields: ['startsOn', 'period', 'readAt', 'installedAt', 'window'],
    },
  ],
  fields: [
    { type: 'text', name: 'name', label: 'Name', isRequired: true },
    { type: 'email', name: 'email', label: 'Email' },
    { type: 'phone', name: 'phone', label: 'Phone', description: 'Include the country code.' },
    { type: 'url', name: 'website', label: 'Website' },
    { type: 'password', name: 'password', label: 'Access code' },
    {
      type: 'textarea',
      name: 'notes',
      label: 'Notes',
      colSpan: 'full',
      hasCharacterCount: true,
      maxLength: 200,
    },
    { type: 'number', name: 'capacity', label: 'Capacity', unit: 'kW', minValue: 0 },
    { type: 'money', name: 'deposit', label: 'Deposit', currency: 'USD' },
    {
      type: 'percent',
      name: 'discount',
      label: 'Discount',
      maxValue: 1,
      infoTip: 'Applied before taxes.',
    },
    { type: 'select', name: 'tariff', label: 'Tariff', items: tariffs },
    { type: 'combobox', name: 'owner', label: 'Owner', items: owners },
    {
      type: 'multiselect',
      name: 'tags',
      label: 'Tags',
      items: [
        { id: 'vip', label: 'VIP' },
        { id: 'solar', label: 'Solar' },
        { id: 'ev', label: 'EV charging' },
      ],
    },
    {
      type: 'pillbox',
      name: 'kind',
      label: 'Site type',
      items: [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'business', label: 'Business', icon: Building2 },
      ],
    },
    {
      type: 'checkboxGroup',
      name: 'channels',
      label: 'Alert channels',
      items: [
        { id: 'email', label: 'Email' },
        { id: 'sms', label: 'Text message' },
      ],
    },
    {
      type: 'radio',
      name: 'billing',
      label: 'Billing',
      items: [
        { id: 'monthly', label: 'Monthly' },
        { id: 'quarterly', label: 'Quarterly' },
      ],
    },
    { type: 'switch', name: 'isActive', label: 'Active' },
    { type: 'checkbox', name: 'hasAlerts', label: 'Send outage alerts' },
    { type: 'date', name: 'startsOn', label: 'Starts on' },
    { type: 'dateRange', name: 'period', label: 'Billing period' },
    { type: 'time', name: 'readAt', label: 'Daily reading at' },
    { type: 'dateTime', name: 'installedAt', label: 'Installed', timeZone: 'America/Denver' },
    { type: 'timeRange', name: 'window', label: 'Chart window' },
  ],
  actions: { update: saved },
};

/**
 * Every built-in field type, in sections with columns (one column on phones, or whenever the form itself is
 * narrow). Change anything to see Revert; Save shows the pending state and a success toast.
 */
export const AllFieldTypes: Story = {
  render: () => <ConfigForm config={everything} />,
};

interface Signup {
  username: string;
  email: string;
  password: string;
  confirm: string;
  hasAcceptedTerms: boolean;
}

const validationConfig: FormConfig<Signup> = {
  defaultValues: {
    username: '',
    email: '',
    password: '',
    confirm: '',
    hasAcceptedTerms: false,
  },
  schema: z
    .object({
      username: z.string(),
      email: z.string(),
      password: z.string().min(8, 'Use at least 8 characters'),
      confirm: z.string(),
      hasAcceptedTerms: z.boolean(),
    })
    .refine((values) => values.password === values.confirm, {
      path: ['confirm'],
      message: 'The passwords don’t match',
    }),
  fields: [
    {
      type: 'text',
      name: 'username',
      label: 'Username',
      isRequired: true,
      validate: async (value: string) => {
        await wait(400);
        return value.toLowerCase() === 'taken' ? 'That username is taken' : undefined;
      },
    },
    { type: 'email', name: 'email', label: 'Email', isRequired: true },
    { type: 'password', name: 'password', label: 'Password', isRequired: true },
    { type: 'password', name: 'confirm', label: 'Confirm password', isRequired: true },
    {
      type: 'checkbox',
      name: 'hasAcceptedTerms',
      label: 'I accept the terms',
      isRequired: true,
    },
  ],
  actions: { create: saved },
};

/**
 * Validation: required fields, formats, a cross-field schema rule (Zod) and an async check ("taken" is taken).
 * Errors appear when you leave a field, then update as you type; Create focuses the first problem.
 */
export const Validation: Story = {
  tags: ['!visual'],
  render: () => <ConfigForm config={validationConfig} />,
};

interface Site {
  name: string;
  country: string | null;
  region: string | null;
  meter: string | null;
  isBusiness: boolean;
  vatNumber: string;
}

const regionsByCountry: Record<string, FieldOption[]> = {
  us: [
    { id: 'co', label: 'Colorado' },
    { id: 'tx', label: 'Texas' },
  ],
  ca: [
    { id: 'ab', label: 'Alberta' },
    { id: 'on', label: 'Ontario' },
  ],
};

const dependentFieldsConfig: FormConfig<Site> = {
  defaultValues: {
    name: '',
    country: 'us',
    region: 'co',
    meter: null,
    isBusiness: false,
    vatNumber: '',
  },
  fields: [
    { type: 'text', name: 'name', label: 'Site name' },
    {
      type: 'select',
      name: 'country',
      label: 'Country',
      items: [
        { id: 'us', label: 'United States' },
        { id: 'ca', label: 'Canada' },
      ],
    },
    {
      type: 'select',
      name: 'region',
      label: 'Region',
      items: (values: Site) => regionsByCountry[values.country ?? ''] ?? [],
      dependsOn: { fields: ['country'], onChange: 'reset' },
    },
    {
      type: 'select',
      name: 'meter',
      label: 'Meter',
      loadItems: async (_query: string, values: Site) => {
        await wait(300);
        return values.region === null
          ? []
          : [1, 2, 3].map((n) => ({
              id: `${values.region ?? ''}-${String(n)}`,
              label: `${(values.region ?? '').toUpperCase()} meter ${String(n)}`,
            }));
      },
      dependsOn: { fields: ['region'], onChange: 'reload' },
    },
    { type: 'switch', name: 'isBusiness', label: 'Business customer' },
    {
      type: 'text',
      name: 'vatNumber',
      label: 'VAT number',
      isRequired: true,
      visibleWhen: (values: Site) => values.isBusiness,
    },
  ],
  actions: { create: saved },
};

/**
 * Dependent and conditional fields: the region list follows the country (and resets with it, in the same update),
 * the meter list reloads for the region, and the VAT number shows only for businesses.
 */
export const DependentFields: Story = {
  // The meter list loads after a delay, so a snapshot could catch it loading.
  tags: ['!visual'],
  render: () => <ConfigForm config={dependentFieldsConfig} />,
};

interface Contacts {
  contacts: { name: string; email: string; isPrimary: boolean }[];
}

const arraysConfig: FormConfig<Contacts> = {
  defaultValues: {
    contacts: [
      { name: 'Ada Lovelace', email: 'ada@example.com', isPrimary: true },
      { name: 'Grace Hopper', email: 'grace@example.com', isPrimary: false },
    ],
  },
  fields: [
    {
      type: 'array',
      name: 'contacts',
      label: 'Contacts',
      description: 'Up to four people we can reach about this site.',
      minItems: 1,
      maxItems: 4,
      columns: 2,
      addLabel: 'Add contact',
      newItem: () => ({ name: '', email: '', isPrimary: false }),
      itemLabel: (item) => (item.name === '' ? 'New contact' : item.name),
      isCollapsible: true,
      fields: [
        { type: 'text', name: 'name', label: 'Name', isRequired: true },
        { type: 'email', name: 'email', label: 'Email', isRequired: true },
        { type: 'checkbox', name: 'isPrimary', label: 'Primary contact' },
      ],
    },
  ],
  actions: { update: saved },
};

/** A repeating group: add, remove and reorder with buttons (keyboard operable), with limits. */
export const Arrays: Story = {
  render: () => <ConfigForm config={arraysConfig} />,
};

interface Documents {
  contract: File | string | null;
  photos: (File | string)[];
}

const fakeUpload = (
  file: File,
  { onProgress, signal }: { onProgress: (p: number) => void; signal: AbortSignal },
) =>
  new Promise<string>((resolve, reject) => {
    let progress = 0;
    const tick = () => {
      if (signal.aborted) {
        reject(new DOMException('Cancelled', 'AbortError'));
        return;
      }
      progress += 0.2;
      onProgress(progress);
      if (progress >= 1) {
        if (file.name.includes('fail')) {
          reject(new Error(`The server rejected ${file.name}`));
        } else {
          resolve(`stored/${file.name}`);
        }
      } else {
        setTimeout(tick, 250);
      }
    };
    setTimeout(tick, 250);
  });

const fileUploadsConfig: FormConfig<Documents> = {
  defaultValues: { contract: 'stored/contract-2025.pdf', photos: [] },
  fields: [
    {
      type: 'file',
      name: 'contract',
      label: 'Signed contract',
      accept: ['application/pdf'],
      upload: fakeUpload,
      describeFile: (reference) => ({ name: String(reference).replace('stored/', '') }),
    },
    {
      type: 'files',
      name: 'photos',
      label: 'Site photos',
      accept: ['image/*'],
      maxFiles: 5,
      upload: fakeUpload,
      describeFile: (reference) => ({ name: String(reference).replace('stored/', '') }),
    },
  ],
  actions: { update: saved },
};

/**
 * Files upload when the form is submitted, before the action runs, with progress (remove a file to cancel its
 * upload). A file named with "fail" fails the submit with a field error; files already uploaded aren't uploaded
 * again on retry.
 */
export const FileUploads: Story = {
  tags: ['!visual'],
  render: () => <ConfigForm config={fileUploadsConfig} />,
};

/**
 * View mode shows the same config read-only, as a description list. With the edit toggle, Edit switches to the form
 * in place, and Save or Cancel switch back.
 */
export const ViewMode: Story = {
  render: () => <ConfigForm config={everything} defaultMode="view" hasEditToggle />,
};

interface Announcement {
  recipients: string[];
  topics: string[];
}

const tagsConfig: FormConfig<Announcement> = {
  defaultValues: { recipients: ['ops@example.com', 'billing@example'], topics: ['Outages'] },
  fields: [
    {
      type: 'tags',
      name: 'recipients',
      label: 'Recipients',
      description: 'Paste a list, or press Enter after each address.',
      isRequired: true,
      maxItems: 10,
      validateTag: (tag) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tag) ? undefined : 'Not an email'),
    },
    {
      type: 'tags',
      name: 'topics',
      label: 'Topics',
      suggestions: ['Billing', 'Maintenance', 'Outages', 'Rates', 'Safety'],
      allowsCustomValue: false,
      isReorderable: true,
    },
  ],
  actions: { create: saved },
};

/**
 * `tags` fields hold lists of strings. `validateTag` checks each tag (an invalid one fails the field), and
 * `suggestions` with `allowsCustomValue: false` restrict tags to a list.
 */
export const TagsFields: Story = {
  tags: ['!visual'],
  render: () => <ConfigForm config={tagsConfig} />,
};
