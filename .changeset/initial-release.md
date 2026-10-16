---
'@centennial-oss/react-ux-core': major
---

First release: accessible React components on React Aria, with design tokens and light, dark and high-contrast
themes. Each subpath's heavier dependencies are optional peers.

- **Core:** `UIProvider` (theme, UI strings, link component and time zone); layout primitives (Stack, Inline,
  Grid) and text; buttons and menus; dialogs, drawers, popovers, tooltips and toasts that become sheets on phones;
  feedback and display components, including a checklist and show-once secrets; form inputs including date, time and
  file pickers; Tree; editors for schedules, tiers, colours, icons, JSON and SMS templates; flags and a flag picker
  for the countries the app registers; and TilePicker, the searchable tile grid the icon and flag pickers share.
- **`/form`:** ConfigForm renders forms from config, validates with any Standard Schema, runs the submit lifecycle
  with server errors and uploads, and comes in dialog, card, page and wizard containers.
- **`/table`:** DataTable on TanStack Table, with sorting, paging, selection, filters, virtualisation and CSV export.
- **`/chart`:** time-series, category, hour-of-day and gauge charts on Chart.js, with zoom, generated summaries,
  table views and export.
- **`/map`:** Map on MapLibre GL, with clustered markers and an offline fallback.
- **`/shell`:** AppShell with a responsive sidebar, a header whose menu toggle can be styled by state, brand,
  menus, hierarchy picker, page frame and header, status bar and footer.
