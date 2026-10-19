// The Page settings dialog (EDIT-26): title, columns (presets or custom), row sizing, rows per screen or row height,
// density, compaction, and whether they're stored on the page or as the dashboard's defaults. A preview shows the
// layout as it will be stored, rescaled when the column count changes (GRID-03). Hosts lock fields with a policy.

import { useMemo, useState } from 'react';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { Dialog } from '../../components/Dialog/Dialog';
import { Option } from '../../components/ListBox/ListBoxParts';
import { NumberField } from '../../components/NumberField/NumberField';
import { Radio, RadioGroup } from '../../components/RadioGroup/RadioGroup';
import { Select } from '../../components/Select/Select';
import { Switch } from '../../components/Switch/Switch';
import { TextField } from '../../components/TextField/TextField';
import { normalizePageLayout, pageGridSpec } from '../document/document';
import type { GridSpec } from '../layout/metrics';
import { readText, useDashboardMessages } from '../messages';
import type {
  AnyWidgetType,
  DashboardDocument,
  DashboardPage,
  GridSettingsField,
  GridSettingsPolicy,
} from '../types';
import {
  DEFAULT_COLUMN_PRESETS,
  gridSettingsOf,
  settingsIssues,
  withPageSettings,
  type PageGridSettings,
  type PageSettings,
} from './pageSettings';

export interface PageSettingsDialogProps {
  /** The dashboard, with the page. */
  document: DashboardDocument;
  page: DashboardPage;
  /** The component's grid settings, under the dashboard's and the page's. */
  baseGrid?: Partial<GridSpec>;
  /** Widget types by name, for size limits in the preview. */
  typeOf: (type: string) => AnyWidgetType | undefined;
  policy?: GridSettingsPolicy;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Called with the settings; `withPageSettings` applies them to a document. */
  onApply: (settings: PageSettings) => void;
}

const CUSTOM = 'custom';
/** Preview rows are this many pixels at most, and fill about 12rem. */
const PREVIEW_HEIGHT = 192;

interface DraftSettings extends PageSettings {
  isCustomColumns: boolean;
}

/** Page settings, in a dialog (EDIT-26). */
export function PageSettingsDialog({
  document,
  page,
  baseGrid,
  typeOf,
  policy,
  isOpen,
  onOpenChange,
  onApply,
}: PageSettingsDialogProps) {
  const messages = useDashboardMessages();
  const presets = policy?.columnPresets ?? DEFAULT_COLUMN_PRESETS;
  const [draft, setDraft] = useState<DraftSettings | null>(null);
  if (isOpen && !draft) {
    const grid = gridSettingsOf(pageGridSpec(document, page, baseGrid));
    setDraft({
      title: page.title,
      grid,
      scope: 'page',
      isCustomColumns: !presets.includes(grid.columns),
    });
  } else if (!isOpen && draft) {
    setDraft(null);
  }
  const locked = new Set<GridSettingsField>(policy?.lockedFields);
  const issues = useMemo(() => (draft ? settingsIssues(draft) : new Set<string>()), [draft]);

  // The page as it will be stored, its unplaced widgets placed, for the preview.
  const preview = useMemo(() => {
    if (!draft || issues.size > 0) {
      return undefined;
    }
    const next = withPageSettings(document, page.id, draft, baseGrid, typeOf);
    const shown = next.pages.find((item) => item.id === page.id);
    if (!shown) {
      return undefined;
    }
    const grid = pageGridSpec(next, shown, baseGrid);
    return { page: normalizePageLayout(shown, grid, typeOf), columns: grid.columns };
  }, [draft, issues, document, page.id, baseGrid, typeOf]);
  const fromColumns = pageGridSpec(document, page, baseGrid).columns;

  const setGrid = (change: Partial<PageGridSettings>) => {
    setDraft((current) =>
      current ? { ...current, grid: { ...current.grid, ...change } } : current,
    );
  };

  return (
    <Dialog
      title={messages.pageSettings}
      size="lg"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      footer={(close) => (
        <ButtonGroup>
          <Button variant="outline" onPress={close}>
            {messages.cancel}
          </Button>
          <Button
            variant="solid"
            tone="accent"
            isDisabled={issues.size > 0}
            onPress={() => {
              if (draft) {
                const { isCustomColumns, ...settings } = draft;
                onApply({ ...settings, title: settings.title.trim() });
              }
              close();
            }}
          >
            {messages.apply}
          </Button>
        </ButtonGroup>
      )}
    >
      {draft && (
        <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <TextField
              label={messages.pageTitle}
              value={draft.title}
              isRequired
              isInvalid={issues.has('title')}
              errorMessage={issues.has('title') ? messages.pageTitleRequired : undefined}
              onChange={(title) => {
                setDraft({ ...draft, title });
              }}
            />
            <Select
              label={messages.settingsColumns}
              value={draft.isCustomColumns ? CUSTOM : String(draft.grid.columns)}
              isDisabled={locked.has('columns')}
              onChange={(key) => {
                if (key === CUSTOM) {
                  setDraft({ ...draft, isCustomColumns: true });
                } else {
                  setDraft({
                    ...draft,
                    isCustomColumns: false,
                    grid: { ...draft.grid, columns: Number(key) },
                  });
                }
              }}
            >
              {[
                ...presets.map((count) => (
                  <Option key={count} id={String(count)}>
                    {String(count)}
                  </Option>
                )),
                <Option key={CUSTOM} id={CUSTOM}>
                  {messages.settingsCustom}
                </Option>,
              ]}
            </Select>
            {draft.isCustomColumns && (
              <NumberField
                label={messages.settingsColumnCount}
                value={draft.grid.columns}
                minValue={1}
                maxValue={48}
                step={1}
                isDisabled={locked.has('columns')}
                isInvalid={issues.has('columns')}
                errorMessage={
                  issues.has('columns') ? messages.numberOutOfRange({ min: 1, max: 48 }) : undefined
                }
                onChange={(columns) => {
                  setGrid({ columns: columns ?? Number.NaN });
                }}
              />
            )}
            <RadioGroup<GridSpec['rowSizing']>
              label={messages.settingsRowSizing}
              value={draft.grid.rowSizing}
              isDisabled={locked.has('rowSizing')}
              onChange={(rowSizing) => {
                setGrid({ rowSizing });
              }}
            >
              <Radio value="fitRows">{messages.rowSizingFitRows}</Radio>
              <Radio value="fitPage">{messages.rowSizingFitPage}</Radio>
              <Radio value="fixed">{messages.rowSizingFixed}</Radio>
            </RadioGroup>
            {draft.grid.rowSizing === 'fitRows' && (
              <NumberField
                label={messages.settingsRowsPerScreen}
                value={draft.grid.rowsPerScreen}
                minValue={1}
                maxValue={48}
                step={1}
                isDisabled={locked.has('rowsPerScreen')}
                isInvalid={issues.has('rowsPerScreen')}
                errorMessage={
                  issues.has('rowsPerScreen')
                    ? messages.numberOutOfRange({ min: 1, max: 48 })
                    : undefined
                }
                onChange={(rowsPerScreen) => {
                  setGrid({ rowsPerScreen: rowsPerScreen ?? Number.NaN });
                }}
              />
            )}
            {draft.grid.rowSizing === 'fixed' && (
              <TextField
                label={messages.settingsRowHeight}
                value={draft.grid.rowHeight}
                isDisabled={locked.has('rowHeight')}
                isInvalid={issues.has('rowHeight')}
                errorMessage={
                  issues.has('rowHeight') ? messages.settingsRowHeightInvalid : undefined
                }
                onChange={(rowHeight) => {
                  setGrid({ rowHeight });
                }}
              />
            )}
            <Select
              label={messages.settingsDensity}
              value={draft.grid.density}
              isDisabled={locked.has('density')}
              onChange={(density) => {
                setGrid({ density: density });
              }}
            >
              <Option id="auto">{messages.densityAuto}</Option>
              <Option id="regular">{messages.densityRegular}</Option>
              <Option id="compact">{messages.densityCompact}</Option>
            </Select>
            <Switch
              isSelected={draft.grid.compaction === 'vertical'}
              isDisabled={locked.has('compaction')}
              onChange={(isSelected) => {
                setGrid({ compaction: isSelected ? 'vertical' : 'none' });
              }}
            >
              {messages.settingsCompaction}
            </Switch>
            <RadioGroup<PageSettings['scope']>
              label={messages.settingsScope}
              value={draft.scope}
              isDisabled={locked.has('scope')}
              onChange={(scope) => {
                setDraft({ ...draft, scope });
              }}
            >
              <Radio value="page">{messages.scopePage}</Radio>
              <Radio value="dashboard">{messages.scopeDashboard}</Radio>
            </RadioGroup>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{messages.preview}</span>
            {preview && (
              <LayoutPreview
                page={preview.page}
                columns={preview.columns}
                label={
                  preview.columns === fromColumns
                    ? messages.layoutPreview
                    : `${messages.layoutPreview}. ${messages.rescalePreview({ from: fromColumns, to: preview.columns })}`
                }
                titleOf={(widget) => {
                  const definition = typeOf(widget.type);
                  return (
                    widget.title ??
                    (definition ? readText(definition.displayName, messages) : widget.type)
                  );
                }}
              />
            )}
            {preview && preview.columns !== fromColumns && (
              <p className="text-sm text-fg-muted">
                {messages.rescalePreview({ from: fromColumns, to: preview.columns })}
              </p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** A small drawing of a page's layout: each widget a labelled box at its grid position (GRID-03's preview). */
function LayoutPreview({
  page,
  columns,
  label,
  titleOf,
}: {
  page: DashboardPage;
  columns: number;
  label: string;
  titleOf: (widget: DashboardPage['widgets'][number]) => string;
}) {
  const rows = Math.max(
    1,
    ...page.widgets.map((widget) => (widget.layout.y ?? 0) + widget.layout.h),
  );
  const unit = Math.min(12, Math.max(4, PREVIEW_HEIGHT / rows));
  return (
    <div
      role="img"
      aria-label={label}
      // Dynamic geometry: the preview's height in rows.
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{ height: rows * unit }}
      className="relative w-full overflow-hidden rounded-md border border-border bg-surface-2"
    >
      {page.widgets.map((widget) => {
        const { x = 0, y = 0, w, h } = widget.layout;
        return (
          <div
            key={widget.id}
            aria-hidden="true"
            // Dynamic geometry: the widget's place on the preview grid.
            // eslint-disable-next-line no-restricted-syntax -- see above.
            style={{
              left: `${String((x / columns) * 100)}%`,
              width: `${String((w / columns) * 100)}%`,
              top: y * unit,
              height: h * unit,
            }}
            className="absolute p-0.5"
          >
            <div className="h-full truncate rounded-sm border border-accent-border bg-accent-bg px-1 text-xs text-accent-fg">
              {titleOf(widget)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
