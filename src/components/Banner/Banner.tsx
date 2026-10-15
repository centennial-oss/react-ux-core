import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { useId, useLayoutEffect, useState, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useDeadlineTimer } from '../../utils/timers';
import type { FeedbackTone } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';

const toneClasses: Record<FeedbackTone, { box: string; icon: string }> = {
  neutral: { box: 'border-neutral-border bg-neutral-bg', icon: 'text-neutral-fg' },
  info: { box: 'border-info-border bg-info-bg', icon: 'text-info-fg' },
  success: { box: 'border-success-border bg-success-bg', icon: 'text-success-fg' },
  warning: { box: 'border-warning-border bg-warning-bg', icon: 'text-warning-fg' },
  danger: { box: 'border-danger-border bg-danger-bg', icon: 'text-danger-fg' },
};

const toneIcons: Record<FeedbackTone, IconComponent> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
};

// setTimeout can't wait longer than about 24.8 days; longer expiries re-check after that.
const MAX_TIMER_MS = 2_147_483_647;

export interface BannerProps {
  /** Defaults to `info`. Warning and danger banners are announced assertively (`role="alert"`). */
  tone?: FeedbackTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons or links for the banner's actions. */
  actions?: ReactNode;
  /** Replaces the tone's icon; `null` shows no icon. */
  icon?: IconComponent | null;
  /** Shows a dismiss button. */
  isDismissable?: boolean;
  /** Whether the banner is shown, controlled. */
  isOpen?: boolean;
  /** Whether the banner is shown initially, uncontrolled. Defaults to true. */
  defaultOpen?: boolean;
  /** Called when the banner is dismissed or expires. */
  onOpenChange?: (isOpen: boolean) => void;
  /** Hides the banner at this time. */
  expiresAt?: Date | number;
  className?: string;
}

/** The inline message component, for a page or inside a card or form. */
export function Banner({
  tone = 'info',
  title,
  children,
  actions,
  icon,
  isDismissable = false,
  isOpen: isOpenProp,
  defaultOpen = true,
  onOpenChange,
  expiresAt,
  className,
}: BannerProps) {
  const messages = useMessages();
  const titleId = useId();
  const [isOpen, setOpen] = useControllableState(isOpenProp, defaultOpen, onOpenChange);
  const expiry = expiresAt === undefined ? undefined : new Date(expiresAt).getTime();

  // When the timer fires, re-check the expiry (long expiries take several timer runs).
  const [recheck, setRecheck] = useState(0);
  const timer = useDeadlineTimer(() => {
    setRecheck((count) => count + 1);
  });

  // A layout effect, so an already-expired banner closes before it's ever painted.
  useLayoutEffect(() => {
    if (!isOpen || expiry === undefined) {
      timer.clear();
      return;
    }
    const remaining = expiry - Date.now();
    if (remaining <= 0) {
      setOpen(false);
      return;
    }
    timer.start(Math.min(remaining, MAX_TIMER_MS));
  }, [expiry, isOpen, setOpen, timer, recheck]);

  if (!isOpen) {
    return null;
  }

  const Icon = icon === undefined ? toneIcons[tone] : icon;
  const styles = toneClasses[tone];

  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      aria-labelledby={title !== undefined ? titleId : undefined}
      className={cn(
        'flex items-start gap-3 rounded-card border p-3 text-sm text-fg',
        styles.box,
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', styles.icon)} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title !== undefined && (
          <p id={titleId} className="font-semibold">
            {title}
          </p>
        )}
        {children !== undefined && <div className="text-fg">{children}</div>}
        {actions !== undefined && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {isDismissable && (
        <AriaButton
          aria-label={messages.dismiss}
          onPress={() => {
            setOpen(false);
          }}
          className={cn(
            'hit-area -m-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-muted',
            'data-focus-visible:focus-ring data-hovered:bg-surface-3 data-hovered:text-fg',
          )}
        >
          <X aria-hidden="true" className="size-4" />
        </AriaButton>
      )}
    </div>
  );
}
