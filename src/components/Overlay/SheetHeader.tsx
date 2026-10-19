import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Heading, Text } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { IconButton } from '../IconButton/IconButton';

/** A sheet's content: a node, or a function that receives `close`. */
export type SheetContent = ReactNode | ((close: () => void) => ReactNode);

/** Renders sheet content, calling it with `close` when it's a function. */
export function renderContent(content: SheetContent, close: () => void): ReactNode {
  return typeof content === 'function' ? content(close) : content;
}

export interface SheetHeaderProps {
  /** Labels the dialog (React Aria's title slot). */
  title: ReactNode;
  /** Supporting text under the title, given `descriptionId` so the dialog can be described by it. */
  description?: ReactNode;
  descriptionId: string;
  /** Shows a close (×) button that calls this. */
  onClose?: () => void;
  isCloseDisabled?: boolean;
  /** Top padding classes. Defaults to `pt-4`. */
  className?: string;
}

/** The title, description and close button at the top of a Dialog or Drawer. */
export function SheetHeader({
  title,
  description,
  descriptionId,
  onClose,
  isCloseDisabled,
  className = 'pt-4',
}: SheetHeaderProps) {
  const messages = useCommonMessages();
  return (
    <header className={cn('flex shrink-0 items-start gap-3 px-4 pb-2', className)}>
      <div className="min-w-0 flex-1">
        <Heading slot="title" className="text-lg font-semibold">
          {title}
        </Heading>
        {description !== undefined && (
          <Text id={descriptionId} className="mt-1 block text-sm text-fg-muted">
            {description}
          </Text>
        )}
      </div>
      {onClose && (
        <IconButton
          icon={X}
          aria-label={messages.close}
          size="sm"
          isDisabled={isCloseDisabled}
          onPress={onClose}
          className="-me-1 -mt-1"
        />
      )}
    </header>
  );
}
