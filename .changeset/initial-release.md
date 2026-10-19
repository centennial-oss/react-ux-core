---
'@centennial-oss/react-ux-core': major
---

First release: accessible React components on React Aria, with design tokens and light, dark and high-contrast
themes. Each subpath's heavier dependencies are optional peers.

- **Core:** `UIProvider` (theme, UI strings, link component and time zone); layout primitives (Stack, Inline,
  Grid), Text, Prose and inline Code; buttons, menus and the settings menu; dialogs, drawers, popovers, tooltips and
  toasts that become sheets on phones; feedback and display components, including a timer, a stepper and show-once
  secrets; form inputs including date, time and file pickers, typed Select values and per-option feedback on radios
  and checkboxes; status tiles (TileGrid) and a reorderable list; Tree; editors for schedules, tiers, colours, icons,
  JSON and SMS templates; flags and a flag picker for the countries the app registers; and TilePicker, the searchable
  tile grid the icon and flag pickers share.
- **Core, navigation and layout:** a ⌘K `CommandPalette` with fuzzy search, recent items and async results, and its
  header trigger; `SplitView`, resizable panes that become a drawer or stack on narrow screens; standalone `Pagination`
  (offset and cursor), which DataTable's pager now uses; Tree drag-and-drop reordering and re-parenting with per-row
  toggles (`moveTreeNodes`); `ContextMenuTrigger`, which opens a `Menu` where the user right-clicks, long-presses or
  presses Shift+F10 (a bottom sheet on phones); `Stepper`, horizontal or vertical, with numbered, dot, arrow and compact
  "Step 2 of 5" variants, clickable or linear steps, and done, current, error, skipped, optional and locked states,
  which StepDialog and WizardForm draw their steps with; with a progress bar and status badges it's also a standing
  checklist. `Toolbar`, on React Aria's toolbar, with arrow-key navigation and priority-based overflow into a More menu;
  public `ToggleButton` and `ToggleButtonGroup` (single or multiple, attached strips); the Markdown and rich-text
  editors, Canvas and ScheduleTimeline now use them. `ActionBar`, a floating bar of actions for the current selection,
  with its count announced and Escape to clear. DataTable's bulk actions now use it: a floating bar after the table with
  Escape to clear, announced counts and focus kept on the table after a bulk delete.
- **Core, display:** `Avatar` and `AvatarGroup` (UserMenu now uses Avatar); `ActivityTimeline` with day grouping and
  inline detail; `UptimeBar`; `SegmentedMeter` with limit markers and overflow; `PriceTicker` and `TickerTape`;
  `RolloutProgress` for staged rollouts with grouped targets and confirmed rollback; `ScheduleTimeline` for lanes over
  time with conflicts, drag and keyboard editing, and a phone agenda. `LiveRegion` and `useAnnouncer` for screen-reader
  announcements (the same text twice is read twice), used by the library's own components. `ListView` on React Aria's
  GridList: rows with icons or avatars, descriptions, metadata and actions; single and multiple selection; sticky
  grouped headings; virtualisation for thousands of rows; load-more from a button or on scroll, in a scroll box or with
  the page; drag reordering; and `TransferList`, two searchable ListViews with move buttons, select-all and drag between
  them. `Carousel`, dependency-free on the WAI-ARIA pattern: several slides per view, looping, swipe and drag, dots or
  thumbnails, and autoplay with a visible stop button that pauses on hover, focus and hidden tabs and respects reduced
  motion; ImageGallery uses it for `layout="carousel"`, which follows the lightbox. `RatingDisplay`, a fractional star
  rating light enough for table cells. `WorldClock`, the time in several IANA zones, digital or analog, as a row, grid
  or compact list, with each zone's date, UTC offset, difference from the local zone, day or night and working hours,
  ticking from one shared clock per page that pauses in hidden tabs.
- **Core, inputs:** `CopyField` and `CopyButton`; `KeyValueEditor` (paste a `.env` block, duplicate-key checks, secret
  values); TextField `hasCharacterCount` and a soft `recommendedLength` on TextField and TextArea; `SlugField` and
  `slugify`; `CidrField`, `CidrList` and CIDR helpers for IPv4 and IPv6; `DurationField`, `ByteSizeField` and
  `BitrateField` with unit formatters and parsers; `MoneyField` and exact string decimal helpers; `Knob`, and vertical
  faders for Slider and RangeSlider; `RuleBuilder` and `RuleList` with typed conditions, nested groups and generated
  summaries; `PropertyInspector` with drag-to-scrub numbers and mixed values; standalone `Calendar` and `RangeCalendar`
  (the date pickers' calendars) with several months, multiple selection, a week view, and content, descriptions and
  highlights on days, and month and year Cyclers in the header (by default) to jump straight to a month or year, or
  plain arrows with `headerControls="arrows"`; the date pickers take `visibleMonths`, `headerControls` and `yearRange`
  too; `Cycler`, which steps through values with arrows (hold to repeat) and jumps to any from a grid that pages long
  lists by group. `TagField` for free-text values as tags (Enter or a delimiter adds one, pasted lists split, Backspace
  edits the last), with per-tag validation, duplicate and maximum checks, optional suggestions and drag reordering;
  `Rating`, a star slider with half steps, clearing, custom icons, sizes and tones; `OneTimeCodeField`, one input drawn
  as cells, with groups, digits, alphanumeric or a custom pattern, masking, paste and SMS autofill, and `onComplete`.
- **`/form`:** ConfigForm renders forms from config, validates with any Standard Schema, runs the submit lifecycle with
  server errors and uploads, and comes in dialog, card, page and wizard containers. Field types `tags`, `rating` and
  `oneTimeCode` use the new inputs. The inputs for `tags`, `rating`, `oneTimeCode`, `timeRange`, `file` and `files`
  fields load the first time a form shows one, so forms that don't use them don't bundle them; meanwhile the field shows
  its label, description and error around a placeholder the input's size.
- **`/table`:** DataTable on TanStack Table, with sorting, paging, selection, filters, virtualisation, CSV export,
  and a flexible column whose text clamps instead of widening the table. DataTable shows tree data too
  (`getRowChildren`, or `loadRowChildren` to load children on first open, with loading and retry rows) as a
  keyboard-navigable `treegrid` with tri-state group selection, nested cards on phones, and `filterTree`. `EditableTable` edits small tables as an
  ARIA grid with cross-row validation; `LineItemsEditor` and `computeTotals` handle invoice lines, taxes and
  discounts to the cent with a printable view; `Flowsheet`, `ReferenceValue` and `ObservationTrend` show
  observations against reference ranges. `Spreadsheet` edits large typed sheets: values are parsed and checked
  against their column's type as they're typed, pasted or filled; range selection, the system clipboard
  (tab-separated), fill, undo and redo, multi-column sorting, column filters and search, a cell menu, and an
  `editScope` of `all` (columns and data), `data` or `none`. Only the rows and columns in view render, and undo keeps
  only what changed. Table filters gain a `text` (contains) filter.
- **`/chart`:** time-series, category, hour-of-day and gauge charts on Chart.js, with zoom, value-axis ranges that
  keep thresholds in view, heatmaps and a calendar heatmap (fitted to its width, opening on the latest weeks),
  generated summaries, table views and export; gauges take their own status words. Event markers with clustering and
  popovers; percent stacks; `LiveTimeSeries` streaming through a handle with a retention window; `OutcomeChart`;
  `LatencyChart` (percentile bands with objective breaches, or a histogram); `CandlestickChart` with volume,
  overlays and a touch crosshair; `CategoryChart` `type: 'waterfall'`, `'funnel'`, `'radar'` and `'polarArea'`;
  `ScatterChart` (scatter or bubble, on linear or log axes, with a correlation in the summary); `BoxPlotChart` (from
  raw values or summaries, including LatencyChart's histograms); `SankeyChart`; `BulletChart` (a measure against a
  target over qualitative ranges); and `Treemap` with drill-down.
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
