import { Check, Copy } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useCopyToClipboard } from '../CopyField/useCopyToClipboard';
import { InfoTip } from '../InfoTip/InfoTip';

export interface DescriptionItem {
  id: string;
  label: ReactNode;
  /** The value. Missing values (undefined, null or '') show an em dash, read as "Not set". */
  value?: ReactNode;
  /** An explanation of the label, in an InfoTip. */
  infoTip?: ReactNode;
  /** Text to copy: shows a copy-to-clipboard button for the value. */
  copyValue?: string;
  /** Hidden behind "Show more" until expanded. */
  isSecondary?: boolean;
}

const columnClasses = {
  1: '',
  2: '@md:grid-cols-2',
  3: '@md:grid-cols-2 @3xl:grid-cols-3',
} as const;

export interface DescriptionListProps {
  items: readonly DescriptionItem[];
  /** Columns of rows in wide containers. Defaults to 2. Narrow containers (phones) always use one. */
  columns?: 1 | 2 | 3;
  className?: string;
}

function isMissing(value: ReactNode): boolean {
  return value === undefined || value === null || value === '';
}

// A compact copy button for a row's value; the copy logic is CopyButton's.
function RowCopyButton({ text }: { text: string }) {
  const messages = useCommonMessages();
  const { status, copy } = useCopyToClipboard();
  const isCopied = status === 'copied';
  return (
    <AriaButton
      aria-label={isCopied ? messages.copied : messages.copy}
      onPress={() => {
        void copy(text);
      }}
      className={cn(
        'hit-area inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-muted',
        'data-focus-visible:focus-ring data-hovered:bg-surface-3 data-hovered:text-fg',
      )}
    >
      {isCopied ? (
        <Check aria-hidden="true" className="size-3.5 text-success-fg" />
      ) : (
        <Copy aria-hidden="true" className="size-3.5" />
      )}
    </AriaButton>
  );
}

function Row({ item }: { item: DescriptionItem }) {
  const messages = useCommonMessages();
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-xs font-medium text-fg-muted">
        {item.label}
        {item.infoTip !== undefined && <InfoTip>{item.infoTip}</InfoTip>}
      </dt>
      <dd className="flex min-w-0 items-center gap-1 text-sm text-fg">
        {isMissing(item.value) ? (
          <>
            <span aria-hidden="true" className="text-fg-muted">
              —
            </span>
            <span className="sr-only">{messages.notSet}</span>
          </>
        ) : (
          <span className="min-w-0 wrap-anywhere">{item.value}</span>
        )}
        {item.copyValue !== undefined && !isMissing(item.value) && (
          <RowCopyButton text={item.copyValue} />
        )}
      </dd>
    </div>
  );
}

/**
 * Label/value rows, such as a record's details. Rows flow into columns that adapt to the container: one on phones,
 * more on wider screens. Secondary rows hide behind "Show more".
 */
export function DescriptionList({ items, columns = 2, className }: DescriptionListProps) {
  const messages = useCommonMessages();
  const secondaryId = useId();
  const [isExpanded, setExpanded] = useState(false);
  const primary = items.filter((item) => !item.isSecondary);
  const secondary = items.filter((item) => item.isSecondary);
  const grid = cn('grid grid-cols-1 gap-x-6 gap-y-4', columnClasses[columns]);

  return (
    <div className={cn('@container flex min-w-0 flex-col gap-4', className)}>
      <dl className={grid}>
        {primary.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </dl>
      {secondary.length > 0 && (
        <>
          {isExpanded && (
            <dl id={secondaryId} className={grid}>
              {secondary.map((item) => (
                <Row key={item.id} item={item} />
              ))}
            </dl>
          )}
          <AriaButton
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? secondaryId : undefined}
            onPress={() => {
              setExpanded((expanded) => !expanded);
            }}
            className={cn(
              'hit-area self-start rounded-control text-sm font-medium text-accent-fg underline-offset-2',
              'cursor-pointer data-focus-visible:focus-ring data-hovered:underline',
            )}
          >
            {isExpanded ? messages.showLess : messages.showMore}
          </AriaButton>
        </>
      )}
    </div>
  );
}
