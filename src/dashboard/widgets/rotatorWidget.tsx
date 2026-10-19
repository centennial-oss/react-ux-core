// The rotator (§10.7): a container showing its child widgets one at a time, in turn. Each child keeps its own data
// binding; only the shown child loads, and the next one starts loading shortly before its turn. Rotation pauses in
// edit mode, while hovered or focused, while the page is hidden and under reduced motion (BI-13).

import { ChevronLeft, ChevronRight, Pause, Play, Repeat } from 'lucide-react';
import { use, useEffect, useMemo, useState, type FocusEvent } from 'react';
import { IconButton } from '../../components/IconButton/IconButton';
import { LiveRegion, useAnnouncer } from '../../components/LiveRegion/LiveRegion';
import { lazyComponent } from '../../utils/lazyComponent';
import { useDeadlineTimer } from '../../utils/timers';
import { useIsReducedMotion, useMediaQuery } from '../../utils/useMediaQuery';
import { useIsPageHidden } from '../../utils/usePageVisibility';
import { useRecurringTimer } from '../../utils/useRecurringTimer';
import { DashboardRuntimeContext } from '../context/DashboardContexts';
import { readText } from '../messages';
import type {
  JsonObject,
  JsonValue,
  WidgetInstance,
  WidgetOptionsEditorProps,
  WidgetRenderProps,
} from '../types';
import { WidgetView } from '../WidgetFrame/WidgetView';
import { defineWidget } from './define';

/** The Display tab, loaded when a rotator is first configured: it carries the configure dialog for its children. */
const RotatorOptionsEditor = lazyComponent<WidgetOptionsEditorProps<RotatorWidgetOptions>>(
  () => import('./RotatorOptionsEditor').then((module) => module.RotatorOptionsEditor),
  () => null,
);

/** The rotator's options. Its children are widget instances, kept in its options. */
export interface RotatorWidgetOptions extends JsonObject {
  intervalMs: number;
  hasControls: boolean;
  children: JsonValue[];
}

/** The shortest turn, so a mistyped interval can't flicker. */
const MIN_INTERVAL = 1000;
/** The controls' row, in pixels before scaling. */
const CONTROLS_HEIGHT = 40;

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The rotator's children as widget instances: entries without an id and a type are skipped. */
export function rotatorChildren(options: Pick<RotatorWidgetOptions, 'children'>): WidgetInstance[] {
  const list = Array.isArray(options.children) ? options.children : [];
  return list.flatMap((entry) =>
    isObject(entry) && typeof entry.id === 'string' && typeof entry.type === 'string'
      ? [
          {
            ...(entry as unknown as WidgetInstance),
            // A child shows in the rotator's frame: its own layout doesn't matter.
            layout: isObject(entry.layout)
              ? (entry.layout as WidgetInstance['layout'])
              : { w: 1, h: 1 },
          },
        ]
      : [],
  );
}

function RotatorView({
  displayOptions,
  dashboard,
  frameSize,
  mode,
  messages,
}: WidgetRenderProps<RotatorWidgetOptions, undefined>) {
  const registry = use(DashboardRuntimeContext)?.widgetTypes;
  const children = useMemo(() => rotatorChildren(displayOptions), [displayOptions]);
  const count = children.length;
  const [index, setIndex] = useState(0);
  const active = count === 0 ? 0 : index % count;
  const [isPaused, setPaused] = useState(false);
  const [isHovered, setHovered] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const [isPreloading, setPreloading] = useState(false);
  const isReducedMotion = useIsReducedMotion();
  const isPageHidden = useIsPageHidden();
  // Only a pointer that hovers pauses it: a tap on a touch screen isn't a hover.
  const canHover = useMediaQuery('(hover: hover)');
  const { ref: announcerRef, announce } = useAnnouncer();
  const interval = Math.max(MIN_INTERVAL, displayOptions.intervalMs);
  const isRunning =
    count > 1 &&
    !isPaused &&
    mode !== 'edit' &&
    !(canHover && isHovered) &&
    !isFocused &&
    !isPageHidden &&
    !isReducedMotion;

  const turn = useRecurringTimer(
    () => {
      setIndex((current) => current + 1);
      setPreloading(false);
    },
    interval,
    { isRunning },
  );
  // The next child starts loading shortly before its turn.
  const preload = useDeadlineTimer(() => {
    setPreloading(true);
  });
  useEffect(() => {
    if (!isRunning) {
      return;
    }
    preload.start(interval - Math.min(2000, interval / 2));
    return () => {
      preload.clear();
    };
  }, [isRunning, active, interval, preload]);

  const scope = useMemo(
    () => ({ breakpoint: dashboard.breakpoint, mode, scale: frameSize.scale }),
    [dashboard.breakpoint, mode, frameSize.scale],
  );
  const hasControls = displayOptions.hasControls && count > 1;
  const controlsHeight = hasControls ? CONTROLS_HEIGHT * frameSize.scale : 0;
  const cell = useMemo(
    () => ({
      w: frameSize.w,
      h: frameSize.h,
      width: frameSize.width,
      height: Math.max(0, frameSize.height - controlsHeight),
      scale: frameSize.scale,
    }),
    [frameSize, controlsHeight],
  );

  if (count === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 text-center text-sm text-fg-muted">
        {messages.rotatorEmpty}
      </div>
    );
  }

  const titleOf = (child: WidgetInstance) => {
    const definition = registry?.get(child.type);
    return child.title ?? (definition ? readText(definition.displayName, messages) : child.type);
  };
  const show = (next: number) => {
    const position = ((next % count) + count) % count;
    const child = children[position];
    setIndex(position);
    setPreloading(false);
    turn.restart();
    if (child) {
      announce(messages.rotatorPosition({ position: position + 1, count, title: titleOf(child) }));
    }
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocused(false);
    }
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') {
          setHovered(true);
        }
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={onBlur}
    >
      {children.map((child, position) => {
        const isActive = position === active;
        const isNext = count > 1 && position === (active + 1) % count;
        if (!isActive && !isNext) {
          return null;
        }
        return (
          <div key={child.id} hidden={!isActive} className="min-h-0 flex-1 px-2 pt-1">
            <WidgetView
              instance={child}
              definition={registry?.get(child.type)}
              cell={cell}
              scope={scope}
              isEnabled={isActive || isPreloading}
              headingLevel={4}
              className="rounded-control shadow-none"
            />
          </div>
        );
      })}
      {hasControls && (
        <div
          role="group"
          aria-label={messages.rotatorControls}
          className="flex shrink-0 items-center justify-center gap-1 py-1"
        >
          <IconButton
            icon={ChevronLeft}
            aria-label={messages.rotatorPrevious}
            size="sm"
            variant="ghost"
            onPress={() => {
              show(active - 1);
            }}
          />
          <IconButton
            icon={isPaused ? Play : Pause}
            aria-label={isPaused ? messages.rotatorPlay : messages.rotatorPause}
            size="sm"
            variant="ghost"
            onPress={() => {
              setPaused(!isPaused);
            }}
          />
          <IconButton
            icon={ChevronRight}
            aria-label={messages.rotatorNext}
            size="sm"
            variant="ghost"
            onPress={() => {
              show(active + 1);
            }}
          />
          <span
            aria-hidden="true"
            className="min-w-10 text-center text-xs text-fg-muted tabular-nums"
          >
            {`${String(active + 1)} / ${String(count)}`}
          </span>
        </div>
      )}
      <LiveRegion ref={announcerRef} />
    </div>
  );
}

/** The rotator widget type (P2): a container (`isContainer`) of widgets shown in turn. */
export const rotatorWidget = defineWidget<RotatorWidgetOptions, undefined>({
  type: 'ccux.rotator',
  displayName: (messages) => messages.rotatorWidget,
  description: (messages) => messages.rotatorWidgetDescription,
  icon: Repeat,
  category: (messages) => messages.widgetCategoryLayout,
  dataShape: null,
  defaultSize: { w: 6, h: 5 },
  minSize: { w: 3, h: 3 },
  stackedHeight: 7,
  capabilities: { isContainer: true },
  defaultOptions: { intervalMs: 5000, hasControls: true, children: [] },
  optionsEditor: RotatorOptionsEditor,
  component: RotatorView,
});
