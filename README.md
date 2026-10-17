# react-ux-core

Accessible, themeable React components for data-heavy operational web apps: admin consoles, monitoring and back-office
tools. From [Centennial OSS](https://github.com/centennial-oss). These will always be 100% free with no charge, upcharge,
monetization or analytics/tracking.

## About

react-ux-core provides:

- accessible **primitives** (buttons, inputs, menus, dialogs, toasts) built on [React Aria](https://react-aria.adobe.com);
- a **declarative form engine** that renders forms from field configs;
- a **data table** with server-side paging, sorting and filtering;
- **charts**, from time series and heatmaps to candlesticks, treemaps and live streams;
- an **app shell kit** (sidebar, header, scope picker, page header, bottom tab bar, status bar, notifications);
- **specialist entry points** for diffs, logs, media, graphs, canvases, chat, finance, medical imaging, 3D models,
  rich text, terminals, music, maths, and QR codes and barcodes, each with its heavy libraries as optional peers.

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
# Logs (@centennial-oss/react-ux-core/logs)
npm install @tanstack/react-virtual
# Markdown and the Markdown editor (@centennial-oss/react-ux-core/markdown)
npm install react-markdown remark-gfm
# Media (@centennial-oss/react-ux-core/media): pdfjs-dist only for PdfViewer, hls.js only for HLS streams
npm install pdfjs-dist hls.js
# 3D models (@centennial-oss/react-ux-core/3d)
npm install three
# Rich text (@centennial-oss/react-ux-core/editor)
npm install lexical @lexical/react @lexical/rich-text @lexical/list @lexical/link @lexical/code @lexical/table \
  @lexical/markdown @lexical/html @lexical/selection @lexical/utils @lexical/history
# Terminal (@centennial-oss/react-ux-core/terminal)
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-search
# Music notation (@centennial-oss/react-ux-core/music; the keyboard, piano roll and sequencer need nothing)
npm install vexflow
# Maths (@centennial-oss/react-ux-core/math): temml for formulas, mathlive for MathInput
npm install temml mathlive
# Chat (@centennial-oss/react-ux-core/chat): emoji data for EmojiPicker, Markdown for message bodies
npm install emojibase-data @tanstack/react-virtual react-markdown remark-gfm
```

The `/diff`, `/graph`, `/canvas`, `/finance`, `/dicom` and `/codes` entry points need nothing extra.

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

| Import                                     | Contents                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `@centennial-oss/react-ux-core`            | `UIProvider`, theme hooks, primitives, overlays, toasts, inputs and editors |
| `@centennial-oss/react-ux-core/styles.css` | Tokens, themes, base layer, utilities                                       |
| `@centennial-oss/react-ux-core/form`       | `ConfigForm` and its containers, field registry                             |
| `@centennial-oss/react-ux-core/table`      | `DataTable`, `EditableTable`, `LineItemsEditor`, `Flowsheet`, filters, …    |
| `@centennial-oss/react-ux-core/chart`      | Time-series, category, latency, candlestick, heatmap, treemap, gauge, …     |
| `@centennial-oss/react-ux-core/map`        | `Map`, with markers and a choropleth layer                                  |
| `@centennial-oss/react-ux-core/shell`      | `AppShell`, `Sidebar`, `Header`, `NotificationCenter`, and more             |
| `@centennial-oss/react-ux-core/code`       | `CodeBlock` with syntax colours, copy, wrap and line highlights             |
| `@centennial-oss/react-ux-core/markdown`   | `Markdown` and `MarkdownEditor`                                             |
| `@centennial-oss/react-ux-core/diff`       | `DiffViewer`, `PlanReview` and diff helpers                                 |
| `@centennial-oss/react-ux-core/logs`       | `LogViewer`                                                                 |
| `@centennial-oss/react-ux-core/media`      | Image, PDF, audio and video viewers, file previews, a media library         |
| `@centennial-oss/react-ux-core/graph`      | `NodeGraph` and a layered graph layout                                      |
| `@centennial-oss/react-ux-core/canvas`     | `Canvas`, a pan-and-zoom viewport with selection and snapping               |
| `@centennial-oss/react-ux-core/chat`       | `MessageList`, `Composer`, `EmojiPicker`, `ReactionBar`                     |
| `@centennial-oss/react-ux-core/finance`    | `OrderBook`, `DepthChart`, `TradeTicket`, `ProbabilityBar`                  |
| `@centennial-oss/react-ux-core/dicom`      | `DicomViewer` (review only) and a DICOM file reader                         |
| `@centennial-oss/react-ux-core/3d`         | `ModelViewer` for glTF, STL and OBJ                                         |
| `@centennial-oss/react-ux-core/editor`     | `RichTextEditor`                                                            |
| `@centennial-oss/react-ux-core/terminal`   | `Terminal`                                                                  |
| `@centennial-oss/react-ux-core/music`      | `PianoKeyboard`, `PianoRoll`, `StepSequencer`, `MusicNotation`              |
| `@centennial-oss/react-ux-core/math`       | `MathFormula`, `MathInput`, `CoordinatePlane`                               |
| `@centennial-oss/react-ux-core/codes`      | `QRCode` and `Barcode`, with dependency-free encoders                       |

Entry points with heavy dependencies take them as optional peers (see [Installation](#installation)), so apps that
don't use them don't install them.

The main entry point has these components so far:

- **Actions:** `Button`, `IconButton`, `ButtonGroup`, `CopyButton`, `CommandPalette` and `CommandPaletteTrigger`
  (a ⌘K palette with fuzzy search, recent items and async results)
- **Menus and overlays:** `Menu`, `MenuButton`, `SplitButton`, `OverflowMenu`, `Popover`, `Tooltip`, `InfoTip`,
  `Dialog`, `Drawer`, `ConfirmDialog`, `StepDialog`
- **Settings:** `SettingsMenu`, `SettingsMenuItems` and `ThemeMenuSection` (also exported from `/shell`)
- **Feedback:** `Timer` and `useTimer` (countdown or count-up), toasts (`useToast`), `Banner`, `Spinner`,
  `Skeleton`, `ProgressBar`, `EmptyState`, `ErrorState`, `RolloutProgress` (a staged rollout across many targets)
- **Layout and display:** `Stack`, `Inline`, `Grid`, `Spacer`, `Text`, `Heading`, `Prose`, `Code`,
  `ScrollRegion`, `Card`, `Disclosure`, `Accordion`, `CollapsibleCard`, `StatTile`, `DescriptionList`, `Tabs`,
  `Pillbox`, `Badge`, `Chip`, `StatusDot`, `RelativeTime`, `Sparkline`, `Breadcrumbs`, `Tree`, `Separator`,
  `VisuallyHidden`, `Kbd`, `Checklist` (steps with a status and progress), `SecretReveal` (credentials shown once),
  `Flag` (see below), `SplitView` (resizable panes that become a drawer on phones), `Pagination` (offset or cursor),
  `Avatar` and `AvatarGroup`, `ActivityTimeline` (an audit feed grouped by day), `UptimeBar`, `SegmentedMeter` (used,
  reserved and free against limits), `PriceTicker` and `TickerTape` (live values with a change flash),
  `ScheduleTimeline` (items on lanes over time, with conflicts and drag or keyboard editing). `Tree` can reorder and
  re-parent by drag and drop and show per-row toggles.
- **Inputs:** `TextField`, `NumberField`, `TextArea`, `SearchField`, `Select`, `ComboBox`, `MultiSelect`,
  `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `Slider`, `RangeSlider`, `DatePicker`, `DateRangePicker`,
  `DateTimePicker`, `TimeField`, `TimeRangePicker`, `FileField`, `DropZone`, `ScheduleEditor` (a daily schedule with a
  24-hour preview), `TierEditor` (contiguous numeric tiers), `ColorField`, `IconPicker`, `FlagPicker`, `TilePicker`
  (the searchable grid of tiles in titled rows that IconPicker and FlagPicker are built on), `TileGrid` (status tiles:
  a question navigator, a voter card, a menu), `ReorderableList` (put items in order), `JsonEditor` (checked as you
  type, with formatting), `TemplateEditor` (an SMS template with `{{keyword}}` suggestions and a live example),
  `CopyField`, `KeyValueEditor` (headers and variables; paste a `.env` block), `SlugField`, `CidrField` and `CidrList`,
  `DurationField`, `ByteSizeField` and `BitrateField` (friendly units over a base-unit value), `MoneyField` (decimal
  strings, never floats), `Knob`, `RuleBuilder` and `RuleList` (when … then … rules), `PropertyInspector` (the selected
  object's properties). `TextField` and `TextArea` take a character count and a soft `recommendedLength`, and
  `Slider` and `RangeSlider` turn into faders with `orientation="vertical"`. `FileField` and `DropZone` show
  thumbnails with `hasPreviews`.
- **Helpers:** `formatDuration`, `formatBytes`, `formatBitrate` and their parsers; exact string decimals for money
  (`decimalAdd`, `decimalMultiply`, `roundHalfEven`, …), `formatMoney`; `slugify`; `parseCidr`, `cidrContains`,
  `cidrOverlaps`, `summarizeCidrs`; `moveTreeNodes`

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
an app can keep it in the URL. `EditableTable` edits small tables in place as an ARIA grid, with cross-row
validation and a card per row on phones; `LineItemsEditor` edits invoice lines with decimal-safe totals
(`computeTotals`) and a printable invoice view; `Flowsheet` shows observations over time against reference ranges,
with `ReferenceValue` for a single flagged value. CCUX provides display and accessibility only: validating clinical
units, ranges and flags stays the app's job.

The chart entry point has `TimeSeriesChart` and `CategoryChart` (bar, horizontal, stacked and donut), with
accessible summaries, a table view, export and full screen; `HourOfDayChart` (24 hourly buckets, which can show a
`ScheduleEditor` value directly); `HeatmapChart` and `CalendarHeatmap` (values on a sequential or diverging scale,
navigable cell by cell; the calendar fits its width and opens on the latest weeks); and `Gauge` / `MeterBar` (a value
against warning and danger thresholds). Value axes take ranges (`axes`, `valueAxis`) so thresholds stay in view.
Time-series charts take `events` (deploys, news, maintenance windows) as keyboard-reachable markers, and stacks can
fill to 100%. `LiveTimeSeries` streams points through a handle with a bounded memory window; `OutcomeChart` shows
probabilities that add up to 100%; `LatencyChart` shows percentile bands with objective breaches, or a histogram;
`CandlestickChart` has volume, overlays and a touch crosshair; `CategoryChart` gains `type="waterfall"`; and
`Treemap` drills into nested values.

The map entry point has `Map`, on MapLibre GL: markers from data with clustering, a selected marker's card, zoom,
"show all" and reset controls, a list of every place for keyboard and screen reader users, and a clear message when
the map can't load. A `choropleth` layer fills GeoJSON regions by value, with a legend and a sorted list of regions.
Import MapLibre's stylesheet (`maplibre-gl/dist/maplibre-gl.css`) in your app. MapLibre loads a
worker from beside its own module file; if your bundler moves that file, point MapLibre at the worker with
`setWorkerUrl` (with Vite: `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'`).

The shell entry point frames an app: `AppShell` (landmarks, a skip link, and the sidebar's form for the screen size),
`Sidebar` (sections, expandable items, an icon rail, a drawer on phones), `Header` (whose menu toggle can show panel
icons with `panelMenuToggleIcon`, and whose `pinnedActions` stay visible on phones), `NotificationCenter` and
`NotificationBell`, `Brand`, `UserMenu`, `SettingsMenu`, `HierarchyPicker` (a scope switcher over
levels, with search and recent scopes), `Page`, `PageHeader`, `BottomTabBar`, `StatusBar` and `Footer`. Like
everything else, they take data and callbacks: the current path, the collapsed state and the chosen scope come from
the app, and links render through your `LinkComponent`.

The markdown entry point has `Markdown` (CommonMark and GFM, never raw HTML; `hasMath` renders `$…$` formulas when
`/math`'s peer is installed) and `MarkdownEditor` (a source field with a toolbar, list-aware Enter and Tab, image
uploads, and a split or tabbed live preview).

The specialist entry points:

- **`/diff`:** `DiffViewer` (split or unified, word highlights, collapsed context, hunk navigation, structural JSON
  comparison) and `PlanReview` (an infrastructure plan with a summary, filters, a diff per change and a confirmed
  Apply).
- **`/logs`:** `LogViewer`, virtualised for 100k+ lines, with follow mode, search, level filters, ANSI colours drawn
  with theme tokens and a download.
- **`/graph` and `/canvas`:** `NodeGraph` (pipelines and topologies with a built-in layered layout, status, groups,
  edge-following keyboard navigation and a list view) on `Canvas` (pan, zoom, grid snapping, rulers, marquee
  selection, a minimap and keyboard nudging).
- **`/chat`:** `MessageList` (a virtualised transcript with grouping, an unread divider, older messages that load
  without moving the view, and streaming replies), `Composer` (mentions, commands, attachments and emoji), and
  `EmojiPicker` and `ReactionBar` (emoji data loads on first open).
- **`/finance`:** `OrderBook`, `DepthChart`, `TradeTicket` and `ProbabilityBar`, with exact decimal arithmetic.
- **`/dicom`:** `DicomViewer`, a review viewer for DICOM stacks (window/level, measurements in mm, overlays) that reads
  uncompressed DICOM files itself; pass `loadImage` for compressed or DICOMweb sources. It is not for diagnostic use.
- **`/3d`:** `ModelViewer` for glTF, STL and OBJ, with view presets, measurement and theme colours.
- **`/editor`:** `RichTextEditor`, a Lexical WYSIWYG field that stores Markdown, sanitised HTML or JSON.
- **`/terminal`:** `Terminal` on xterm.js, themed from the tokens. Import `@xterm/xterm/css/xterm.css` in your app.
- **`/media`:** `ImageViewer`, `Lightbox`, `ImageGallery` and `ImageAnnotator` (pins, rectangles and polygons);
  `PdfViewer` (pdf.js, loaded on demand; where your bundler doesn't resolve its worker, pass `workerSrc`, in Vite
  `import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`); `AudioPlayer`, `MediaTransport` and `Waveform`;
  `VideoPlayer`, `StreamPreview` and `MultiView` (HLS through hls.js, loaded on demand; DASH through your own
  `loadSource`); `AudioMeter`; `FilePreview`; and `MediaLibrary` with `AssetPicker`.
- **`/music`:** `PianoKeyboard` (touch, computer keyboard and Web MIDI), `PianoRoll` and `StepSequencer` on the canvas,
  `MusicTransport` with a Web Audio beat clock, and `MusicNotation` (VexFlow, loaded on demand, or MusicXML).
- **`/math`:** `MathFormula` and `texToMathML` (TeX to native MathML through Temml), `MathInput` (MathLive, loaded on
  first use; serve its fonts with `fontsDirectory` or import `mathlive/fonts.css`), and `CoordinatePlane` for
  function plots and geometry.
- **`/codes`:** `QRCode` and `Barcode` (UPC-A, UPC-E, EAN-13, EAN-8, Code 128), with encoders written in TypeScript
  (`encodeQr`, `encodeBarcode`) for servers and downloads too.

## Documentation

Every component is documented, with live examples, in the Storybook site at
<https://react-ux-core.centennialoss.org/latest/>. Each released version keeps its own copy, so you can read the
docs for the exact version you use. The site goes live with the first release.

## Privacy

react-ux-core does not collect, send, or share your data. It contains no trackers or analytics and makes no network requests of its own. Components only load what your app points them at: map tiles from a URL your app configures, and the images, documents, media, models and DICOM files your app passes in.

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
