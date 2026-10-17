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
- **Core, navigation and layout:** a ⌘K `CommandPalette` with fuzzy search, recent items and async results, and its
  header trigger; `SplitView`, resizable panes that become a drawer or stack on narrow screens; standalone
  `Pagination` (offset and cursor), which DataTable's pager now uses; Tree drag-and-drop reordering and re-parenting
  with per-row toggles (`moveTreeNodes`).
- **Core, display:** `Avatar` and `AvatarGroup` (UserMenu now uses Avatar); `ActivityTimeline` with day grouping and
  inline detail; `UptimeBar`; `SegmentedMeter` with limit markers and overflow; `PriceTicker` and `TickerTape`;
  `RolloutProgress` for staged rollouts with grouped targets and confirmed rollback; `ScheduleTimeline` for lanes over
  time with conflicts, drag and keyboard editing, and a phone agenda.
- **Core, inputs:** `CopyField` and `CopyButton`; `KeyValueEditor` (paste a `.env` block, duplicate-key checks,
  secret values); TextField `hasCharacterCount` and a soft `recommendedLength` on TextField and TextArea; `SlugField`
  and `slugify`; `CidrField`, `CidrList` and CIDR helpers for IPv4 and IPv6; `DurationField`, `ByteSizeField` and
  `BitrateField` with unit formatters and parsers; `MoneyField` and exact string decimal helpers; `Knob`, and vertical
  faders for Slider and RangeSlider; `RuleBuilder` and `RuleList` with typed conditions, nested groups and generated
  summaries; `PropertyInspector` with drag-to-scrub numbers and mixed values.
- **`/form`:** ConfigForm renders forms from config, validates with any Standard Schema, runs the submit lifecycle
  with server errors and uploads, and comes in dialog, card, page and wizard containers.
- **`/table`:** DataTable on TanStack Table, with sorting, paging, selection, filters, virtualisation, CSV export,
  and a flexible column whose text clamps instead of widening the table. `EditableTable` edits small tables as an
  ARIA grid with cross-row validation; `LineItemsEditor` and `computeTotals` handle invoice lines, taxes and
  discounts to the cent with a printable view; `Flowsheet`, `ReferenceValue` and `ObservationTrend` show
  observations against reference ranges.
- **`/chart`:** time-series, category, hour-of-day and gauge charts on Chart.js, with zoom, value-axis ranges that
  keep thresholds in view, heatmaps and a calendar heatmap (fitted to its width, opening on the latest weeks),
  generated summaries, table views and export; gauges take their own status words. Event markers with clustering and
  popovers; percent stacks; `LiveTimeSeries` streaming through a handle with a retention window; `OutcomeChart`;
  `LatencyChart` (percentile bands with objective breaches, or a histogram); `CandlestickChart` with volume,
  overlays and a touch crosshair; `CategoryChart` `type: 'waterfall'`; and `Treemap` with drill-down.
- **`/map`:** Map on MapLibre GL, with clustered markers, an offline fallback, and a choropleth layer with a legend,
  summary and a list of regions sorted by value.
- **`/code`:** CodeBlock with syntax colours for ten languages, copy, wrap, line numbers and highlighted lines.
- **`/markdown`:** Markdown (CommonMark and GFM, never raw HTML) through Prose, with code blocks, and
  `MarkdownEditor` with a toolbar, shortcuts, list continuation, image uploads and a split or tabbed preview.
- **`/shell`:** AppShell with a responsive sidebar, a header whose menu toggle can be styled by state and whose
  pinned actions stay on phones, brand, menus, hierarchy picker, page frame and header, status bar, footer, and
  `NotificationCenter` with `NotificationBell`.
- **`/diff`:** `DiffViewer` (split or unified, word highlights, collapsed context, hunk navigation, structural JSON)
  with diff helpers, and `PlanReview` for infrastructure plans with a confirmed Apply.
- **`/logs`:** `LogViewer`, virtualised, with follow mode, search, level filters, ANSI colours and download.
- **`/graph` and `/canvas`:** `NodeGraph` with a dependency-free layered layout (`layoutGraph`), and `Canvas`,
  `CanvasItem`, `CanvasControls` and `useCanvas` for pan-and-zoom editors.
- **`/chat`:** `MessageList` (virtualised, grouped, unread divider, load older, streaming replies, reactions,
  replies and status), `Composer` (mentions, commands, attachments, emoji, send states), `EmojiPicker` and
  `ReactionBar` (emojibase-data, loaded on demand).
- **`/finance`:** `OrderBook`, `DepthChart`, `TradeTicket` and `ProbabilityBar`.
- **`/dicom`:** `DicomViewer`, a review-only DICOM stack viewer with a built-in uncompressed DICOM reader.
- **`/3d`:** `ModelViewer` for glTF, STL and OBJ on three.js.
- **`/editor`:** `RichTextEditor` on Lexical, storing Markdown, sanitised HTML or JSON.
- **`/terminal`:** `Terminal` on xterm.js with themed ANSI colours, paste confirmation and search.
- **`/media`:** image viewer, lightbox, gallery and annotator; `PdfViewer` (pdfjs-dist, loaded on demand) with
  search, thumbnails, print and password prompts; `AudioPlayer`, `MediaTransport` and `Waveform`; `VideoPlayer`,
  `StreamPreview` and `MultiView` (hls.js, loaded on demand) with live, quality, captions and stats; `AudioMeter`;
  `FilePreview`; and `MediaLibrary` with `AssetPicker`.
- **`/music`:** `PianoKeyboard` with Web MIDI, `PianoRoll`, `StepSequencer`, `MusicTransport` and a beat clock, and
  `MusicNotation` (VexFlow, loaded on demand) with a MusicXML reader.
- **`/math`:** `MathFormula` and `texToMathML` on Temml, `MathInput` on MathLive, `CoordinatePlane`, and `hasMath`
  on Markdown for `$…$` formulas.
- **`/codes`:** `QRCode` and `Barcode` (UPC-A, UPC-E, EAN-13, EAN-8, Code 128) with dependency-free encoders.
