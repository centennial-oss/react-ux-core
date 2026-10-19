// The markup shared by the row editors (ScheduleEditor, TierEditor, KeyValueEditor): the labelled group around the
// editor, the column headings of the table layout, each row's card, its issues, and the add and remove buttons.
// `useRowLayout` decides between the table and the cards; these take its `isWide`.

import { Plus, Trash2 } from 'lucide-react';
import { useId, type FocusEventHandler, type ReactNode, type Ref } from 'react';
import { cn } from '../../utils/cn';
import { Button, type ButtonAsButtonProps } from '../Button/Button';
import { ariaLabelProps, PlainFieldDescription } from '../Field/PlainField';
import { IconButton, type IconButtonActionProps } from '../IconButton/IconButton';

/** The editor's group: its label, description and content. */
export function RowShell({
  label,
  'aria-label': ariaLabel,
  description,
  descriptionId,
  'aria-describedby': describedBy,
  className,
  ref,
  children,
}: {
  label?: ReactNode;
  'aria-label'?: string;
  description?: ReactNode;
  /** Gives the description this id, for `aria-describedby`. */
  descriptionId?: string;
  'aria-describedby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <div
      ref={ref}
      role="group"
      {...ariaLabelProps(label, labelId, ariaLabel)}
      aria-describedby={describedBy}
      className={cn('flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium">
          {label}
        </span>
      )}
      {description !== undefined && (
        <PlainFieldDescription id={descriptionId} className="-mt-2">
          {description}
        </PlainFieldDescription>
      )}
      {children}
    </div>
  );
}

/** The table layout's column headings (hidden from screen readers, which hear each field's own name). */
export function RowHeadings({
  columns,
  headings,
}: {
  columns: string;
  headings: readonly string[];
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('grid gap-3 px-1 text-xs font-medium text-fg-muted', columns)}
    >
      {headings.map((heading, index) => (
        <span key={index}>{heading}</span>
      ))}
    </div>
  );
}

/** Issues as a list of errors. */
export function RowIssues({
  id,
  issues,
  className,
}: {
  id: string;
  issues: readonly ReactNode[];
  className?: string;
}) {
  return (
    <ul id={id} className={cn('flex flex-col text-xs font-medium text-danger-fg', className)}>
      {issues.map((issue, index) => (
        <li key={index}>{issue}</li>
      ))}
    </ul>
  );
}

/**
 * One row, named by `aria-label`: a table row in `columns` when wide, otherwise a bordered card in `cardColumns`,
 * with the row's issues last (and a danger border on the card while it has any).
 */
export function RowCard({
  isWide,
  columns,
  cardColumns,
  'aria-label': ariaLabel,
  issueId,
  issues,
  onBlur,
  children,
}: {
  isWide: boolean;
  columns: string;
  cardColumns: string;
  'aria-label': string;
  issueId: string;
  issues: readonly ReactNode[];
  onBlur?: FocusEventHandler<HTMLDivElement>;
  children: ReactNode;
}) {
  const hasIssues = issues.length > 0;
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-describedby={hasIssues ? issueId : undefined}
      onBlur={onBlur}
      className={cn(
        'grid',
        isWide
          ? [columns, 'items-start gap-3 p-1']
          : [cardColumns, 'gap-2 rounded-card border border-border p-3'],
        !isWide && hasIssues && 'border-danger-border',
      )}
    >
      {children}
      {hasIssues && <RowIssues id={issueId} issues={issues} className="col-span-full" />}
    </div>
  );
}

/** The editor's "Add" button. */
export function AddRowButton(
  props: Pick<ButtonAsButtonProps, 'onPress' | 'isDisabled' | 'className' | 'children'> &
    Record<`data-${string}`, string>,
) {
  return <Button {...props} variant="outline" size="sm" icon={Plus} />;
}

/** A row's remove button: in its own column when wide, at the end of the card otherwise. */
export function RemoveRowButton({
  isWide,
  ...props
}: Pick<IconButtonActionProps, 'onPress' | 'isDisabled'> & {
  isWide: boolean;
  'aria-label': string;
}) {
  return (
    <IconButton
      {...props}
      icon={Trash2}
      className={isWide ? 'mt-0.5' : 'col-span-2 justify-self-end'}
    />
  );
}
