---
'@centennial-oss/react-ux-core': major
---

First release: accessible React components on React Aria, with design tokens and light, dark and high-contrast
themes. Each subpath's heavier dependencies are optional peers.

- **Core:** `UIProvider` (theme, UI strings, link component and time zone); buttons and menus; dialogs, drawers,
  popovers, tooltips and toasts that become sheets on phones; feedback, layout and display components; form inputs
  including date, time and file pickers; Tree; and editors for schedules, tiers, colours and icons.
- **`/form`:** ConfigForm renders forms from config, validates with any Standard Schema, runs the submit lifecycle
  with server errors and uploads, and comes in dialog, card, page and wizard containers.
- **`/table`:** DataTable on TanStack Table, with sorting, paging, selection, filters, virtualisation and CSV export.
- **`/chart`:** time-series, category, hour-of-day and gauge charts on Chart.js, with zoom, generated summaries,
  table views and export.
- **`/map`:** Map on MapLibre GL, with clustered markers and an offline fallback.
- **`/shell`:** AppShell with a responsive sidebar, header, menus, hierarchy picker, page header, status bar and
  footer.
