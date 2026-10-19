import type { Meta, StoryObj } from '@storybook/react-vite';
import { Archive, CalendarDays, Pencil } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  assigneeLanes,
  boardColumns,
  boardTasks,
  priorityLanes,
  type Priority,
  type Task,
} from '../../../test/kanban';
import { enableVirtualizer } from '../../../test/virtualizer';
import { dateTimeFormat } from '../../utils/intl';
import type { Tone } from '../../utils/types';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { MenuItem } from '../Menu';
import { ToggleButton, ToggleButtonGroup } from '../ToggleButton';
import { KanbanBoard, type KanbanBoardProps } from './KanbanBoard';
import { moveKanbanItems, type KanbanItem } from './kanbanItems';

type Card = KanbanItem<Task>;

const priorityTones: Record<Priority, Tone> = { High: 'danger', Medium: 'warning', Low: 'neutral' };
// Dates are days, so they're shown in UTC: the same day in every time zone.
const dueFormat = dateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** A task card: its title, priority and tags, due date and assignee. */
function TaskCard({ item }: { item: Card }) {
  const task = item.data;
  return (
    <span className="flex min-w-0 flex-col gap-2">
      <span className="font-medium break-words text-fg">{item.label}</span>
      {task && (
        <>
          <span className="flex flex-wrap items-center gap-1">
            <Badge tone={priorityTones[task.priority]}>{task.priority}</Badge>
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </span>
          <span className="flex items-center justify-between gap-2 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              <time dateTime={task.due}>{dueFormat.format(new Date(task.due))}</time>
            </span>
            <Avatar name={task.assignee.name} src={task.assignee.src} size="xs" />
          </span>
        </>
      )}
    </span>
  );
}

// Module level, so the board's cards don't draw again on every render.
const renderTask = (item: Card) => <TaskCard item={item} />;
const taskActions = () => (
  <>
    <MenuItem id="edit" icon={Pencil}>
      Edit
    </MenuItem>
    <MenuItem id="archive" icon={Archive}>
      Archive
    </MenuItem>
  </>
);

const tasks = boardTasks(12);

/** A board that applies its own moves, as an app would. */
function MovableBoard({
  initial = tasks,
  ...props
}: Omit<KanbanBoardProps<Card>, 'items' | 'columns'> & {
  initial?: Card[];
  columns?: KanbanBoardProps<Card>['columns'];
}) {
  const [items, setItems] = useState(initial);
  const onMove = useCallback<NonNullable<KanbanBoardProps<Card>['onMove']>>((move) => {
    setItems((current) => moveKanbanItems(current, move));
  }, []);
  return (
    <KanbanBoard<Card>
      columns={boardColumns}
      items={items}
      onMove={onMove}
      renderItem={renderTask}
      rowActions={taskActions}
      {...props}
    />
  );
}

const meta = {
  title: 'Display/KanbanBoard',
  component: KanbanBoard,
  args: { 'aria-label': 'Tasks', columns: boardColumns, items: tasks },
  // Lets React Aria's virtualizer run under the story test runner (see test/virtualizer.ts).
  beforeEach: enableVirtualizer,
} satisfies Meta<typeof KanbanBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Columns of task cards. Drag a card within or between columns (or press its handle, then the arrow keys and Tab, then
 * Enter), or move it from its actions menu. "In progress" and "Review" show their work-in-progress limits; Review is
 * at its limit.
 */
export const Basic: Story = {
  render: () => <MovableBoard aria-label="Tasks" />,
};

/** Without `renderItem`, a card shows the item's avatar, label, description and meta, as a ListView row does. */
export const PlainCards: Story = {
  render: () => (
    <MovableBoard
      aria-label="Tasks"
      renderItem={undefined}
      rowActions={undefined}
      initial={tasks.map((task) => ({
        ...task,
        description: task.data?.tags.length ? task.data.tags.join(', ') : undefined,
        avatar: task.data && { name: task.data.assignee.name, src: task.data.assignee.src },
        meta: task.data && (
          <Badge tone={priorityTones[task.data.priority]}>{task.data.priority}</Badge>
        ),
      }))}
    />
  ),
};

type Grouping = 'priority' | 'assignee';

/** A task's lane: its priority or its assignee. */
function laneOf(task: Card, grouping: Grouping) {
  const lanes = grouping === 'assignee' ? assigneeLanes : priorityLanes;
  const title = grouping === 'assignee' ? task.data?.assignee.name : task.data?.priority;
  return lanes.find((lane) => lane.title === title)?.id;
}

/** A task moved into a lane takes the lane's priority, or its assignee. */
function intoLane(task: Card, grouping: Grouping, laneId: string): Card {
  const lane = (grouping === 'assignee' ? assigneeLanes : priorityLanes).find(
    (each) => each.id === laneId,
  );
  if (!task.data || !lane) {
    return task;
  }
  const data =
    grouping === 'assignee'
      ? { ...task.data, assignee: { name: lane.title } }
      : { ...task.data, priority: lane.title as Priority };
  return { ...task, data };
}

/** Lanes split the board into rows, here by priority or by assignee. Moving a card to another lane changes it. */
export const Swimlanes: Story = {
  render: function SwimlanesStory() {
    const [grouping, setGrouping] = useState<Grouping>('priority');
    const [items, setItems] = useState(tasks);
    const shown = useMemo(
      () => items.map((task) => ({ ...task, laneId: laneOf(task, grouping) })),
      [items, grouping],
    );
    return (
      <div className="flex flex-col gap-3">
        <ToggleButtonGroup
          aria-label="Lanes"
          disallowEmptySelection
          selectedKeys={[grouping]}
          onSelectionChange={(keys) => {
            setGrouping(keys.has('assignee') ? 'assignee' : 'priority');
          }}
          size="sm"
        >
          <ToggleButton id="priority">By priority</ToggleButton>
          <ToggleButton id="assignee">By assignee</ToggleButton>
        </ToggleButtonGroup>
        <KanbanBoard<Card>
          aria-label="Tasks"
          columns={boardColumns}
          lanes={grouping === 'assignee' ? assigneeLanes : priorityLanes}
          items={shown}
          renderItem={renderTask}
          onMove={({ laneId, ...move }) => {
            const moving = new Set(move.ids);
            setItems((current) =>
              moveKanbanItems(current, move).map((task) =>
                laneId !== undefined && moving.has(task.id)
                  ? intoLane(task, grouping, laneId)
                  : task,
              ),
            );
          }}
          maxHeight="20rem"
        />
      </div>
    );
  },
};

/** Cards chosen with their checkboxes move together from the ActionBar, which also holds the app's own actions. */
export const Selection: Story = {
  render: function SelectionStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set(['task-1', 'task-4']));
    return (
      <MovableBoard
        aria-label="Tasks"
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={setSelected}
        bulkActions={(keys) => (
          <Button
            variant="ghost"
            icon={Archive}
            onPress={() => {
              setSelected(new Set([...selected].filter((id) => !keys.has(id))));
            }}
          >
            Archive
          </Button>
        )}
      />
    );
  },
};

/** Collapsed columns show as a strip with their count; "Done" starts collapsed here. */
export const CollapsedColumns: Story = {
  render: () => (
    <MovableBoard aria-label="Tasks" defaultExpandedIds={['todo', 'doing', 'review']} />
  ),
};

/** An add button under each column; the app adds the card (here a new one at the end). */
export const AddingCards: Story = {
  tags: ['!visual'],
  render: function AddingCardsStory() {
    const [items, setItems] = useState(tasks);
    return (
      <KanbanBoard<Card>
        aria-label="Tasks"
        columns={boardColumns}
        items={items}
        renderItem={renderTask}
        onMove={(move) => {
          setItems((current) => moveKanbanItems(current, move));
        }}
        onAdd={({ columnId }) => {
          setItems((current) => [
            ...current,
            {
              id: `new-${String(current.length + 1)}`,
              label: `New task ${String(current.length + 1)}`,
              columnId,
            },
          ]);
        }}
      />
    );
  },
};

/** Compact cards suit dense boards. */
export const Compact: Story = {
  render: () => <MovableBoard aria-label="Tasks" density="compact" />,
};

/** Columns show placeholders while the cards load. */
export const Loading: Story = {
  args: { items: [], isLoading: true },
};

/**
 * 6,000 cards. Each column renders only the cards in view, and a move draws again only the columns it changes, so the
 * board stays quick.
 */
export const ThousandsOfCards: Story = {
  render: () => (
    <MovableBoard aria-label="Tasks" initial={boardTasks(6_000)} isVirtualized maxHeight="24rem" />
  ),
};
