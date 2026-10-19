import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UIProvider } from '../../provider/UIProvider';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import { statsShape, type StatsData } from '../data/shapes';
import {
  createWidgetRegistry,
  defineDataSource,
  defineWidget,
  widgetFromComponent,
} from './define';
import { migrateInstanceOptions, resolveOptions } from './options';

function Note({ text }: { text: string }) {
  return <p>{text}</p>;
}

const note = defineWidget<{ prefix: string }, null>({
  type: 'test.note',
  displayName: 'Note',
  dataShape: null,
  defaultSize: { w: 2, h: 2 },
  defaultOptions: { prefix: '' },
  component: ({ displayOptions }) => <p>{displayOptions.prefix}</p>,
});

describe('createWidgetRegistry (WID-02)', () => {
  it('finds types by id, in registration order', () => {
    const registry = createWidgetRegistry([note]);
    expect(registry.get('test.note')).toBe(note);
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.types).toEqual([note]);
  });

  it('throws on a repeated type in development', () => {
    expect(() => createWidgetRegistry([note, { ...note }])).toThrow(/registered twice/);
  });
});

describe('defineDataSource (DATA-04)', () => {
  it('warns in development when a source has no loader, or both kinds', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    defineDataSource({ id: 'none', label: 'None', produces: 'stats' } as never);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"none" needs either load'));
    warn.mockRestore();
  });
});

describe('widgetFromComponent (WID-04)', () => {
  it('turns a component into a widget type with a pure toProps', async () => {
    const counts = widgetFromComponent<{ suffix: string }, StatsData, { text: string }>({
      type: 'test.counts',
      displayName: 'Counts',
      dataShape: statsShape,
      defaultSize: { w: 2, h: 2 },
      defaultOptions: { suffix: ' items' },
      component: Note,
      toProps: (data, options, env) => ({
        text: `${env.title}: ${String(data?.items.length ?? 0)}${options.suffix}`,
      }),
    });
    expect(counts.dataShape).toBe('stats');
    render(
      <UIProvider>
        <DashboardWidget
          type={counts}
          title="Tiles"
          load={() => Promise.resolve({ items: [{ label: 'a', value: 1 }] })}
        />
      </UIProvider>,
    );
    expect(await screen.findByText('Tiles: 1 items')).toBeTruthy();
  });
});

describe('options (MOD-06)', () => {
  const versioned = defineWidget<{ unit: string; digits: number }, null>({
    type: 'test.versioned',
    displayName: 'Versioned',
    dataShape: null,
    defaultSize: { w: 2, h: 2 },
    defaultOptions: { unit: 'kWh', digits: 2 },
    optionsVersion: 2,
    migrateOptions: (stored, fromVersion) => ({
      unit: fromVersion < 2 && typeof stored.units === 'string' ? stored.units : 'kWh',
      digits: typeof stored.digits === 'number' ? stored.digits : 2,
    }),
    component: () => null,
  });

  it('migrates older options before applying defaults, and stamps the version for saving', () => {
    const instance = {
      id: 'w',
      type: 'test.versioned',
      layout: { w: 2, h: 2 },
      options: { units: 'MWh' },
    };
    expect(resolveOptions(versioned, instance)).toEqual({ unit: 'MWh', digits: 2 });
    expect(migrateInstanceOptions(versioned, instance)).toEqual({
      ...instance,
      options: { unit: 'MWh', digits: 2 },
      optionsVersion: 2,
    });
    const current = { ...instance, optionsVersion: 2 };
    expect(migrateInstanceOptions(versioned, current)).toBe(current);
  });
});
