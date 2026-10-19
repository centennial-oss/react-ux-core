// A task's details, shown in a popover from its bar or row: its dates, length and progress, what it depends on and
// what depends on it (with remove buttons when editable), broken dependencies, the critical path, and a menu that
// starts linking it to another task.
import { Link2, Lock, TriangleAlert, X } from 'lucide-react';
import { useId } from 'react';
import type { CoreMessages } from '../../provider/messages';
import { IconButton } from '../IconButton/IconButton';
import { MenuItem } from '../Menu/Menu';
import { MenuButton } from '../Menu/MenuButtons';
import type { GanttFormat } from './format';
import { isDated, type PlacedDependency, type TaskNode } from './schedule';
import type { GanttDependencyType } from './types';

const TYPES: readonly GanttDependencyType[] = [
  'finish-to-start',
  'start-to-start',
  'finish-to-finish',
  'start-to-finish',
];

type DetailsMessages = Pick<
  CoreMessages,
  | 'ganttKind'
  | 'ganttDone'
  | 'ganttNoDates'
  | 'ganttDependencyType'
  | 'ganttViolation'
  | 'ganttPredecessors'
  | 'ganttSuccessors'
  | 'ganttRemoveDependency'
  | 'ganttAddDependency'
  | 'ganttLocked'
  | 'ganttCritical'
>;

export interface GanttDetailsProps {
  node: TaskNode;
  predecessors: readonly PlacedDependency[];
  successors: readonly PlacedDependency[];
  isCritical: boolean;
  format: GanttFormat;
  messages: DetailsMessages;
  /** Removes a dependency; without it, the lists have no remove buttons. */
  onDelete?: (link: PlacedDependency) => void;
  /** Starts linking the task to another; without it, there's no link menu. */
  onLink?: (type: GanttDependencyType) => void;
}

function LinkList({
  title,
  links,
  side,
  messages,
  onDelete,
}: {
  title: string;
  links: readonly PlacedDependency[];
  /** Which end of each link is the other task. */
  side: 'from' | 'to';
  messages: DetailsMessages;
  onDelete?: (link: PlacedDependency) => void;
}) {
  const titleId = useId();
  if (links.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1">
      <p id={titleId} className="m-0 text-xs font-semibold text-fg-muted">
        {title}
      </p>
      <ul aria-labelledby={titleId} className="m-0 flex list-none flex-col gap-1 p-0">
        {links.map((link) => (
          <li key={link.id} className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-fg">{link[side].task.label}</span>
              <span className="text-xs text-fg-muted">
                {messages.ganttDependencyType({ type: link.type })}
              </span>
            </span>
            {onDelete && (
              <IconButton
                icon={X}
                size="sm"
                variant="ghost"
                aria-label={messages.ganttRemoveDependency({
                  from: link.from.task.label,
                  to: link.to.task.label,
                })}
                onPress={() => {
                  onDelete(link);
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GanttDetails({
  node,
  predecessors,
  successors,
  isCritical,
  format,
  messages,
  onDelete,
  onLink,
}: GanttDetailsProps) {
  const hasDates = isDated(node);
  const broken = predecessors.filter((link) => link.isViolated);
  return (
    <div className="flex w-72 max-w-full flex-col gap-3 p-1 text-sm">
      <div>
        <p className="m-0 font-semibold text-fg">{node.task.label}</p>
        <p className="m-0 text-xs text-fg-muted">{messages.ganttKind({ kind: node.kind })}</p>
      </div>
      <div className="flex flex-col gap-0.5 text-fg-muted tabular-nums">
        <p className="m-0">
          {hasDates ? format.span(node.start, node.end) : messages.ganttNoDates}
        </p>
        {hasDates && node.kind !== 'milestone' && (
          <p className="m-0">{format.duration(node.start, node.end)}</p>
        )}
        {node.kind !== 'milestone' && (
          <p className="m-0">{messages.ganttDone({ percent: format.percent(node.progress) })}</p>
        )}
      </div>
      {broken.map((link) => (
        <p key={link.id} className="m-0 flex items-center gap-1 text-warning-fg">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          {messages.ganttViolation({ task: link.from.task.label, type: link.type })}
        </p>
      ))}
      {isCritical && <p className="m-0 font-medium text-danger-fg">{messages.ganttCritical}</p>}
      {node.isLocked && (
        <p className="m-0 flex items-center gap-1 text-fg-muted">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {messages.ganttLocked}
        </p>
      )}
      <LinkList
        title={messages.ganttPredecessors}
        links={predecessors}
        side="from"
        messages={messages}
        onDelete={onDelete}
      />
      <LinkList
        title={messages.ganttSuccessors}
        links={successors}
        side="to"
        messages={messages}
        onDelete={onDelete}
      />
      {node.task.detail !== undefined && <div className="text-fg">{node.task.detail}</div>}
      {onLink && (
        <MenuButton
          label={messages.ganttAddDependency}
          icon={Link2}
          size="sm"
          variant="outline"
          onAction={(key) => {
            const type = TYPES.find((candidate) => candidate === key);
            if (type) {
              onLink(type);
            }
          }}
          className="self-start"
        >
          {TYPES.map((type) => (
            <MenuItem key={type} id={type}>
              {messages.ganttDependencyType({ type })}
            </MenuItem>
          ))}
        </MenuButton>
      )}
    </div>
  );
}
