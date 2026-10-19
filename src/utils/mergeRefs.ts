import type { Ref, RefCallback } from 'react';

/**
 * Combines refs so one element can be given to several of them. Ref callbacks that return a cleanup (React 19) get
 * it called on detach; the others are called with `null`, and object refs are reset to `null`.
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') {
        const cleanup = ref(node);
        return typeof cleanup === 'function'
          ? cleanup
          : () => {
              ref(null);
            };
      }
      if (ref) {
        ref.current = node;
        return () => {
          ref.current = null;
        };
      }
      return undefined;
    });
    return () => {
      for (const cleanup of cleanups) {
        cleanup?.();
      }
    };
  };
}
