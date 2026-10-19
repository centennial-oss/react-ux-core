// The details popover of an item in ScheduleTimeline or EventCalendar: its label, where and when it is, a warning (such
// as its conflicts), whether it's locked, and the app's detail.
import { Lock, TriangleAlert } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { Popover } from '../Popover/Popover';
import type { ScheduleTimelineMessages } from './messages';

export interface ItemDetailsProps {
  /** The item's element, which the popover points at. */
  triggerRef: RefObject<Element | null>;
  label: string;
  /** A line under the label, such as the item's lane. */
  subtitle?: ReactNode;
  /** The item's times as text. */
  time: string;
  /** A warning line, such as the items it conflicts with. */
  warning?: string;
  isLocked?: boolean;
  /** The app's `detail` for the item. */
  detail?: ReactNode;
  onClose: () => void;
  messages: Pick<ScheduleTimelineMessages, 'scheduleLocked'>;
}

export function ItemDetails({
  triggerRef,
  label,
  subtitle,
  time,
  warning,
  isLocked,
  detail,
  onClose,
  messages,
}: ItemDetailsProps) {
  return (
    <Popover
      triggerRef={triggerRef}
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      aria-label={label}
      placement="bottom start"
    >
      <div className="flex max-w-xs flex-col gap-1 p-1 text-sm">
        <p className="m-0 font-semibold text-fg">{label}</p>
        {subtitle !== undefined && <p className="m-0 text-fg-muted">{subtitle}</p>}
        <p className="m-0 text-fg-muted tabular-nums">{time}</p>
        {warning !== undefined && (
          <p className="m-0 flex items-center gap-1 text-warning-fg">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            {warning}
          </p>
        )}
        {isLocked === true && (
          <p className="m-0 flex items-center gap-1 text-fg-muted">
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            {messages.scheduleLocked}
          </p>
        )}
        {detail !== undefined && <div className="text-fg">{detail}</div>}
      </div>
    </Popover>
  );
}
