import { useState, type ReactNode } from 'react';
import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { useDeadlineTimer } from '../../utils/timers';

// How long a tooltip stays up after a touch tap (touch has no hover to keep it open).
const TOUCH_DISPLAY_MS = 1500;

export interface TooltipProps {
  /** The tooltip's text. Keep it short: it describes the trigger, it isn't for interactive content. */
  content: ReactNode;
  /** The trigger: one focusable React Aria-based element, such as a Button or IconButton. */
  children: ReactNode;
  /** Defaults to `top`. */
  placement?: AriaTooltipProps['placement'];
  /** Milliseconds of hover before showing. Defaults to 700. Keyboard focus shows it immediately. */
  delay?: number;
  isDisabled?: boolean;
}

/**
 * A short label for a control, typically an icon-only button. Shows on hover and keyboard focus, and briefly after
 * a touch tap (React Aria's own tooltip never shows for touch).
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 700,
  isDisabled = false,
}: TooltipProps) {
  const [isOpen, setOpen] = useState(false);
  const touchTimer = useDeadlineTimer(() => {
    setOpen(false);
  });

  return (
    <span
      className="contents"
      onPointerUpCapture={(event) => {
        if (event.pointerType === 'touch' && !isDisabled) {
          setOpen(true);
          touchTimer.start(TOUCH_DISPLAY_MS);
        }
      }}
    >
      <AriaTooltipTrigger
        isOpen={isOpen}
        onOpenChange={(open) => {
          setOpen(open);
          if (!open) {
            touchTimer.clear();
          }
        }}
        delay={delay}
        closeDelay={300}
        isDisabled={isDisabled}
      >
        {children}
        <AriaTooltip
          placement={placement}
          offset={8}
          className={cn(
            'group/tooltip z-toast max-w-xs rounded-control bg-fg px-2 py-1 text-xs text-fg-inverse shadow-overlay',
            'data-entering:animate-[rux-fade-in_var(--duration-fast)_var(--ease-standard)]',
            'data-exiting:animate-[rux-fade-out_var(--duration-fast)_var(--ease-standard)]',
          )}
        >
          <OverlayArrow>
            <svg
              width={8}
              height={8}
              viewBox="0 0 8 8"
              className="block fill-fg group-data-[placement=bottom]/tooltip:rotate-180 group-data-[placement=left]/tooltip:-rotate-90 group-data-[placement=right]/tooltip:rotate-90"
            >
              <path d="M0 0 L4 4 L8 0" />
            </svg>
          </OverlayArrow>
          {content}
        </AriaTooltip>
      </AriaTooltipTrigger>
    </span>
  );
}
