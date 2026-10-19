// Widgets' interactive state (Q3): a table's sort, say. Session-only by default; a host that wants it kept passes
// `widgetState` and `onWidgetStateChange`. One store per dashboard, read per widget, so a change re-renders only the
// widget it belongs to.

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { JsonObject } from '../types';

/** Every widget's state, by widget id. */
export interface WidgetStateStore {
  get: (widgetId: string) => JsonObject | undefined;
  set: (widgetId: string, state: JsonObject) => void;
  subscribe: (listener: () => void) => () => void;
  /** Takes the host's states (when it controls them), telling the widgets whose state changed. */
  replace: (states: Readonly<Record<string, JsonObject>>) => void;
}

/** A store calling `onChange` when a widget sets its state. */
export function createWidgetStateStore(
  onChange: (widgetId: string, state: JsonObject) => void,
): WidgetStateStore {
  let states: Readonly<Record<string, JsonObject>> = {};
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };
  return {
    get: (widgetId) => states[widgetId],
    set: (widgetId, state) => {
      states = { ...states, [widgetId]: state };
      notify();
      onChange(widgetId, state);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    replace: (next) => {
      if (next !== states) {
        states = next;
        notify();
      }
    },
  };
}

const noStore: WidgetStateStore | null = null;

/** A widget's state and its setter: from the dashboard's store, or kept by the widget without one. */
export function useWidgetState(
  store: WidgetStateStore | null = noStore,
  widgetId: string,
): [JsonObject | undefined, (state: JsonObject) => void] {
  const [own, setOwn] = useState<JsonObject | undefined>(undefined);
  const subscribe = useCallback(
    (listener: () => void) => store?.subscribe(listener) ?? (() => undefined),
    [store],
  );
  const shared = useSyncExternalStore(subscribe, () => store?.get(widgetId));
  const set = useCallback(
    (state: JsonObject) => {
      if (store) {
        store.set(widgetId, state);
      } else {
        setOwn(state);
      }
    },
    [store, widgetId],
  );
  return [store ? shared : own, set];
}
