// Type tests: compiled by `make typecheck`, not run (WID-01, DATA-04, TEST-05).
import { statsShape, type StatsData } from './data/shapes';
import { defineDataSource, defineWidget, widgetFromComponent } from './widgets/define';

// A type alias (not an interface) is a JSON object as it is, and keeps the options exact.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- see above.
type ClockOptions = { label: string; hours: number };

/** `defineWidget` infers the options and data types for the component, with no casts. */
export const clock = defineWidget({
  type: 'acme.clock',
  displayName: 'Clock',
  dataShape: 'stats',
  defaultSize: { w: 2, h: 2 },
  defaultOptions: { label: 'Now', hours: 24 } satisfies ClockOptions,
  component: ({ displayOptions: options, dataState: data }) => {
    const label: string = options.label;
    const hours: number = options.hours;
    // @ts-expect-error options are typed: there is no `minutes` option.
    const minutes: unknown = options.minutes;
    return data.status === 'success' ? (
      <p>{`${label} ${String(hours)} ${String(minutes)}`}</p>
    ) : null;
  },
  optionsEditor: ({ value, onChange }) => {
    // The editor gets the same options type.
    const hours: number = value.hours;
    onChange({ ...value, hours: hours + 1 });
    return null;
  },
});

/** A source with `load` infers its data type from what `load` returns. */
export const counts = defineDataSource({
  id: 'counts',
  label: 'Counts',
  produces: 'stats',
  defaultParams: { site: 'north' },
  load: async ({ params }) => {
    const site: string = params.site;
    return Promise.resolve({ items: [{ label: site, value: 1 }] } satisfies StatsData);
  },
});

/** A source with `fetch` and `transform` infers the raw type from `fetch` and the data type from `transform`. */
export const fetched = defineDataSource({
  id: 'fetched',
  label: 'Fetched',
  produces: 'stats',
  fetch: () => Promise.resolve([{ name: 'a', total: 3 }]),
  transform: (raw) => ({ items: raw.map((row) => ({ label: row.name, value: row.total })) }),
});

/** A source can't have both `load` and `fetch`. */
export const both = defineDataSource({
  id: 'both',
  label: 'Both',
  produces: 'stats',
  load: () => Promise.resolve({ items: [] }),
  // @ts-expect-error either load, or fetch and transform.
  fetch: () => Promise.resolve([]),
});

/** `fetch` needs a `transform`. */
// @ts-expect-error fetch without transform.
export const fetchOnly = defineDataSource({
  id: 'fetchOnly',
  label: 'Fetch only',
  produces: 'stats',
  fetch: () => Promise.resolve([]),
});

function Total({ total, label }: { total: number; label: string }) {
  return <p>{`${label}: ${String(total)}`}</p>;
}

/** `widgetFromComponent` infers the data type from the shape and checks `toProps` against the component's props. */
export const total = widgetFromComponent({
  type: 'acme.total',
  displayName: 'Total',
  dataShape: statsShape,
  defaultSize: { w: 2, h: 2 },
  defaultOptions: { label: 'Total' },
  component: Total,
  toProps: (data, options) => ({
    label: options.label,
    total:
      data?.items.reduce(
        (sum, item) => sum + (typeof item.value === 'number' ? item.value : 0),
        0,
      ) ?? 0,
  }),
});

export const wrongProps = widgetFromComponent({
  type: 'acme.wrong',
  displayName: 'Wrong',
  dataShape: statsShape,
  defaultSize: { w: 2, h: 2 },
  defaultOptions: { label: 'Total' },
  component: Total,
  // @ts-expect-error toProps must return the component's props.
  toProps: () => ({ label: 'x' }),
});
