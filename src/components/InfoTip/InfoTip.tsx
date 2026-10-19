import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCommonMessages } from '../../provider/context';
import { IconButton } from '../IconButton/IconButton';
import { Popover, PopoverTrigger } from '../Popover/Popover';

export interface InfoTipProps {
  /** The explanation. */
  children: ReactNode;
  /** An optional heading for the explanation, for example the term being explained. */
  title?: ReactNode;
  /** Label for the (i) button and the popover. Defaults to the `moreInformation` message. */
  'aria-label'?: string;
}

/**
 * An (i) button that opens a small popover explaining a term, by tap, click or keyboard. Unlike a tooltip it works
 * the same with touch, and it can hold more than a word or two. On phones it opens as a bottom sheet.
 */
export function InfoTip({ children, title, 'aria-label': ariaLabel }: InfoTipProps) {
  const messages = useCommonMessages();
  const label = ariaLabel ?? messages.moreInformation;
  return (
    <PopoverTrigger>
      <IconButton
        icon={Info}
        aria-label={label}
        size="sm"
        className="size-6 align-middle text-fg-muted"
      />
      <Popover aria-label={label} hasArrow placement="top">
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          {title !== undefined && <p className="font-semibold">{title}</p>}
          <div className="text-fg">{children}</div>
        </div>
      </Popover>
    </PopoverTrigger>
  );
}
