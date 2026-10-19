import { render, screen, within } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  assigneeLanes,
  boardColumns,
  boardTasks,
  byAssignee,
  priorityLanes,
  type Task,
} from '../../../test/kanban';
import { enableVirtualizer } from '../../../test/virtualizer';
import { UIProvider } from '../../provider/UIProvider';
import { itemText } from '../../utils/text';
import { Button } from '../Button/Button';
import { MenuItem } from '../Menu/Menu';
import { KanbanBoard, type KanbanBoardProps } from './KanbanBoard';
import { moveKanbanItems, type KanbanItem, type KanbanMove } from './kanbanItems';

enableVirtualizer();

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = window.innerWidth >= 1024;

type Card = KanbanItem<Task>;
// To do: task-1, task-2, task-6. In progress: task-3. Review: task-4. Done: task-5, task-7.
const tasks = boardTasks(7);

function Board({
  initial = tasks,
  onMove,
  ...props
}: Partial<KanbanBoardProps<Card>> & { initial?: Card[] }) {
  const [items, setItems] = useState(initial);
  return (
    <>
      <KanbanBoard<Card>
        aria-label="Tasks"
        columns={boardColumns}
        items={items}
        onMove={(move) => {
          onMove?.(move);
          setItems((current) => moveKanbanItems(current, move));
        }}
        {...props}
      />
      <output data-testid="order">
        {boardColumns
          .map(
            (column) =>
              `${column.id}:${items
                .filter((item) => item.columnId === column.id)
                .map((item) => item.id.replace('task-', ''))
                .join(',')}`,
          )
          .join(' ')}
      </output>
    </>
  );
}

function order() {
  return screen.getByTestId('order').textContent;
}

function list(name: string) {
  return screen.getByRole('grid', { name });
}

function cardsIn(name: string) {
  return within(list(name))
    .queryAllByRole('row')
    .filter((row) => row.hasAttribute('data-key'))
    .map((row) => row.getAttribute('data-key'));
}

function card(label: string) {
  const found = screen
    .getAllByRole('row')
    .find((row) => row.hasAttribute('data-key') && row.textContent.includes(label));
  if (!found) {
    throw new Error(`No card for ${label}`);
  }
  return found;
}

/** The status region the board announces moves in. */
function announcements() {
  return [...document.querySelectorAll('[aria-live="polite"]')]
    .map((region) => region.textContent)
    .join(' ');
}

describe('KanbanBoard columns', () => {
  it('shows each column’s heading, count and cards in the items’ order', () => {
    render(<Board />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'To do',
      'In progress',
      'Review',
      'Done',
    ]);
    expect(cardsIn('To do')).toEqual(['task-1', 'task-2', 'task-6']);
    expect(cardsIn('In progress')).toEqual(['task-3']);
    expect(cardsIn('Done')).toEqual(['task-5', 'task-7']);
    const todo = screen.getByRole('group', { name: 'To do' });
    expect(within(todo).getByText('3 cards')).toBeInTheDocument();
    // Without renderItem a card shows the item's label.
    expect(card('Calibrate the spectrograph')).toBeInTheDocument();
  });

  it('shows the count against a work-in-progress limit, warning at it and past it', () => {
    const { rerender } = render(
      <KanbanBoard aria-label="Tasks" columns={boardColumns} items={tasks} />,
    );
    const review = screen.getByRole('group', { name: 'Review' });
    expect(within(review).getByText('1 / 2')).toHaveAttribute('aria-hidden', 'true');
    expect(within(review).getByText('1 of 2 cards')).toBeInTheDocument();
    const more = moveKanbanItems(tasks, { ids: ['task-1', 'task-2'], columnId: 'review' });
    rerender(<KanbanBoard aria-label="Tasks" columns={boardColumns} items={more} />);
    const over = within(screen.getByRole('group', { name: 'Review' })).getByText(
      '3 cards, over the limit of 2',
    );
    expect(over.closest('[class*="danger"]')).not.toBeNull();
    const atLimit = moveKanbanItems(tasks, { ids: ['task-1'], columnId: 'review' });
    rerender(<KanbanBoard aria-label="Tasks" columns={boardColumns} items={atLimit} />);
    expect(
      within(screen.getByRole('group', { name: 'Review' }))
        .getByText('2 of 2 cards')
        .closest('[class*="warning"]'),
    ).not.toBeNull();
  });

  it('shows an empty state in empty columns, and the app’s own', () => {
    const { rerender } = render(
      <KanbanBoard aria-label="Tasks" columns={boardColumns} items={[]} />,
    );
    expect(screen.getAllByText('No cards')).toHaveLength(4);
    rerender(
      <KanbanBoard aria-label="Tasks" columns={boardColumns} items={[]} emptyState="Nothing" />,
    );
    expect(screen.getAllByText('Nothing')).toHaveLength(4);
  });

  it('draws cards with renderItem, with the app’s card actions', async () => {
    const onRowAction = vi.fn();
    render(
      <Board
        renderItem={(item) => (
          <span>
            <strong>{itemText(item)}</strong> due {item.data?.due}
          </span>
        )}
        rowActions={(item) => <MenuItem id="open">Open {itemText(item)}</MenuItem>}
        onRowAction={onRowAction}
      />,
    );
    expect(card('Calibrate the spectrograph').textContent).toContain('due 2026-11-01');
    await userEvent.click(
      screen.getByRole('button', { name: 'Actions for Calibrate the spectrograph' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Open Calibrate the spectrograph' }),
    );
    expect(onRowAction).toHaveBeenCalledWith('open', expect.objectContaining({ id: 'task-1' }));
  });

  it('activates a card with onAction', async () => {
    const onAction = vi.fn();
    render(<Board onAction={onAction} />);
    await userEvent.click(card('Fix the dome shutter alarm'));
    expect(onAction).toHaveBeenCalledWith('task-4');
  });

  it('uses the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          kanbanCount: ({ count }) => `${String(count)} Karten`,
          kanbanEmpty: 'Keine Karten',
          kanbanCollapse: ({ column }) => `${column} einklappen`,
          kanbanAddCard: 'Karte hinzufügen',
        }}
      >
        <KanbanBoard
          aria-label="Aufgaben"
          columns={[{ id: 'todo', title: 'Offen' }]}
          items={[]}
          onAdd={() => undefined}
        />
      </UIProvider>,
    );
    expect(screen.getByText('0 Karten')).toBeInTheDocument();
    expect(screen.getByText('Keine Karten')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Offen einklappen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Karte hinzufügen' })).toBeInTheDocument();
  });

  it('has no accessibility violations, with lanes and selection', async () => {
    const { container } = render(
      <Board
        lanes={priorityLanes}
        selectionMode="multiple"
        rowActions={() => <MenuItem id="open">Open</MenuItem>}
        onAdd={() => undefined}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('scrolls its columns sideways, never the page, at phone width', () => {
    render(
      <div className="w-[360px] max-w-full">
        <Board lanes={priorityLanes} selectionMode="multiple" onAdd={() => undefined} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    const columns = screen.getByRole('group', { name: 'Tasks' }).firstElementChild;
    expect(columns && columns.scrollWidth > columns.clientWidth).toBe(true);
  });

  it('adds a card to a column, and to a column in a lane', async () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <KanbanBoard aria-label="Tasks" columns={boardColumns} items={tasks} onAdd={onAdd} />,
    );
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Review' })).getByRole('button', {
        name: 'Add card',
      }),
    );
    expect(onAdd).toHaveBeenLastCalledWith({ columnId: 'review' });
    rerender(
      <KanbanBoard
        aria-label="Tasks"
        columns={boardColumns}
        items={tasks}
        lanes={priorityLanes}
        onAdd={onAdd}
        addLabel="New task"
      />,
    );
    const low = screen.getByRole('group', { name: 'Low' });
    await userEvent.click(within(low).getAllByRole('button', { name: 'New task' })[1] as Element);
    expect(onAdd).toHaveBeenLastCalledWith({ columnId: 'doing', laneId: 'low' });
  });

  it('stops rendering once the board is shown', async () => {
    let commits = 0;
    render(
      <Profiler
        id="board"
        onRender={() => {
          commits += 1;
        }}
      >
        <Board lanes={priorityLanes} selectionMode="multiple" isVirtualized />
      </Profiler>,
    );
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return commits - before;
    };
    await expect.poll(settled, { timeout: 10_000 }).toBe(0);
  });
});

describe('KanbanBoard moves', () => {
  it('moves a card from its menu, announces it and keeps focus on the card', async () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Actions for Calibrate the spectrograph' }),
    );
    const menu = await screen.findByRole('menu');
    // Its own column isn't offered.
    expect(within(menu).queryByRole('menuitem', { name: 'To do' })).toBeNull();
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Review' }));
    expect(onMove).toHaveBeenCalledWith<[KanbanMove]>({
      ids: ['task-1'],
      columnId: 'review',
    });
    expect(order()).toBe('todo:2,6 doing:3 review:4,1 done:5,7');
    expect(announcements()).toContain('Calibrate the spectrograph moved to Review');
    await expect
      .poll(() => document.activeElement?.closest('[role="grid"]')?.getAttribute('aria-labelledby'))
      .toBe(screen.getByText('Review', { selector: 'span' }).id);
    expect(document.activeElement?.closest('[role="row"]')?.getAttribute('data-key')).toBe(
      'task-1',
    );
  });

  it.runIf(isDesktop)('reorders a column by keyboard drag and drop', async () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} />);
    screen.getByRole('button', { name: 'Drag Calibrate the spectrograph' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect.poll(order).toBe('todo:2,1,6 doing:3 review:4 done:5,7');
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['task-1'], columnId: 'todo' }),
    );
  });

  it.runIf(isDesktop)('moves a card to another column by keyboard drag and drop', async () => {
    render(<Board />);
    screen.getByRole('button', { name: 'Drag Calibrate the spectrograph' }).focus();
    await userEvent.keyboard('{Enter}');
    // Tab goes on to the next column's drop targets.
    await userEvent.keyboard('{Tab}');
    expect(list('In progress').contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Enter}');
    await expect.poll(order).toContain('doing:');
    expect(order()).not.toContain('todo:1');
    expect(cardsIn('In progress')).toContain('task-1');
    await expect.poll(announcements).toContain('Calibrate the spectrograph moved to In progress');
  });

  it.runIf(isDesktop)('moves a card to another column by dragging it with the mouse', async () => {
    render(<Board />);
    await userEvent.dragAndDrop(card('Calibrate the spectrograph'), list('Done'));
    await expect.poll(() => cardsIn('Done')).toContain('task-1');
    expect(cardsIn('To do')).toEqual(['task-2', 'task-6']);
  });

  it('applies moves to a flat list with moveKanbanItems', () => {
    const ids = (items: readonly Card[]) => items.map((item) => item.id);
    // Next to a card in another column.
    const next = moveKanbanItems(tasks, {
      ids: ['task-6', 'task-1'],
      columnId: 'done',
      targetId: 'task-5',
      position: 'before',
    });
    expect(ids(next)).toEqual([
      'task-2',
      'task-3',
      'task-4',
      'task-1',
      'task-6',
      'task-5',
      'task-7',
    ]);
    expect(next.find((item) => item.id === 'task-1')?.columnId).toBe('done');
    // Unchanged cards keep their identity; the moved ones are copies.
    expect(next[0]).toBe(tasks[1]);
    expect(tasks[0]?.columnId).toBe('todo');
    // To the end of a column, and into a lane.
    const end = moveKanbanItems(tasks, { ids: ['task-3'], columnId: 'todo', laneId: 'low' });
    expect(ids(end).at(-1)).toBe('task-3');
    expect(end.at(-1)).toMatchObject({ columnId: 'todo', laneId: 'low' });
  });

  it('can’t move cards without onMove or when disabled', () => {
    const { rerender } = render(
      <KanbanBoard aria-label="Tasks" columns={boardColumns} items={tasks} />,
    );
    expect(screen.queryByRole('button', { name: /^Drag / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Actions for / })).toBeNull();
    rerender(
      <KanbanBoard
        aria-label="Tasks"
        columns={boardColumns}
        items={tasks}
        onMove={() => undefined}
        isDisabled
      />,
    );
    expect(screen.queryByRole('button', { name: /^Drag / })).toBeNull();
  });
});

describe('KanbanBoard collapsing', () => {
  it('collapses a column to a strip and expands it again, uncontrolled', async () => {
    const onExpandedChange = vi.fn();
    render(<Board onExpandedChange={onExpandedChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Done' }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(new Set(['todo', 'doing', 'review']));
    expect(screen.queryByRole('grid', { name: 'Done' })).toBeNull();
    const expand = screen.getByRole('button', { name: 'Expand Done' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    // The strip keeps the heading and the count.
    const done = screen.getByRole('group', { name: 'Done' });
    expect(within(done).getByText('2 cards')).toBeInTheDocument();
    await userEvent.click(expand);
    expect(cardsIn('Done')).toEqual(['task-5', 'task-7']);
  });

  it('follows expandedIds, controlled, and starts from defaultExpandedIds', async () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <KanbanBoard
        aria-label="Tasks"
        columns={boardColumns}
        items={tasks}
        expandedIds={['todo', 'doing']}
        onExpandedChange={onExpandedChange}
      />,
    );
    expect(screen.queryByRole('grid', { name: 'Review' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Expand Review' }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(new Set(['todo', 'doing', 'review']));
    // Controlled: nothing changes until the app passes the new ids.
    expect(screen.queryByRole('grid', { name: 'Review' })).toBeNull();
    rerender(
      <KanbanBoard
        aria-label="Tasks"
        columns={boardColumns}
        items={tasks}
        defaultExpandedIds={['todo']}
        key="uncontrolled"
      />,
    );
    expect(screen.getByRole('grid', { name: 'To do' })).toBeInTheDocument();
    expect(screen.queryByRole('grid', { name: 'Done' })).toBeNull();
  });

  it('opens columns added later, uncontrolled', () => {
    const { rerender } = render(
      <KanbanBoard aria-label="Tasks" columns={boardColumns.slice(0, 2)} items={tasks} />,
    );
    rerender(<KanbanBoard aria-label="Tasks" columns={boardColumns} items={tasks} />);
    expect(screen.getByRole('grid', { name: 'Done' })).toBeInTheDocument();
  });
});

describe('KanbanBoard lanes', () => {
  it('splits the board into lanes, each list named by its column and lane', () => {
    render(<Board lanes={priorityLanes} />);
    const high = screen.getByRole('group', { name: 'High' });
    expect(within(high).getByText('3 cards')).toBeInTheDocument();
    // High: task-1, task-4, task-7.
    expect(cardsIn('To do, High')).toEqual(['task-1']);
    expect(cardsIn('Review, High')).toEqual(['task-4']);
    expect(cardsIn('Done, High')).toEqual(['task-7']);
    expect(cardsIn('To do, Medium')).toEqual(['task-2']);
    // The column headings count every lane.
    expect(
      within(screen.getByRole('group', { name: 'Tasks' })).getByText('3 cards', {
        selector: '[data-column="todo"] *',
      }),
    ).toBeInTheDocument();
  });

  it('moves a card to another lane from its menu', async () => {
    const onMove = vi.fn();
    render(<Board lanes={assigneeLanes} initial={byAssignee(tasks)} onMove={onMove} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Actions for Calibrate the spectrograph' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Alan Turing' }));
    expect(onMove).toHaveBeenCalledWith({
      ids: ['task-1'],
      columnId: 'todo',
      laneId: 'alan-turing',
    });
    expect(cardsIn('To do, Alan Turing')).toContain('task-1');
    expect(announcements()).toContain('Calibrate the spectrograph moved to To do, Alan Turing');
  });
});

describe('KanbanBoard selection', () => {
  function Selectable(props: Partial<KanbanBoardProps<Card>>) {
    const [keys, setKeys] = useState<Set<string>>(new Set());
    return (
      <>
        <Board
          selectionMode="multiple"
          selectedKeys={keys}
          onSelectionChange={setKeys}
          {...props}
        />
        <output data-testid="keys">{[...keys].sort().join(',')}</output>
      </>
    );
  }

  function checkbox(label: string) {
    const box = within(card(label)).getByRole('checkbox').closest('label');
    if (!box) {
      throw new Error(`No checkbox for ${label}`);
    }
    return box;
  }

  it('chooses cards across columns and moves them together from the ActionBar', async () => {
    const bulkActions = vi.fn((keys: ReadonlySet<string>) => (
      <Button size="sm" variant="ghost">
        Archive {keys.size}
      </Button>
    ));
    render(<Selectable bulkActions={bulkActions} />);
    await userEvent.click(checkbox('Calibrate the spectrograph'));
    await userEvent.click(checkbox('Fix the dome shutter alarm'));
    expect(screen.getByTestId('keys').textContent).toBe('task-1,task-4');
    const bar = await screen.findByRole('toolbar', { name: 'Actions for selected items' });
    expect(within(bar.parentElement ?? bar).getByText('2 selected')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Archive 2' })).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: 'Move to' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Done' }));
    expect(order()).toBe('todo:2,6 doing:3 review: done:5,7,1,4');
    expect(screen.getByTestId('keys').textContent).toBe('');
    await expect.poll(announcements).toContain('2 cards moved to Done');
  });

  it.runIf(hasTouch)('chooses a card with a touch tap on its checkbox', async () => {
    render(<Selectable />);
    await commands.tap('[role="row"][data-key="task-3"] label');
    expect(screen.getByTestId('keys').textContent).toBe('task-3');
  });

  it('keeps one card chosen across the board in single mode', async () => {
    render(<Selectable selectionMode="single" />);
    await userEvent.click(checkbox('Calibrate the spectrograph'));
    await userEvent.click(checkbox('Fix the dome shutter alarm'));
    expect(screen.getByTestId('keys').textContent).toBe('task-4');
  });

  it('starts from defaultSelectedKeys, uncontrolled', async () => {
    const onSelectionChange = vi.fn();
    render(
      <Board
        selectionMode="multiple"
        defaultSelectedKeys={new Set(['task-3'])}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(within(card('Archive last night’s frames')).getByRole('checkbox')).toBeChecked();
    await userEvent.click(checkbox('Calibrate the spectrograph'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['task-1', 'task-3']));
  });
});

describe('KanbanBoard with thousands of cards', () => {
  const many = boardTasks(6_000);

  it('renders only the cards in view in each column', async () => {
    render(<Board initial={many} isVirtualized maxHeight="20rem" />);
    const todo = list('To do');
    expect(Number(todo.getAttribute('aria-rowcount'))).toBeGreaterThan(2_000);
    await expect.poll(() => within(todo).queryAllByRole('row').length).toBeGreaterThan(2);
    expect(within(todo).getAllByRole('row').length).toBeLessThan(30);
    todo.scrollTop = todo.scrollHeight;
    todo.dispatchEvent(new Event('scroll'));
    // The last of the 6,000 is the last to do.
    await expect.poll(() => cardsIn('To do').includes('task-6000')).toBe(true);
  });

  it('renders again only the cards a move changes', async () => {
    const drawn: string[] = [];
    const renderItem = (item: Card) => {
      drawn.push(item.id);
      return itemText(item);
    };
    render(<Board initial={many} isVirtualized maxHeight="20rem" renderItem={renderItem} />);
    await expect.poll(() => cardsIn('Done').length).toBeGreaterThan(2);
    drawn.length = 0;
    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'Actions for Calibrate the spectrograph',
      })[0] as Element,
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'In progress' }));
    await expect.poll(() => cardsIn('To do')).not.toContain('task-1');
    // Done and Review didn't change, so none of their cards were drawn again.
    const untouched = new Set([...cardsIn('Done'), ...cardsIn('Review')]);
    expect(drawn.filter((id) => untouched.has(id))).toEqual([]);
  });
});
