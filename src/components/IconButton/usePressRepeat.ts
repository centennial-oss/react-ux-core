import { useCallback, useEffect, useRef } from 'react';
import { useDeadlineTimer } from '../../utils/timers';

export interface PressRepeatOptions {
  /** Called once when the press starts, then repeatedly while it's held. */
  onRepeat?: () => void;
  /** Milliseconds before repeating starts. */
  delay: number;
  /** Milliseconds between repeats. */
  interval: number;
  isDisabled?: boolean;
}

/**
 * Press-and-hold repeat for mouse, touch and a held Space or Enter (React Aria reports all three as press start and
 * end). One deadline timer drives it; it stops on release, blur, disable and unmount.
 */
export function usePressRepeat({
  onRepeat,
  delay,
  interval,
  isDisabled = false,
}: PressRepeatOptions) {
  const onRepeatRef = useRef(onRepeat);
  useEffect(() => {
    onRepeatRef.current = onRepeat;
  }, [onRepeat]);

  const intervalRef = useRef(interval);
  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  const timer = useDeadlineTimer(() => {
    onRepeatRef.current?.();
    timer.start(intervalRef.current);
  });

  useEffect(() => {
    if (isDisabled) {
      timer.clear();
    }
  }, [isDisabled, timer]);

  const start = useCallback(() => {
    if (!onRepeatRef.current || isDisabled) {
      return;
    }
    onRepeatRef.current();
    timer.start(delay);
  }, [delay, isDisabled, timer]);

  const stop = useCallback(() => {
    timer.clear();
  }, [timer]);

  return { onPressStart: start, onPressEnd: stop, onBlur: stop, isEnabled: onRepeat !== undefined };
}
