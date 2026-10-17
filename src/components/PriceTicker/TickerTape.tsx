// TickerTape: a row of tickers that scrolls sideways when it's wider than its container, looping seamlessly over a
// hidden second copy. It pauses while hovered or focused, and a toggle stops it for touch and keyboard users (WCAG
// 2.2.2). With reduced motion it's a static list that wraps. The scrolling uses the Web Animations API: no timers.
import { Pause } from 'lucide-react';
import { Children, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useElementWidth } from '../../utils/useElementWidth';
import { useMediaQuery } from '../../utils/useMediaQuery';
import { IconButton } from '../IconButton/IconButton';
import { defaultPriceTickerMessages } from './messages';
import { TickerCopyContext } from './PriceTicker';

export interface TickerTapeProps {
  /** Names the group of tickers, such as "Space weather". */
  label: string;
  /** The tickers, usually `PriceTicker`s with `variant="inline"`. Each becomes a list item. */
  children: ReactNode;
  /** Scrolling speed in pixels per second. Defaults to 40. */
  speed?: number;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A horizontally scrolling row of tickers that pauses on hover or focus, with a pause toggle. It's a static, wrapping
 * list under reduced motion, or when everything already fits.
 */
export function TickerTape({ label, children, speed = 40, className, ref }: TickerTapeProps) {
  const messages = useEntryMessages(defaultPriceTickerMessages);
  const { direction } = useLocale();
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [viewportRef, viewportWidth] = useElementWidth();
  const [listRef, listWidth] = useElementWidth();
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [isHovered, setHovered] = useState(false);
  const [isFocusWithin, setFocusWithin] = useState(false);
  const [isStopped, setStopped] = useState(false);

  // The list is as wide as its content (w-max), so it can be compared with the viewport whatever the layout.
  const isMoving =
    !isReducedMotion &&
    listWidth !== undefined &&
    viewportWidth !== undefined &&
    listWidth > viewportWidth;
  const isPaused = isHovered || isFocusWithin || isStopped;

  useEffect(() => {
    const track = trackRef.current;
    if (!isMoving || !track) {
      return;
    }
    // One copy's width per loop; the second copy fills the gap, so the jump back is invisible.
    const distance = direction === 'rtl' ? listWidth : -listWidth;
    const animation = track.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${String(distance)}px)` }],
      { duration: (listWidth / Math.max(1, speed)) * 1000, iterations: Infinity },
    );
    animationRef.current = animation;
    return () => {
      animation.cancel();
      animationRef.current = null;
    };
  }, [isMoving, listWidth, speed, direction]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!animation) {
      return;
    }
    if (isPaused) {
      animation.pause();
    } else {
      animation.play();
    }
  }, [isPaused, isMoving, listWidth, speed, direction]);

  const items = Children.map(children, (child) => (
    <li className={cn('shrink-0', !isReducedMotion && 'pe-8')}>{child}</li>
  ));

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      data-moving={isMoving || undefined}
      data-paused={(isMoving && isPaused) || undefined}
      onPointerEnter={() => {
        setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
      onFocus={() => {
        setFocusWithin(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-2 text-fg',
        className,
      )}
    >
      {isReducedMotion ? (
        <ul className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-8 gap-y-2">{items}</ul>
      ) : (
        <>
          <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
            <div ref={trackRef} className="flex w-max items-baseline">
              <ul ref={listRef} className="flex w-max shrink-0 items-baseline">
                {items}
              </ul>
              {isMoving && (
                <ul aria-hidden="true" inert className="flex w-max shrink-0 items-baseline">
                  <TickerCopyContext value>{items}</TickerCopyContext>
                </ul>
              )}
            </div>
          </div>
          {isMoving && (
            <IconButton
              icon={Pause}
              aria-label={messages.tickerTapePause}
              size="sm"
              isSelected={isStopped}
              onChange={setStopped}
              className="shrink-0"
            />
          )}
        </>
      )}
    </div>
  );
}
