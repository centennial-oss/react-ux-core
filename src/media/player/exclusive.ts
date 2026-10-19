// Exclusive playback: players in the same group pause each other, so starting one recording stops the last.

import { useEffect } from 'react';

const groups = new Map<string, Set<HTMLMediaElement>>();

/** The group players join unless they choose another, or `null` to play alongside others. */
export const DEFAULT_EXCLUSIVE_GROUP = 'default';

/** Pauses every other element in `group` when `element` starts playing. `null` opts out. */
export function useExclusivePlayback(element: HTMLMediaElement | null, group: string | null): void {
  useEffect(() => {
    if (!element || group === null) {
      return;
    }
    let members = groups.get(group);
    if (!members) {
      members = new Set();
      groups.set(group, members);
    }
    const set = members;
    set.add(element);
    const onPlay = () => {
      for (const other of set) {
        if (other !== element && !other.paused) {
          other.pause();
        }
      }
    };
    element.addEventListener('play', onPlay);
    return () => {
      element.removeEventListener('play', onPlay);
      set.delete(element);
      if (set.size === 0) {
        groups.delete(group);
      }
    };
  }, [element, group]);
}
