import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore, type FocusEvent } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useDeadlineTimer } from '../../utils/timers';
import { Button } from '../Button/Button';
import { toast, toastStore, type ToastRecord, type ToastTone } from './toastStore';

export type ToastPlacement =
  'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end';

// Phones always stack toasts at the bottom, full width, above any bottom bar (--rux-toast-bottom-offset, set by the
// app shell). Wider screens use the chosen corner or edge.
const placementClasses: Record<ToastPlacement, string> = {
  'top-start': 'sm:top-4 sm:bottom-auto sm:start-4',
  top: 'sm:top-4 sm:bottom-auto sm:start-1/2 sm:-translate-x-1/2',
  'top-end': 'sm:top-4 sm:bottom-auto sm:end-4',
  'bottom-start': 'sm:start-4',
  bottom: 'sm:start-1/2 sm:-translate-x-1/2',
  'bottom-end': 'sm:end-4',
};

const toneIcons: Record<ToastTone, IconComponent> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
};

const toneClasses: Record<ToastTone, { accent: string; icon: string }> = {
  neutral: { accent: 'border-s-neutral-border', icon: 'text-neutral-fg' },
  info: { accent: 'border-s-info-solid', icon: 'text-info-fg' },
  success: { accent: 'border-s-success-solid', icon: 'text-success-fg' },
  warning: { accent: 'border-s-warning-solid', icon: 'text-warning-fg' },
  danger: { accent: 'border-s-danger-solid', icon: 'text-danger-fg' },
};

export interface ToastRegionProps {
  /** Where toasts appear on tablet and desktop. Defaults to `bottom-end`. Phones always use the bottom. */
  placement?: ToastPlacement;
  /** Most toasts shown at once; newer ones push older ones out of view. Defaults to 5. */
  maxVisible?: number;
}

function ToastItem({
  record,
  isPaused,
  onDismiss,
}: {
  record: ToastRecord;
  isPaused: boolean;
  onDismiss: (id: string) => void;
}) {
  const messages = useCommonMessages();
  const Icon = toneIcons[record.tone];
  const timer = useDeadlineTimer(() => {
    onDismiss(record.id);
  });

  useEffect(() => {
    if (record.timeout !== null) {
      timer.start(record.timeout);
    }
    return () => {
      timer.clear();
    };
  }, [record, timer]);

  useEffect(() => {
    if (isPaused) {
      timer.pause();
    } else {
      timer.resume();
    }
  }, [isPaused, timer]);

  return (
    <li
      data-toast-id={record.id}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-card border border-s-4 border-border bg-surface-2 p-3 text-sm text-fg shadow-overlay',
        'animate-[rux-toast-in_var(--duration-normal)_var(--ease-standard)]',
        toneClasses[record.tone].accent,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-5 shrink-0', toneClasses[record.tone].icon)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{record.title}</p>
        {record.description !== undefined && (
          <div className="text-fg-muted">{record.description}</div>
        )}
        {record.action && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="soft"
              tone="accent"
              onPress={() => {
                record.action?.onPress();
                onDismiss(record.id);
              }}
            >
              {record.action.label}
            </Button>
          </div>
        )}
      </div>
      {record.isDismissable && (
        <AriaButton
          aria-label={messages.dismiss}
          onPress={() => {
            onDismiss(record.id);
          }}
          className={cn(
            'hit-area relative -m-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted',
            'data-focus-visible:focus-ring data-hovered:bg-surface-3 data-hovered:text-fg',
          )}
        >
          {record.timeout !== null && (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="absolute inset-0 size-full -rotate-90 motion-reduce:hidden"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth="2"
                strokeDasharray="62.832"
                className="stroke-border-strong group-data-paused/toasts:[animation-play-state:paused]"
                // eslint-disable-next-line no-restricted-syntax -- dynamic timing: the ring runs for this toast's timeout
                style={{ animation: `rux-countdown ${String(record.timeout)}ms linear forwards` }}
              />
            </svg>
          )}
          <X aria-hidden="true" className="relative size-4" />
        </AriaButton>
      )}
    </li>
  );
}

/**
 * Shows the toasts created with `toast()`. UIProvider renders one, so apps normally don't. Hovering or focusing it
 * pauses every countdown. Stays usable while a modal dialog is open.
 */
export function ToastRegion({ placement = 'bottom-end', maxVisible = 5 }: ToastRegionProps) {
  const messages = useCommonMessages();
  const { toasts, announcements } = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getSnapshot,
  );
  const [isHovered, setHovered] = useState(false);
  const [isFocusWithin, setFocusWithin] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  const visible = toasts.slice(0, maxVisible);
  const isBottom = placement.startsWith('bottom');
  const dismissableCount = visible.filter((record) => record.isDismissable).length;

  // If the toast being dismissed has focus, move focus to a neighbouring toast, or back to where it came from.
  const dismiss = (id: string) => {
    const list = listRef.current;
    const item = list?.querySelector(`[data-toast-id="${CSS.escape(id)}"]`);
    if (item?.contains(document.activeElement)) {
      const neighbour = item.nextElementSibling ?? item.previousElementSibling;
      const target = neighbour?.querySelector<HTMLElement>('button') ?? null;
      if (target) {
        target.focus();
      } else if (returnFocusRef.current instanceof HTMLElement) {
        returnFocusRef.current.focus();
      }
    }
    toast.dismiss(id);
  };

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    if (!isFocusWithin && !event.currentTarget.contains(event.relatedTarget)) {
      returnFocusRef.current = event.relatedTarget;
    }
    setFocusWithin(true);
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusWithin(false);
    }
  };

  const isPaused = (isHovered || isFocusWithin) && visible.length > 0;

  return (
    <div data-react-aria-top-layer="true">
      {/* Live regions exist before any toast, so every toast is announced: politely, or assertively for warnings and errors. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcements.polite && (
          <span key={announcements.polite.id}>
            {announcements.polite.title} {announcements.polite.description}
          </span>
        )}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcements.assertive && (
          <span key={announcements.assertive.id}>
            {announcements.assertive.title} {announcements.assertive.description}
          </span>
        )}
      </div>
      {visible.length > 0 && (
        <section
          aria-label={messages.notifications}
          data-paused={isPaused || undefined}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') {
              setHovered(true);
            }
          }}
          onPointerLeave={() => {
            setHovered(false);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            'group/toasts pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col gap-2 px-3',
            'pb-[calc(env(safe-area-inset-bottom)+var(--rux-toast-bottom-offset,0px)+0.75rem)]',
            'sm:inset-x-auto sm:bottom-4 sm:w-96 sm:px-0 sm:pb-0',
            placementClasses[placement],
          )}
        >
          {dismissableCount >= 3 && (
            <div
              className={cn(
                'pointer-events-auto flex justify-end',
                isBottom ? 'order-first' : 'order-last',
              )}
            >
              <Button size="sm" variant="soft" onPress={toast.clear}>
                {messages.clearAll}
              </Button>
            </div>
          )}
          <ol
            ref={listRef}
            className={cn('flex gap-2', isBottom ? 'flex-col-reverse' : 'flex-col')}
          >
            {visible.map((record) => (
              <ToastItem key={record.id} record={record} isPaused={isPaused} onDismiss={dismiss} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
