// Components whose code loads (with a dynamic import) the first time one renders, so an entry point doesn't bundle
// parts most apps never show.

import { useEffect, useState, type ComponentType } from 'react';

type LoadState<P> = { component: ComponentType<P> } | { error: unknown };

/** Starts the load of each component `lazyComponent` made. */
const preloaders = new WeakMap<object, () => void>();

/** Starts loading a component made by `lazyComponent`, so it renders straight away later; others are ignored. */
export function preloadComponent(component: unknown): void {
  if (typeof component === 'function') {
    preloaders.get(component)?.();
  }
}

/**
 * A component whose code `load` fetches (a dynamic import) the first time any instance renders; each instance shows
 * `Fallback`, given the same props, until it arrives. Unlike `React.lazy` it needs no Suspense boundary and isn't held
 * back by React's fallback throttling, so the real component replaces the fallback as soon as its code is ready, and
 * once loaded (or preloaded with `preloadComponent`), new instances render it straight away. A failed load throws to
 * the nearest error boundary; the next mount tries again.
 */
export function lazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>,
  Fallback: ComponentType<P>,
): ComponentType<P> {
  let loaded: ComponentType<P> | undefined;
  let loading: Promise<ComponentType<P>> | undefined;

  // One load for every instance.
  const start = () => {
    loading ??= load().then(
      (component) => {
        loaded = component;
        return component;
      },
      (error: unknown) => {
        loading = undefined;
        throw error;
      },
    );
    return loading;
  };

  function LazyComponent(props: P) {
    const [state, setState] = useState<LoadState<P> | undefined>(() =>
      loaded === undefined ? undefined : { component: loaded },
    );

    useEffect(() => {
      if (state !== undefined) {
        return;
      }
      let isCurrent = true;
      start().then(
        (component) => {
          if (isCurrent) {
            setState({ component });
          }
        },
        (error: unknown) => {
          if (isCurrent) {
            setState({ error });
          }
        },
      );
      return () => {
        isCurrent = false;
      };
    }, [state]);

    if (state === undefined) {
      return <Fallback {...props} />;
    }
    if ('error' in state) {
      throw state.error;
    }
    const Loaded = state.component;
    return <Loaded {...props} />;
  }

  preloaders.set(LazyComponent, () => {
    // A failure surfaces when an instance mounts (and loads again).
    start().catch(() => undefined);
  });
  return LazyComponent;
}
