---
'@centennial-oss/react-ux-core': major
---

First release: accessible React components on React Aria, with design tokens and light, dark and high-contrast
themes. Each subpath's heavier dependencies are optional peers.

- **Core:** `UIProvider` (theme, UI strings, link component and time zone); layout primitives (Stack, Inline,
  Grid), Text, Prose and inline Code; buttons, menus and the settings menu; dialogs, drawers, popovers, tooltips and
  toasts that become sheets on phones; feedback and display components, including a timer, a checklist and show-once
  secrets; form inputs including date, time and file pickers, typed Select values and per-option feedback on radios
  and checkboxes; status tiles (TileGrid) and a reorderable list; Tree; editors for schedules, tiers, colours, icons,
  JSON and SMS templates; flags and a flag picker for the countries the app registers; and TilePicker, the searchable
  tile grid the icon and flag pickers share.
- **`/form`:** ConfigForm renders forms from config, validates with any Standard Schema, runs the submit lifecycle
  with server errors and uploads, and comes in dialog, card, page and wizard containers.
- **`/table`:** DataTable on TanStack Table, with sorting, paging, selection, filters, virtualisation, CSV export,
  and a flexible column whose text clamps instead of widening the table.
- **`/chart`:** time-series, category, hour-of-day and gauge charts on Chart.js, with zoom, value-axis ranges that
  keep thresholds in view, heatmaps and a calendar heatmap, generated summaries, table views and export; gauges take
  their own status words.
- **`/map`:** Map on MapLibre GL, with clustered markers and an offline fallback.
- **`/code`:** CodeBlock with syntax colours for ten languages, copy, wrap, line numbers and highlighted lines.
- **`/markdown`:** Markdown (CommonMark and GFM, never raw HTML) through Prose, with code blocks.
- **`/shell`:** AppShell with a responsive sidebar, a header whose menu toggle can be styled by state, brand,
  menus, hierarchy picker, page frame and header, status bar and footer.
