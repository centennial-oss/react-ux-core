import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pencil, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/Button/Button';
import { ButtonGroup } from '../components/ButtonGroup/ButtonGroup';
import { Card } from '../components/Card/Card';
import { DialogTrigger } from '../components/Dialog/Dialog';
import { IconButton } from '../components/IconButton/IconButton';
import { DialogForm } from './containers/DialogForm';
import { WizardForm } from './containers/WizardForm';
import { problemToSubmitResult } from './problemDetails';
import type { FieldOption, FormConfig, SubmitContext, SubmitResult } from './types';

const meta = {
  title: 'Form/Sample CRUD',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Tariff {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  kind: string;
  flatRate: string | null;
  peakRate: string | null;
  offPeakRate: string | null;
}

type TariffValues = Omit<Tariff, 'id'>;

const countries: FieldOption[] = [
  { id: 'us', label: 'United States' },
  { id: 'ca', label: 'Canada' },
];

const regions: Record<string, FieldOption[]> = {
  us: [
    { id: 'co', label: 'Colorado' },
    { id: 'tx', label: 'Texas' },
  ],
  ca: [
    { id: 'ab', label: 'Alberta' },
    { id: 'on', label: 'Ontario' },
  ],
};

const emptyTariff: TariffValues = {
  name: '',
  country: 'us',
  region: null,
  kind: 'flat',
  flatRate: null,
  peakRate: null,
  offPeakRate: null,
};

const tariffFields: FormConfig<TariffValues>['fields'] = [
  {
    type: 'text',
    name: 'name',
    label: 'Name',
    isRequired: true,
    description: 'Try an existing name, or “conflict”, to see server errors.',
  },
  { type: 'select', name: 'country', label: 'Country', items: countries, isRequired: true },
  {
    type: 'select',
    name: 'region',
    label: 'Region',
    isRequired: true,
    items: (values: TariffValues) => regions[values.country ?? ''] ?? [],
    dependsOn: { fields: ['country'], onChange: 'reset' },
  },
  {
    type: 'pillbox',
    name: 'kind',
    label: 'Pricing',
    items: [
      { id: 'flat', label: 'Flat' },
      { id: 'tou', label: 'Time of use' },
    ],
  },
  {
    type: 'money',
    name: 'flatRate',
    label: 'Rate per kWh',
    currency: 'USD',
    minorUnits: 4,
    isRequired: true,
    visibleWhen: (values: TariffValues) => values.kind === 'flat',
    description: 'Above $1.0000 asks for confirmation.',
  },
  {
    type: 'money',
    name: 'peakRate',
    label: 'Peak rate per kWh',
    currency: 'USD',
    minorUnits: 4,
    isRequired: true,
    visibleWhen: (values: TariffValues) => values.kind === 'tou',
  },
  {
    type: 'money',
    name: 'offPeakRate',
    label: 'Off-peak rate per kWh',
    currency: 'USD',
    minorUnits: 4,
    isRequired: true,
    visibleWhen: (values: TariffValues) => values.kind === 'tou',
  },
];

const tariffLayout: FormConfig<TariffValues>['layout'] = [
  { id: 'where', columns: 2, fields: ['name', 'kind', 'country', 'region'] },
  { id: 'price', title: 'Price', columns: 2, fields: ['flatRate', 'peakRate', 'offPeakRate'] },
];

/** A pretend server: unique names, a conflict, and a confirmation for high rates. */
async function save(
  existing: readonly Tariff[],
  values: TariffValues,
  context: SubmitContext<TariffValues>,
  id?: string,
): Promise<SubmitResult> {
  await wait(500);
  if (values.name.trim().toLowerCase() === 'conflict') {
    return problemToSubmitResult({
      type: 'https://example.com/problems/conflict',
      title: 'Conflict',
      detail: 'Someone else changed this tariff. Reload it and try again.',
      status: 409,
    });
  }
  if (existing.some((tariff) => tariff.id !== id && tariff.name === values.name.trim())) {
    return problemToSubmitResult({
      title: 'Invalid tariff',
      status: 422,
      errors: [{ pointer: '/name', detail: 'A tariff with this name already exists' }],
    });
  }
  const highest = Math.max(
    ...[values.flatRate, values.peakRate, values.offPeakRate].map((rate) => Number(rate ?? 0)),
  );
  if (highest > 1 && !context.isConfirmed) {
    return {
      ok: 'confirm',
      warning: 'That rate is above $1 per kWh. Save it anyway?',
      confirmLabel: 'Save anyway',
    };
  }
  return { ok: true, message: id === undefined ? 'Tariff created' : 'Tariff saved' };
}

function formatRate(tariff: Tariff): string {
  const money = (rate: string | null) => (rate === null ? '—' : `$${rate}`);
  return tariff.kind === 'flat'
    ? `${money(tariff.flatRate)} / kWh`
    : `${money(tariff.peakRate)} peak · ${money(tariff.offPeakRate)} off-peak`;
}

function TariffsApp() {
  const [tariffs, setTariffs] = useState<Tariff[]>([
    {
      id: 't1',
      name: 'Residential flat',
      country: 'us',
      region: 'co',
      kind: 'flat',
      flatRate: '0.1420',
      peakRate: null,
      offPeakRate: null,
    },
    {
      id: 't2',
      name: 'EV night saver',
      country: 'ca',
      region: 'on',
      kind: 'tou',
      flatRate: null,
      peakRate: '0.2100',
      offPeakRate: '0.0800',
    },
  ]);
  const [nextId, setNextId] = useState(3);

  const add = (values: TariffValues) => {
    setTariffs((list) => [...list, { ...emptyTariff, ...values, id: `t${String(nextId)}` }]);
    setNextId((id) => id + 1);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-fg">Tariffs</h2>
        <ButtonGroup>
          <DialogTrigger>
            <Button variant="outline" icon={Sparkles}>
              Guided setup
            </Button>
            <WizardForm<TariffValues>
              title="Set up a tariff"
              hasSummaryStep
              steps={[
                { id: 'where', title: 'Where it applies', fields: ['name', 'country', 'region'] },
                {
                  id: 'price',
                  title: 'Price',
                  fields: ['kind', 'flatRate', 'peakRate', 'offPeakRate'],
                },
              ]}
              config={{
                defaultValues: emptyTariff,
                fields: tariffFields,
                actions: {
                  create: (values, context) => save(tariffs, values, context),
                  submitLabel: 'Create tariff',
                },
              }}
              onSuccess={({ values }) => {
                add(values);
              }}
            />
          </DialogTrigger>
          <DialogTrigger>
            <Button tone="accent" icon={Plus}>
              New tariff
            </Button>
            <DialogForm<TariffValues>
              title="New tariff"
              size="lg"
              config={{
                defaultValues: emptyTariff,
                fields: tariffFields,
                layout: tariffLayout,
                actions: { create: (values, context) => save(tariffs, values, context) },
              }}
              onSuccess={({ values }) => {
                add(values);
              }}
            />
          </DialogTrigger>
        </ButtonGroup>
      </div>
      {tariffs.length === 0 ? (
        <p className="text-sm text-fg-muted">No tariffs yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tariffs.map((tariff) => {
            const { id, ...values } = tariff;
            return (
              <li key={id}>
                <Card
                  title={tariff.name}
                  description={formatRate(tariff)}
                  actions={
                    <DialogTrigger>
                      <IconButton
                        icon={Pencil}
                        aria-label={`Edit ${tariff.name}`}
                        variant="ghost"
                      />
                      <DialogForm<TariffValues>
                        title={`Edit ${tariff.name}`}
                        size="lg"
                        config={{
                          defaultValues: values,
                          fields: tariffFields,
                          layout: tariffLayout,
                          actions: {
                            update: (next, context) => save(tariffs, next, context, id),
                            delete: async () => {
                              await wait(400);
                              return { ok: true, message: 'Tariff deleted' };
                            },
                            deleteConfirmation: {
                              title: `Delete ${tariff.name}?`,
                              body: 'Sites on this tariff fall back to the default tariff.',
                            },
                          },
                        }}
                        onSuccess={(event) => {
                          setTariffs((list) =>
                            event.action === 'delete'
                              ? list.filter((item) => item.id !== id)
                              : list.map((item) =>
                                  item.id === id ? { ...item, ...event.values } : item,
                                ),
                          );
                        }}
                      />
                    </DialogTrigger>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * A small CRUD screen built from one tariff config: create and edit in dialogs (with Delete), a guided wizard, and
 * a pretend server that rejects duplicate names (a field error from problem+json), reports a conflict (a form
 * error) and asks to confirm rates above $1. The region list follows the country and resets with it; the rate
 * fields follow the pricing type.
 */
export const Tariffs: Story = {
  tags: ['!visual'],
  render: () => <TariffsApp />,
};
