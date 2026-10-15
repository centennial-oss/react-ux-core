import { isValidElement, type ReactNode } from 'react';
import { createDeadlineTimer } from '../../utils/timers';
import type { FeedbackTone } from '../../utils/types';

export type ToastTone = FeedbackTone;

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  /** Reuse an id to replace an existing toast instead of adding another. */
  id?: string;
  /** Defaults to `neutral`. Warnings and errors are announced assertively; the rest politely. */
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  /** One action button, such as "Undo". */
  action?: ToastAction;
  /**
   * Milliseconds before it dismisses itself, or `null` to stay until dismissed. Defaults to 5000 for neutral, info
   * and success, and `null` for warning and danger.
   */
  timeout?: number | null;
  /** Shows a dismiss button. Defaults to true. */
  isDismissable?: boolean;
  /** Called when the toast is dismissed or times out. */
  onClose?: () => void;
}

export interface ToastRecord {
  id: string;
  tone: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  action?: ToastAction;
  timeout: number | null;
  isDismissable: boolean;
  onClose?: () => void;
}

export interface ToastState {
  /** Newest first. */
  toasts: readonly ToastRecord[];
  /** The latest toast per politeness, so live regions announce each toast once, when it's added. */
  announcements: { polite: ToastRecord | null; assertive: ToastRecord | null };
}

export const DEFAULT_TOAST_TIMEOUT = 5000;

// Announced text is removed from the live regions after this long, so it doesn't linger in the accessibility tree.
const ANNOUNCEMENT_LIFETIME_MS = 7000;

let state: ToastState = { toasts: [], announcements: { polite: null, assertive: null } };
const listeners = new Set<() => void>();
let counter = 0;

function setState(next: ToastState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

/** The external store behind `toast()`, read by ToastRegion with useSyncExternalStore. */
export const toastStore = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): ToastState => state,
};

const announcementTimers = {
  polite: createDeadlineTimer(() => {
    setState({ ...state, announcements: { ...state.announcements, polite: null } });
  }),
  assertive: createDeadlineTimer(() => {
    setState({ ...state, announcements: { ...state.announcements, assertive: null } });
  }),
};

function isAssertive(tone: ToastTone): boolean {
  return tone === 'warning' || tone === 'danger';
}

function add(options: ToastOptions): string {
  counter += 1;
  const id = options.id ?? `toast-${String(counter)}`;
  const tone = options.tone ?? 'neutral';
  const record: ToastRecord = {
    id,
    tone,
    title: options.title,
    description: options.description,
    action: options.action,
    timeout:
      options.timeout !== undefined
        ? options.timeout
        : isAssertive(tone)
          ? null
          : DEFAULT_TOAST_TIMEOUT,
    isDismissable: options.isDismissable ?? true,
    onClose: options.onClose,
  };
  setState({
    toasts: [record, ...state.toasts.filter((existing) => existing.id !== id)],
    announcements: isAssertive(tone)
      ? { ...state.announcements, assertive: record }
      : { ...state.announcements, polite: record },
  });
  announcementTimers[isAssertive(tone) ? 'assertive' : 'polite'].start(ANNOUNCEMENT_LIFETIME_MS);
  return id;
}

function dismiss(id: string): void {
  const record = state.toasts.find((existing) => existing.id === id);
  if (!record) {
    return;
  }
  setState({ ...state, toasts: state.toasts.filter((existing) => existing.id !== id) });
  record.onClose?.();
}

function clear(): void {
  const removed = state.toasts;
  setState({ ...state, toasts: [] });
  for (const record of removed) {
    record.onClose?.();
  }
}

/** A toast's title, or its full options. */
export type ToastInput = ReactNode | Omit<ToastOptions, 'tone'>;

function normalize(input: ToastInput): Omit<ToastOptions, 'tone'> {
  if (typeof input === 'object' && input !== null && !isValidElement(input) && 'title' in input) {
    return input;
  }
  return { title: input as ReactNode };
}

/**
 * Shows a toast and returns its id. Works anywhere, including outside React components; the toasts appear in the
 * ToastRegion that UIProvider renders.
 *
 *   const id = toast({ tone: 'success', title: 'Saved' });
 *   toast.error({ title: 'Sync failed', action: { label: 'Retry', onPress: retry } });
 *   toast.dismiss(id);
 */
export const toast = Object.assign((options: ToastOptions): string => add(options), {
  success: (input: ToastInput) => add({ ...normalize(input), tone: 'success' }),
  info: (input: ToastInput) => add({ ...normalize(input), tone: 'info' }),
  warning: (input: ToastInput) => add({ ...normalize(input), tone: 'warning' }),
  error: (input: ToastInput) => add({ ...normalize(input), tone: 'danger' }),
  /** Dismisses one toast. */
  dismiss,
  /** Dismisses every toast. */
  clear,
});

export type ToastApi = typeof toast;

/** The toast API, for components that prefer a hook. Same as the `toast` export. */
export function useToast(): ToastApi {
  return toast;
}
