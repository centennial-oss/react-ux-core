# react-ux-core

Accessible, themeable React components for data-heavy operational web apps: admin consoles, monitoring and back-office
tools. From [Centennial OSS](https://github.com/centennial-oss). These will always be 100% free with no charge, upcharge,
monetization or analytics/tracking.

## About

react-ux-core provides:

- accessible **primitives** (buttons, inputs, menus, dialogs, toasts) built on [React Aria](https://react-aria.adobe.com);
- a **declarative form engine** that renders forms from field configs;
- a **data table** with server-side paging, sorting and filtering;
- **time-series and category charts**;
- an **app shell kit** (sidebar, header, scope picker, page header, bottom tab bar, status bar).

Every component works on phones, tablets and desktops, with touch, mouse or keyboard, in light, dark and high-contrast
themes. The library holds no app state: no router, auth, data fetching or storage. Your app passes those in.

## Installation

```bash
npm install @centennial-oss/react-ux-core react-aria-components lucide-react
```

`react` and `react-dom` 19, `react-aria-components`, `@internationalized/date` and `lucide-react` are peer
dependencies. Your app also needs [Tailwind CSS v4](https://tailwindcss.com).

The other entry points need their own libraries, installed only when you use them:

```bash
# Forms (@centennial-oss/react-ux-core/form)
npm install @tanstack/react-form
# Tables (@centennial-oss/react-ux-core/table)
npm install @tanstack/react-table @tanstack/react-virtual
# Charts (@centennial-oss/react-ux-core/chart; the "View as table" view uses the table libraries too)
npm install chart.js chartjs-plugin-zoom chartjs-adapter-luxon luxon @tanstack/react-table @tanstack/react-virtual
```

The app shell (`@centennial-oss/react-ux-core/shell`) needs nothing extra.

```bash
# Maps (@centennial-oss/react-ux-core/map)
npm install maplibre-gl
```

### Styles

Import the library's styles after Tailwind in your main stylesheet:

```css
@import 'tailwindcss';
@import '@centennial-oss/react-ux-core/styles.css';
```

That adds the design tokens (as Tailwind theme variables and utilities such as `bg-surface-2` and `text-fg-muted`), the
light, dark and high-contrast themes, and the utilities the components use. The stylesheet registers the package's
own files as a Tailwind `@source`, so you don't need to add one.

For full-height layouts on phones, use `viewport-fit=cover` in your viewport meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### Provider

Wrap your app in `UIProvider`:

```tsx
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import {
  Button,
  UIProvider,
  type LinkComponentProps,
  type ThemePreference,
} from '@centennial-oss/react-ux-core';

// Render the library's links through your router.
function AppLink({ href, ...props }: LinkComponentProps) {
  return <RouterLink to={href} {...props} />;
}

export function App() {
  const [theme, setTheme] = useState<ThemePreference>(() => loadSavedTheme() ?? 'system');

  return (
    <UIProvider
      locale="en-US"
      timeZone="America/Chicago"
      LinkComponent={AppLink}
      themePreference={theme}
      onThemePreferenceChange={(next) => {
        setTheme(next);
        saveTheme(next); // persisting the preference is up to your app
      }}
    >
      <Button tone="accent" onPress={() => save()}>
        Save
      </Button>
    </UIProvider>
  );
}
```

`UIProvider` also takes `messages`, to override or translate the library's own UI strings ("Close", "Clear all", and
so on). Pass a stable object, for example one defined outside your component.

## Entry Points

| Import                                     | Contents                                                        | Status    |
| ------------------------------------------ | --------------------------------------------------------------- | --------- |
| `@centennial-oss/react-ux-core`            | `UIProvider`, theme hooks, primitives, overlays, toasts, inputs | Available |
| `@centennial-oss/react-ux-core/styles.css` | Tokens, themes, base layer, utilities                           | Available |
| `@centennial-oss/react-ux-core/form`       | `ConfigForm` and its containers, field registry                 | Available |
| `@centennial-oss/react-ux-core/table`      | `DataTable`, `TableToolbar`, filters, cell helpers              | Available |
| `@centennial-oss/react-ux-core/chart`      | `TimeSeriesChart`, `CategoryChart`, `HourOfDayChart`, `Gauge`   | Available |
| `@centennial-oss/react-ux-core/map`        | `Map`                                                           | Available |
| `@centennial-oss/react-ux-core/shell`      | `AppShell`, `Sidebar`, `Header`, `HierarchyPicker`, and more    | Available |

The form, table, chart and map entry points have their own optional peer dependencies, so apps that don't use them
don't install them.

The main entry point has these components so far:

- **Actions:** `Button`, `IconButton`, `ButtonGroup`
- **Menus and overlays:** `Menu`, `MenuButton`, `SplitButton`, `OverflowMenu`, `Popover`, `Tooltip`, `InfoTip`,
  `Dialog`, `Drawer`, `ConfirmDialog`, `StepDialog`
- **Feedback:** toasts (`useToast`), `Banner`, `Spinner`, `Skeleton`, `ProgressBar`, `EmptyState`, `ErrorState`
- **Layout and display:** `Stack`, `Inline`, `Grid`, `Spacer`, `Text`, `Heading`, `ScrollRegion`, `Card`,
  `Disclosure`, `Accordion`, `CollapsibleCard`, `StatTile`, `DescriptionList`, `Tabs`, `Pillbox`, `Badge`, `Chip`,
  `StatusDot`, `RelativeTime`, `Sparkline`, `Breadcrumbs`, `Tree`, `Separator`, `VisuallyHidden`, `Kbd`,
  `Checklist` (steps with a status and progress), `SecretReveal` (credentials shown once), `Flag` (see below)
- **Inputs:** `TextField`, `NumberField`, `TextArea`, `SearchField`, `Select`, `ComboBox`, `MultiSelect`,
  `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `Slider`, `RangeSlider`, `DatePicker`, `DateRangePicker`,
  `DateTimePicker`, `TimeField`, `TimeRangePicker`, `FileField`, `DropZone`, `ScheduleEditor` (a daily schedule with a
  24-hour preview), `TierEditor` (contiguous numeric tiers), `ColorField`, `IconPicker`, `FlagPicker`, `TilePicker` (the
  searchable grid of tiles in titled rows that IconPicker and FlagPicker are built on, with `TileGrid` for inline
  use), `JsonEditor` (checked as you type, with formatting), `TemplateEditor` (an SMS template with `{{keyword}}` suggestions and a live example)

`Flag` and `FlagPicker` show countries your app registers. The library knows four (the United States, France, China
and Brazil) as a reference; register the rest, with any fields of your own, through `FlagProvider`, and serve the flag
images yourself, as `/images/flags/<code>.svg` by default. The MIT-licensed
[flag-icons](https://github.com/lipis/flag-icons) set has an SVG for every ISO 3166-1 code.

```tsx
interface AppCountry extends CountryInfo {
  currency: string;
}

const countries: AppCountry[] = [
  { code: 'de', name: 'Germany', nativeName: 'Deutschland', languages: ['de'], currency: 'EUR' },
];

<FlagProvider countries={countries} basePath="/static/flags">
  <Flag country="Germany" details={['name', 'languages']} />
  <FlagPicker<AppCountry>
    label="Country"
    rows={[{ id: 'europe', title: 'Europe', countries: ['fr', 'de'] }]}
    onChange={(code, country) => setCurrency(country?.currency)}
  />
</FlagProvider>;
```

The form entry point has `ConfigForm`, its containers (`DialogForm`, `CardForm`, `PageForm`, `WizardForm`), the
field registry (`createFieldRegistry`), `UnsavedChangesDialog`, and the `createPatch`, `problemToSubmitResult` and
`responseToSubmitResult` helpers. A form is described as data:

```tsx
import {
  ConfigForm,
  responseToSubmitResult,
  type FormConfig,
} from '@centennial-oss/react-ux-core/form';

interface Site {
  name: string;
  capacity: number | null;
}

const siteForm: FormConfig<Site> = {
  defaultValues: { name: '', capacity: null },
  fields: [
    { type: 'text', name: 'name', label: 'Name', isRequired: true },
    { type: 'number', name: 'capacity', label: 'Capacity', unit: 'kW' },
  ],
  actions: {
    create: async (values) =>
      responseToSubmitResult(
        await fetch('/api/sites', { method: 'POST', body: JSON.stringify(values) }),
      ),
  },
};

export function NewSite() {
  return <ConfigForm config={siteForm} />;
}
```

The table entry point has `DataTable` (client or server sorting; client, offset or cursor paging; selection with a
bulk-action bar; row links, actions and detail; cards on phones), `TableToolbar` (search, declarative filters with
chips, column menu, export), the cell helpers (`TwoLineCell`, `StatusCell`, `MoneyCell`, `NumberCell`,
`RelativeTimeCell`, `TagsCell`, `BooleanCell`), `columnsFor` and `toCsv`. Every piece of state can be controlled, so
an app can keep it in the URL.

The chart entry point has `TimeSeriesChart` and `CategoryChart` (bar, horizontal, stacked and donut), with
accessible summaries, a table view, export and full screen; `HourOfDayChart` (24 hourly buckets, which can show a
`ScheduleEditor` value directly); and `Gauge` / `MeterBar` (a value against warning and danger thresholds).

The map entry point has `Map`, on MapLibre GL: markers from data with clustering, a selected marker's card, zoom,
"show all" and reset controls, a list of every place for keyboard and screen reader users, and a clear message when
the map can't load. Import MapLibre's stylesheet (`maplibre-gl/dist/maplibre-gl.css`) in your app. MapLibre loads a
worker from beside its own module file; if your bundler moves that file, point MapLibre at the worker with
`setWorkerUrl` (with Vite: `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'`).

The shell entry point frames an app: `AppShell` (landmarks, a skip link, and the sidebar's form for the screen size),
`Sidebar` (sections, expandable items, an icon rail, a drawer on phones), `Header` (whose menu toggle can show panel
icons with `panelMenuToggleIcon`), `Brand`, `UserMenu`, `SettingsMenu`, `HierarchyPicker` (a scope switcher over
levels, with search and recent scopes), `Page`, `PageHeader`, `BottomTabBar`, `StatusBar` and `Footer`. Like everything else, they take data and callbacks: the current path, the collapsed state
and the chosen scope come from the app, and links render through your `LinkComponent`.

## Documentation

Every component is documented, with live examples, in the Storybook site at
<https://react-ux-core.centennialoss.org/latest/>. Each released version keeps its own copy, so you can read the
docs for the exact version you use. The site goes live with the first release.

## Privacy

react-ux-core does not collect, send, or share your data. It contains no trackers or analytics and makes no network requests of its own. The only exception is the optional map entry point, which loads map tiles from a URL your app configures.

Read the full privacy policy at [PRIVACY.md](PRIVACY.md).

## Building

See [DEVELOPER.md](DEVELOPER.md) for setup, Makefile targets, Storybook, tests and releases. In short:

```bash
make install
make storybook
make check
```

## Contributor Disclosure

Humans write this software with AI assistance. All contributions are well-tested and merged only after being reviewed and approved by humans who fully understand and take responsibility for the contribution.

While we welcome pull requests and other contributions from other humans, including AI-generated code, we do not accept contributions from AI bots. A human must review, understand, and sign off on all commits. All contributors must be able to defend their contributions under reasonable technical scrutiny. Please file an issue to discuss any proposed feature before working on it.

To report a security issue, see [SECURITY.md](SECURITY.md).

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.
