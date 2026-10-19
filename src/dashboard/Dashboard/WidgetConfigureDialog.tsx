import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Dialog } from '../../components/Dialog/Dialog';
import { Option } from '../../components/ListBox/ListBoxParts';
import { Pillbox } from '../../components/Pillbox/Pillbox';
import { Select } from '../../components/Select/Select';
import { Switch } from '../../components/Switch/Switch';
import { Tab, TabList, TabPanel, Tabs } from '../../components/Tabs/Tabs';
import { TextField } from '../../components/TextField/TextField';
import type { TimeRangePreset } from '../../components/TimeRangePicker/labels';
import { TimeRangePicker } from '../../components/TimeRangePicker/TimeRangePicker';
import { isSameData } from '../document/document';
import { clampSize } from '../layout/engine';
import { readText, useDashboardMessages } from '../messages';
import type { AnyDataSource, AnyWidgetType, JsonObject, WidgetInstance } from '../types';
import type { WidgetRegistry } from '../widgets/define';
import { resolveOptions } from '../widgets/options';
import { OptionsForm } from './OptionsForm';

/** Whether a type can show a source's data: its own shape, or one it converts. */
function accepts(type: AnyWidgetType, source: AnyDataSource | undefined): boolean {
  return (
    source !== undefined &&
    (source.produces === type.dataShape || (type.alsoAccepts?.includes(source.produces) ?? false))
  );
}

/**
 * The instance switched to another type (WID-18): the binding kept when the new type accepts its data (else cleared),
 * options the new type doesn't know dropped, and the size held to its limits. Unknown properties are kept.
 */
export function withType(
  instance: WidgetInstance,
  type: AnyWidgetType,
  source: AnyDataSource | undefined,
): WidgetInstance {
  const known = new Set(Object.keys(type.defaultOptions as JsonObject));
  const options = Object.fromEntries(
    Object.entries(instance.options ?? {}).filter(([key]) => known.has(key)),
  );
  const size = clampSize(
    instance.layout,
    { minW: type.minSize?.w, minH: type.minSize?.h, maxW: type.maxSize?.w, maxH: type.maxSize?.h },
    Number.MAX_SAFE_INTEGER,
  );
  const next: WidgetInstance = {
    ...instance,
    type: type.type,
    options,
    layout: { ...instance.layout, ...size },
  };
  delete next.optionsVersion;
  if (!accepts(type, source)) {
    delete next.data;
  }
  if (!type.capabilities?.canUseTimeRange) {
    delete next.time;
  }
  return next;
}

export interface WidgetConfigureDialogProps {
  /** The widget as it is. */
  instance: WidgetInstance;
  widgetTypes: WidgetRegistry;
  dataSources: ReadonlyMap<string, AnyDataSource>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Called with the configured widget. A promise keeps the dialog pending until it settles. */
  onApply: (instance: WidgetInstance) => void | Promise<void>;
  /** Offers the lock toggle (PERM-01's `canLockWidgets`). */
  canLockWidgets?: boolean;
  /** Passed to parameter editors (CTX-16). */
  runtimeContext?: unknown;
  timeZone?: string;
  timeRangePresets?: readonly TimeRangePreset[];
  /** Draws a live preview of the pending configuration (EDIT-23). */
  renderPreview?: (instance: WidgetInstance) => ReactNode;
}

/**
 * The configure dialog (EDIT-22): the widget's data (sources of its shape, then the source's parameters editor),
 * display (the type's options editor or its schema form) and general settings (title, type, time range, lock). Apply
 * waits for valid settings (EDIT-24); closing with changes asks first. On phones it's a full-screen sheet.
 */
export function WidgetConfigureDialog({
  instance,
  widgetTypes,
  dataSources,
  isOpen,
  onOpenChange,
  onApply,
  canLockWidgets = false,
  runtimeContext,
  timeZone,
  timeRangePresets,
  renderPreview,
}: WidgetConfigureDialogProps) {
  const messages = useDashboardMessages();
  const [pending, setPending] = useState(instance);
  const [shownFor, setShownFor] = useState<WidgetInstance | null>(null);
  if (isOpen && shownFor !== instance) {
    setShownFor(instance);
    setPending(instance);
  }
  const [validity, setValidity] = useState({ params: true, options: true });
  const [isConfirmingClose, setConfirmingClose] = useState(false);
  const [typeChange, setTypeChange] = useState<AnyWidgetType | null>(null);
  const [isApplying, setApplying] = useState(false);

  const definition = widgetTypes.get(pending.type);
  const source = pending.data ? dataSources.get(pending.data.sourceId) : undefined;
  const sources = useMemo(
    () =>
      definition
        ? [...dataSources.values()].filter((candidate) => accepts(definition, candidate))
        : [],
    [definition, dataSources],
  );
  const options = useMemo(
    () => (definition ? resolveOptions(definition, pending) : {}),
    [definition, pending],
  );
  const optionsValidation = useMemo(
    () => definition?.validateOptions?.(options),
    [definition, options],
  );
  const params = useMemo(
    () => ({ ...(source?.defaultParams as JsonObject | undefined), ...pending.data?.params }),
    [source, pending.data?.params],
  );
  const paramsValidation = useMemo(() => source?.validateParams?.(params), [source, params]);
  const isDirty = !isSameData(pending, instance);
  const needsSource =
    definition !== undefined &&
    definition.dataShape !== null &&
    definition.isDataRequired !== false;
  const isValid =
    validity.params &&
    validity.options &&
    paramsValidation?.isValid !== false &&
    optionsValidation?.isValid !== false &&
    (!needsSource || source !== undefined) &&
    pending.title?.trim() !== '';

  const close = () => {
    setConfirmingClose(false);
    onOpenChange(false);
  };
  const requestClose = () => {
    if (isDirty) {
      setConfirmingClose(true);
    } else {
      close();
    }
  };
  const apply = async () => {
    setApplying(true);
    try {
      await onApply(pending);
      close();
    } finally {
      setApplying(false);
    }
  };

  const setParams = (next: JsonObject) => {
    if (pending.data) {
      setPending({ ...pending, data: { ...pending.data, params: next } });
    }
  };
  const setOptions = (next: JsonObject) => {
    setPending({
      ...pending,
      options: next,
      ...(definition?.optionsVersion === undefined
        ? {}
        : { optionsVersion: definition.optionsVersion }),
    });
  };
  const ParamsEditor = source?.paramsEditor;
  const OptionsEditor = definition?.optionsEditor;
  const typeName = definition ? readText(definition.displayName, messages) : pending.type;

  const dataTab = (
    <div className="flex flex-col gap-4">
      {sources.length === 0 ? (
        <p className="text-sm text-fg-muted">{messages.noMatchingSources}</p>
      ) : (
        <Select
          label={messages.dataSource}
          value={pending.data?.sourceId ?? null}
          onChange={(sourceId) => {
            const next = dataSources.get(sourceId);
            setValidity((current) => ({ ...current, params: true }));
            setPending({ ...pending, data: next ? { sourceId: next.id } : undefined });
          }}
        >
          {sources.map((candidate) => (
            <Option
              key={candidate.id}
              id={candidate.id}
              description={
                candidate.description === undefined
                  ? undefined
                  : readText(candidate.description, messages)
              }
            >
              {readText(candidate.label, messages)}
            </Option>
          ))}
        </Select>
      )}
      {source && ParamsEditor && (
        <ParamsEditor
          value={params}
          onChange={setParams}
          onValidityChange={(isParamsValid) => {
            setValidity((current) =>
              current.params === isParamsValid ? current : { ...current, params: isParamsValid },
            );
          }}
          runtimeContext={runtimeContext}
          widgetType={pending.type}
        />
      )}
      {source && !ParamsEditor && source.paramsSchema && (
        <OptionsForm
          schema={source.paramsSchema}
          value={params}
          onChange={setParams}
          validation={paramsValidation}
          onValidityChange={(isParamsValid) => {
            setValidity((current) =>
              current.params === isParamsValid ? current : { ...current, params: isParamsValid },
            );
          }}
          messages={messages}
          timeZone={timeZone}
        />
      )}
    </div>
  );

  const displayTab = OptionsEditor ? (
    <OptionsEditor
      value={options}
      onChange={setOptions}
      onValidityChange={(isOptionsValid) => {
        setValidity((current) =>
          current.options === isOptionsValid ? current : { ...current, options: isOptionsValid },
        );
      }}
      instance={pending}
      messages={messages}
    />
  ) : definition?.optionsSchema ? (
    <OptionsForm
      schema={definition.optionsSchema}
      value={options}
      onChange={setOptions}
      validation={optionsValidation}
      onValidityChange={(isOptionsValid) => {
        setValidity((current) =>
          current.options === isOptionsValid ? current : { ...current, options: isOptionsValid },
        );
      }}
      messages={messages}
      timeZone={timeZone}
    />
  ) : (
    <p className="text-sm text-fg-muted">{messages.noDisplayOptions}</p>
  );

  const timeRange = pending.time?.mode === 'override' ? pending.time.range : null;
  const generalTab = (
    <div className="flex flex-col gap-4">
      <TextField
        label={messages.widgetTitle}
        value={pending.title ?? ''}
        placeholder={typeName}
        onChange={(title) => {
          // An empty title falls back to the type's name.
          const next: WidgetInstance = { ...pending, title };
          if (title.trim() === '') {
            delete next.title;
          }
          setPending(next);
        }}
      />
      <Switch
        isSelected={pending.isTitleHidden === true}
        onChange={(isTitleHidden) => {
          setPending({ ...pending, isTitleHidden });
        }}
      >
        {messages.hideTitle}
      </Switch>
      <Select
        label={messages.widgetType}
        value={pending.type}
        onChange={(type) => {
          const next = widgetTypes.get(type);
          if (!next || next.type === pending.type) {
            return;
          }
          // A binding the new type can't show is cleared, but only once the user agrees (WID-18).
          if (pending.data && !accepts(next, source)) {
            setTypeChange(next);
          } else {
            setPending(withType(pending, next, source));
          }
        }}
      >
        {widgetTypes.types.map((type) => (
          <Option key={type.type} id={type.type} icon={type.icon}>
            {readText(type.displayName, messages)}
          </Option>
        ))}
      </Select>
      {definition?.capabilities?.canUseTimeRange && (
        <div className="flex flex-col gap-2">
          <span id="widget-time-label" className="text-sm font-medium">
            {messages.timeSetting}
          </span>
          <Pillbox
            aria-labelledby="widget-time-label"
            value={pending.time?.mode === 'override' ? 'override' : 'inherit'}
            options={[
              { id: 'inherit', label: messages.timeInherit },
              { id: 'override', label: messages.timeOverride },
            ]}
            onChange={(mode) => {
              setPending(
                mode === 'override'
                  ? {
                      ...pending,
                      time: {
                        mode: 'override',
                        range: timeRange ?? { kind: 'relative', from: '-24h', to: 'now' },
                      },
                    }
                  : { ...pending, time: { mode: 'inherit' } },
              );
            }}
          />
          {timeRange && (
            <TimeRangePicker
              aria-label={messages.timeSetting}
              value={timeRange}
              presets={timeRangePresets}
              timeZone={timeZone}
              onChange={(range) => {
                setPending({ ...pending, time: { mode: 'override', range } });
              }}
            />
          )}
        </div>
      )}
      {canLockWidgets && (
        <Switch
          isSelected={pending.isLocked === true}
          onChange={(isLocked) => {
            setPending({ ...pending, isLocked });
          }}
        >
          {messages.lockWidget}
        </Switch>
      )}
    </div>
  );

  const hasData = definition !== undefined && definition.dataShape !== null;
  return (
    <>
      <Dialog
        title={messages.configureTitle({ title: instance.title ?? typeName })}
        size="lg"
        isOpen={isOpen}
        isBusy={isApplying}
        onOpenChange={(open) => {
          if (!open) {
            requestClose();
          }
        }}
        footer={
          <ButtonGroup>
            <Button variant="outline" onPress={requestClose}>
              {messages.cancel}
            </Button>
            <Button
              variant="solid"
              tone="accent"
              isDisabled={!isValid}
              isPending={isApplying}
              onPress={() => {
                void apply();
              }}
            >
              {messages.apply}
            </Button>
          </ButtonGroup>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <Tabs defaultSelectedKey={hasData ? 'data' : 'display'}>
            <TabList aria-label={messages.configureTitle({ title: instance.title ?? typeName })}>
              {hasData && <Tab id="data">{messages.tabData}</Tab>}
              <Tab id="display">{messages.tabDisplay}</Tab>
              <Tab id="general">{messages.tabGeneral}</Tab>
            </TabList>
            {hasData && (
              <TabPanel id="data" className="pt-4">
                {dataTab}
              </TabPanel>
            )}
            <TabPanel id="display" className="pt-4">
              {displayTab}
            </TabPanel>
            <TabPanel id="general" className="pt-4">
              {generalTab}
            </TabPanel>
          </Tabs>
          {renderPreview && isValid && (
            <section aria-label={messages.preview} className="flex h-60 min-w-0 flex-col">
              {renderPreview(pending)}
            </section>
          )}
        </div>
      </Dialog>
      <ConfirmDialog
        isOpen={isConfirmingClose}
        onOpenChange={setConfirmingClose}
        title={messages.discardChangesTitle}
        body={messages.discardChangesBody}
        tone="danger"
        confirmLabel={messages.discardChanges}
        onConfirm={close}
      />
      <ConfirmDialog
        isOpen={typeChange !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTypeChange(null);
          }
        }}
        title={messages.changeTypeTitle}
        body={messages.changeTypeBody}
        confirmLabel={messages.confirm}
        onConfirm={() => {
          if (typeChange) {
            setPending(withType(pending, typeChange, source));
          }
          setTypeChange(null);
        }}
      />
    </>
  );
}
