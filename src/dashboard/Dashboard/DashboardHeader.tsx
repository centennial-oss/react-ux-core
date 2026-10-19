// The dashboard's header (§11.1, §11.2): where you are (collection, dashboard, page), the time range and filters, and
// the view actions (refresh with auto-refresh, edit, full screen, the host's own). One row when wide, two rows at
// medium widths, and a compact bar on phones whose navigation and filters open in sheets (NAV-05).

import {
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Menu as MenuIcon,
} from 'lucide-react';
import { use, useState, type ReactNode } from 'react';
import { ListBox, useLocale } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { Drawer } from '../../components/Drawer/Drawer';
import { IconButton } from '../../components/IconButton/IconButton';
import { listBoxClasses, Option, OptionSection } from '../../components/ListBox/ListBoxParts';
import { MenuItem, MenuSection } from '../../components/Menu/Menu';
import { MenuButton, OverflowMenu, SplitButton } from '../../components/Menu/MenuButtons';
import { Pillbox } from '../../components/Pillbox/Pillbox';
import { Select } from '../../components/Select/Select';
import type { TimeRangePreset } from '../../components/TimeRangePicker/labels';
import type { TimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import { TimeRangePicker } from '../../components/TimeRangePicker/TimeRangePicker';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { numberFormat } from '../../utils/intl';
import { DashboardActionsContext } from '../context/DashboardContexts';
import type { DashboardStrings } from '../messages';
import type {
  DashboardCollection,
  DashboardDocument,
  DashboardLibrary,
  DashboardPage,
  JsonValue,
  WidgetAction,
} from '../types';
import { FilterBar } from './FilterBar';
import { activeFilterCount, type DashboardFilterDefinition } from './filters';
import type { DashboardSelection } from './selection';

/** Up to this many collections switch with a Pillbox; more use a Select (NAV-01). */
const PILLBOX_COLLECTIONS = 5;

/** How the header is laid out, by the dashboard's width (NAV-05). */
export type HeaderLayout = 'wide' | 'medium' | 'phone';

/** An auto-refresh interval's label in the locale's units ("30 sec", "5 min"); 0 is Off. */
export function intervalLabel(ms: number, locale: string, offLabel: string): string {
  if (ms <= 0) {
    return offLabel;
  }
  const isMinutes = ms % 60_000 === 0;
  return numberFormat(locale, {
    style: 'unit',
    unit: isMinutes ? 'minute' : 'second',
    unitDisplay: 'short',
  }).format(isMinutes ? ms / 60_000 : ms / 1000);
}

export interface DashboardHeaderProps {
  messages: DashboardStrings;
  layout: HeaderLayout;
  library: DashboardLibrary;
  collection: DashboardCollection | undefined;
  dashboards: readonly DashboardDocument[];
  dashboard: DashboardDocument | undefined;
  page: DashboardPage | undefined;
  /** Pages switch with Tabs, drawn below the header by the dashboard, when they fit; else with a Select (NAV-03). */
  isPageTabs: boolean;
  onNavigate: (target: Partial<DashboardSelection>) => void;
  hasTimeRangePicker: boolean;
  timeRange: TimeRange | undefined;
  onTimeRangeChange: (range: TimeRange) => void;
  timeRangePresets?: readonly TimeRangePreset[];
  timeZone: string;
  filters: readonly DashboardFilterDefinition[];
  filterValues: Readonly<Record<string, JsonValue>>;
  onFilterChange: (filterId: string, value: JsonValue) => void;
  runtimeContext: unknown;
  /** A widget is loading: Refresh shows progress and ignores presses (NAV-08). */
  isRefreshing: boolean;
  refreshIntervalMs: number;
  refreshIntervals: readonly number[];
  onRefreshIntervalChange: (ms: number) => void;
  /** Shows Edit (NAV-07). */
  canEdit: boolean;
  /** Shows Manage dashboards in the Edit menu. */
  canManage: boolean;
  onEditPage: () => void;
  onManage: () => void;
  isFullScreen: boolean;
  onFullScreenChange: () => void;
  /** Kiosk mode's page rotation (Q4), when it's on: paused or running. */
  kiosk?: { isPaused: boolean; onPausedChange: (isPaused: boolean) => void };
  viewActions?: readonly WidgetAction[];
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
  /** In edit mode the view actions give way to the edit toolbar. */
  isEditing: boolean;
}

/** The header of the dashboard: navigation, time range, filters and actions. */
export function DashboardHeader(props: DashboardHeaderProps) {
  const {
    messages,
    layout,
    library,
    collection,
    dashboards,
    dashboard,
    page,
    isPageTabs,
    onNavigate,
    filters,
    filterValues,
    isEditing,
  } = props;
  const { locale } = useLocale();
  // Refresh reloads every widget on the page (NAV-08), through the dashboard context.
  const { requestRefresh } = use(DashboardActionsContext);
  const onRefresh = () => {
    requestRefresh();
  };
  const [isNavOpen, setNavOpen] = useState(false);
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const collections = library.collections;
  const dashboardTitle = dashboard?.title ?? '';
  const pageTitle = page?.title ?? '';

  const collectionSwitcher =
    collections.length < 2 ? null : collections.length <= PILLBOX_COLLECTIONS ? (
      <Pillbox
        aria-label={messages.collectionSwitcher}
        size="sm"
        value={collection?.id ?? ''}
        options={collections.map((item) => ({ id: item.id, label: item.name }))}
        onChange={(collectionId) => {
          onNavigate({ collectionId });
        }}
      />
    ) : (
      <Select
        aria-label={messages.collectionSwitcher}
        size="sm"
        value={collection?.id ?? null}
        onChange={(collectionId) => {
          onNavigate({ collectionId });
        }}
      >
        {collections.map((item) => (
          <Option key={item.id} id={item.id}>
            {item.name}
          </Option>
        ))}
      </Select>
    );

  const dashboardSelector = !dashboard ? null : dashboards.length < 2 ? (
    <h2 className="truncate text-base font-semibold">{dashboardTitle}</h2>
  ) : (
    <Select
      aria-label={messages.dashboardSelector}
      size="sm"
      value={dashboard.id}
      onChange={(dashboardId) => {
        onNavigate({ collectionId: collection?.id, dashboardId });
      }}
      className="min-w-0 max-w-64"
    >
      {dashboards.map((item) => (
        <Option key={item.id} id={item.id}>
          {item.title}
        </Option>
      ))}
    </Select>
  );

  const pages = dashboard?.pages ?? [];
  const pageSelector =
    pages.length < 2 ? (
      pages.length === 1 && <span className="truncate text-sm text-fg-muted">{pageTitle}</span>
    ) : isPageTabs ? null : (
      <Select
        aria-label={messages.pageSelector}
        size="sm"
        value={page?.id ?? null}
        onChange={(pageId) => {
          onNavigate({
            collectionId: collection?.id,
            dashboardId: dashboard?.id,
            pageId,
          });
        }}
        className="min-w-0 max-w-56"
      >
        {pages.map((item) => (
          <Option key={item.id} id={item.id}>
            {item.title}
          </Option>
        ))}
      </Select>
    );

  const timeRangePicker = props.hasTimeRangePicker && (
    <TimeRangePicker
      aria-label={messages.timeRange}
      size="sm"
      value={props.timeRange ?? null}
      onChange={props.onTimeRangeChange}
      presets={props.timeRangePresets}
      timeZone={props.timeZone}
    />
  );
  const filterBar = filters.length > 0 && (
    <FilterBar
      filters={filters}
      values={filterValues}
      onChange={props.onFilterChange}
      runtimeContext={props.runtimeContext}
      messages={messages}
      isStacked={layout === 'phone'}
    />
  );

  const intervalItems = props.refreshIntervals.map((ms) => (
    <MenuItem key={ms} id={String(ms)}>
      {intervalLabel(ms, locale, messages.autoRefreshOff)}
    </MenuItem>
  ));
  const refresh = (
    <SplitButton
      label={messages.refresh}
      icon={RefreshCw}
      variant="outline"
      tone="neutral"
      size="sm"
      isPending={props.isRefreshing}
      onPress={onRefresh}
      menuTriggerLabel={messages.autoRefresh}
    >
      <MenuSection
        title={messages.autoRefresh}
        selectionMode="single"
        selectedKeys={[String(props.refreshIntervalMs)]}
        onSelectionChange={(keys) => {
          const [key] = keys === 'all' ? [] : [...keys];
          if (key !== undefined) {
            props.onRefreshIntervalChange(Number(key));
          }
        }}
      >
        {intervalItems}
      </MenuSection>
    </SplitButton>
  );
  const edit = (props.canEdit || props.canManage) && (
    <MenuButton
      label={messages.edit}
      icon={Pencil}
      size="sm"
      variant="outline"
      onAction={(key) => {
        if (key === 'page') {
          props.onEditPage();
        } else {
          props.onManage();
        }
      }}
    >
      {props.canEdit && <MenuItem id="page">{messages.editPage}</MenuItem>}
      {props.canManage && <MenuItem id="manage">{messages.manageDashboards}</MenuItem>}
    </MenuButton>
  );
  const fullScreenLabel = props.isFullScreen ? messages.exitFullScreen : messages.fullScreen;
  const fullScreen = (
    <Tooltip content={fullScreenLabel}>
      <IconButton
        icon={props.isFullScreen ? Minimize2 : Maximize2}
        aria-label={fullScreenLabel}
        size="sm"
        variant="ghost"
        onPress={props.onFullScreenChange}
      />
    </Tooltip>
  );
  const kioskLabel = props.kiosk?.isPaused ? messages.kioskResume : messages.kioskPause;
  const kiosk = props.kiosk && (
    <Tooltip content={kioskLabel}>
      <IconButton
        icon={props.kiosk.isPaused ? Play : Pause}
        aria-label={kioskLabel}
        size="sm"
        variant="ghost"
        onPress={() => {
          props.kiosk?.onPausedChange(!props.kiosk.isPaused);
        }}
      />
    </Tooltip>
  );
  const hostActions = (props.viewActions ?? []).map((action) => (
    <Button
      key={action.id}
      variant="ghost"
      size="sm"
      icon={action.icon}
      isDisabled={action.isDisabled}
      onPress={action.onAction}
    >
      {action.label}
    </Button>
  ));

  if (layout === 'phone') {
    const count = activeFilterCount(filterValues);
    const hasFilterSheet = filters.length > 0 || props.hasTimeRangePicker;
    return (
      <header
        aria-label={messages.dashboardHeader}
        className="flex min-w-0 flex-col gap-2 px-2 pt-2"
      >
        {props.headerStart}
        <div className="flex min-w-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={MenuIcon}
            onPress={() => {
              setNavOpen(true);
            }}
            className="min-w-0 flex-1 justify-start"
          >
            <span className="truncate">
              {messages.navigationButton({ dashboard: dashboardTitle, page: pageTitle })}
            </span>
          </Button>
          {hasFilterSheet && (
            <Button
              variant="ghost"
              size="sm"
              icon={SlidersHorizontal}
              onPress={() => {
                setFiltersOpen(true);
              }}
            >
              {messages.filtersButton({ count })}
            </Button>
          )}
          <Tooltip content={messages.refreshDashboard}>
            <IconButton
              icon={RefreshCw}
              aria-label={messages.refreshDashboard}
              size="sm"
              variant="ghost"
              isPending={props.isRefreshing}
              onPress={onRefresh}
            />
          </Tooltip>
          {!isEditing && (
            <OverflowMenu
              size="sm"
              aria-label={messages.moreDashboardActions}
              onAction={(key) => {
                const id = String(key);
                if (id === 'edit') {
                  props.onEditPage();
                } else if (id === 'manage') {
                  props.onManage();
                } else if (id === 'fullScreen') {
                  props.onFullScreenChange();
                } else if (id === 'kiosk') {
                  props.kiosk?.onPausedChange(!props.kiosk.isPaused);
                } else if (id.startsWith('refresh:')) {
                  props.onRefreshIntervalChange(Number(id.slice('refresh:'.length)));
                } else {
                  props.viewActions?.find((action) => action.id === id)?.onAction();
                }
              }}
            >
              {props.canEdit && <MenuItem id="edit">{messages.editPage}</MenuItem>}
              {props.canManage && <MenuItem id="manage">{messages.manageDashboards}</MenuItem>}
              <MenuItem id="fullScreen">{fullScreenLabel}</MenuItem>
              {props.kiosk && <MenuItem id="kiosk">{kioskLabel}</MenuItem>}
              <MenuSection
                title={messages.autoRefresh}
                selectionMode="single"
                selectedKeys={[`refresh:${String(props.refreshIntervalMs)}`]}
              >
                {props.refreshIntervals.map((ms) => (
                  <MenuItem key={ms} id={`refresh:${String(ms)}`}>
                    {intervalLabel(ms, locale, messages.autoRefreshOff)}
                  </MenuItem>
                ))}
              </MenuSection>
              {(props.viewActions ?? []).map((action) => (
                <MenuItem key={action.id} id={action.id} icon={action.icon}>
                  {action.label}
                </MenuItem>
              ))}
            </OverflowMenu>
          )}
          {props.headerEnd}
        </div>
        <Drawer title={messages.navigationTitle} isOpen={isNavOpen} onOpenChange={setNavOpen}>
          {(close) => (
            <div className="flex flex-col gap-3 pb-2">
              {collectionSwitcher}
              <ListBox
                aria-label={messages.navigationTitle}
                selectionMode="single"
                selectedKeys={page && dashboard ? [`${dashboard.id}\u001f${page.id}`] : []}
                onSelectionChange={(keys) => {
                  const [key] = keys === 'all' ? [] : [...keys];
                  if (key !== undefined) {
                    const [dashboardId, pageId] = String(key).split('\u001f');
                    onNavigate({ collectionId: collection?.id, dashboardId, pageId });
                    close();
                  }
                }}
                className={listBoxClasses}
              >
                {dashboards.map((item) => (
                  <OptionSection key={item.id} title={item.title}>
                    {item.pages.map((child) => (
                      <Option
                        key={child.id}
                        id={`${item.id}\u001f${child.id}`}
                        textValue={`${item.title} ${child.title}`}
                      >
                        {child.title}
                      </Option>
                    ))}
                  </OptionSection>
                ))}
              </ListBox>
            </div>
          )}
        </Drawer>
        {hasFilterSheet && (
          <Drawer
            title={messages.filtersTitle}
            isOpen={isFiltersOpen}
            onOpenChange={setFiltersOpen}
          >
            <div className="flex flex-col gap-4 pb-2">
              {timeRangePicker}
              {filterBar}
            </div>
          </Drawer>
        )}
      </header>
    );
  }

  const navigation = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {props.headerStart}
      {collectionSwitcher}
      {dashboardSelector}
      {pages.length > 0 && !isPageTabs && (
        <span aria-hidden="true" className="text-fg-muted">
          /
        </span>
      )}
      {pageSelector}
    </div>
  );
  const actions = (
    <div className="ms-auto flex flex-wrap items-center gap-1">
      {timeRangePicker}
      {!isEditing && refresh}
      {!isEditing && kiosk}
      {!isEditing && edit}
      {fullScreen}
      {!isEditing && hostActions}
      {props.headerEnd}
    </div>
  );
  return (
    <header
      aria-label={messages.dashboardHeader}
      className={cn(
        'flex min-w-0 gap-x-3 gap-y-2 px-3 pt-3',
        layout === 'wide' ? 'flex-wrap items-center' : 'flex-col',
      )}
    >
      {layout === 'wide' ? (
        <>
          {navigation}
          {filterBar}
          {actions}
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {navigation}
            {actions}
          </div>
          {filterBar}
        </>
      )}
    </header>
  );
}
