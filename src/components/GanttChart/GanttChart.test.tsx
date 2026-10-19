import { render, screen, within } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { manyTasks, PROJECT_NOW, projectDependencies, projectTasks } from '../../../test/gantt';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { GanttChart, type GanttChartProps } from './GanttChart';
import type { GanttDependency, GanttTask } from './types';

const isDesktop = window.innerWidth >= 1024;
const isPhone = window.innerWidth < 640;
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const utc = (month: number, date: number) => Date.UTC(2026, month - 1, date);

function Chart({
  messages,
  ...props
}: Partial<GanttChartProps> & { messages?: Partial<Messages> }) {
  return (
    <UIProvider locale="en-GB" messages={messages}>
      <GanttChart
        tasks={projectTasks}
        dependencies={projectDependencies}
        now={PROJECT_NOW}
        timeZone="UTC"
        firstDayOfWeek={1}
        aria-label="Website relaunch"
        {...props}
      />
    </UIProvider>
  );
}

/** A chart that applies its own changes, like an app would. */
function EditableChart({
  onTaskChange,
  onDependencyCreate,
  onDependencyDelete,
  ...props
}: Partial<GanttChartProps>) {
  const [tasks, setTasks] = useState<readonly GanttTask[]>(props.tasks ?? projectTasks);
  const [dependencies, setDependencies] = useState<readonly GanttDependency[]>(
    props.dependencies ?? projectDependencies,
  );
  return (
    <Chart
      {...props}
      tasks={tasks}
      dependencies={dependencies}
      isEditable
      onTaskChange={(changed) => {
        onTaskChange?.(changed);
        setTasks((current) => current.map((task) => (task.id === changed.id ? changed : task)));
      }}
      onDependencyCreate={(draft) => {
        onDependencyCreate?.(draft);
        setDependencies((current) => [...current, { id: `${draft.from}-${draft.to}`, ...draft }]);
      }}
      onDependencyDelete={(id) => {
        onDependencyDelete?.(id);
        setDependencies((current) => current.filter((dependency) => dependency.id !== id));
      }}
    />
  );
}

const taskGrid = () => screen.getByRole('treegrid', { name: 'Tasks' });
const timeline = () => screen.getByRole('grid', { name: 'Timeline' });
const gridRow = (id: string) => {
  const element = taskGrid().querySelector<HTMLElement>(`[data-task-id="${id}"]`);
  if (!element) {
    throw new Error(`No row for ${id}`);
  }
  return element;
};
const bar = (id: string) => {
  const element = timeline().querySelector<HTMLElement>(`[data-task-id="${id}"]`);
  if (!element) {
    throw new Error(`No bar for ${id}`);
  }
  return element;
};
const focusedTaskId = () => (document.activeElement as HTMLElement | null)?.dataset.taskId;

function pointer(element: Element, type: string, clientX: number, clientY: number) {
  element.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 7,
      pointerType: 'mouse',
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Drags from `from` (an element, or a part of one) to a point, through the bar that owns it. */
function drag(from: Element, toX: number, toY: number) {
  const owner = from.closest('[data-task-id]') ?? from;
  const rect = from.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  pointer(from, 'pointerdown', x, y);
  pointer(owner, 'pointermove', (x + toX) / 2, (y + toY) / 2);
  pointer(owner, 'pointermove', toX, toY);
  pointer(owner, 'pointerup', toX, toY);
}

function centre(element: Element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

describe('GanttChart', () => {
  it('shows a task grid and a timeline with a row per task, each bar naming its task', () => {
    render(<Chart />);
    expect(screen.getByRole('group', { name: 'Website relaunch' })).toBeTruthy();
    expect(taskGrid().getAttribute('aria-rowcount')).toBe(String(projectTasks.length + 1));
    expect(within(timeline()).getAllByRole('gridcell')).toHaveLength(projectTasks.length);
    const design = gridRow('design');
    expect(design).toHaveAttribute('aria-level', '1');
    expect(design).toHaveAttribute('aria-expanded', 'true');
    expect(design).toHaveAttribute('aria-posinset', '2');
    expect(design).toHaveAttribute('aria-setsize', '4');
    expect(gridRow('visual')).toHaveAttribute('aria-level', '2');
    expect(gridRow('visual').hasAttribute('aria-expanded')).toBe(false);

    const wireframes = bar('wireframes').getAttribute('aria-label') ?? '';
    expect(wireframes).toContain('Wireframes');
    expect(wireframes).toMatch(/12\s?–\s?16 Oct 2026/);
    expect(wireframes).toContain('60% done');
    expect(wireframes).toContain('Starts before Requirements finishes');
    expect(bar('kickoff').getAttribute('aria-label')).toBe('Kickoff, milestone, 5 Oct 2026');
    expect(bar('kickoff').dataset.kind).toBe('milestone');
    // Only the first row has a tab stop, in each pane.
    expect(gridRow('discovery')).toHaveAttribute('tabindex', '0');
    expect(gridRow('design')).toHaveAttribute('tabindex', '-1');
    expect(bar('discovery')).toHaveAttribute('tabindex', '0');
  });

  it('rolls summary bars up from their children', () => {
    render(<Chart />);
    const design = bar('design');
    expect(design.dataset.kind).toBe('summary');
    // Wireframes (5 days at 60%) and Visual design (10 days at 20%): a third done, from the 12th to the 28th.
    expect(design.getAttribute('aria-label')).toMatch(
      /^Design, summary task, 12\s?–\s?28 Oct 2026, 33% done$/,
    );
    if (isDesktop) {
      expect(gridRow('design').textContent).toContain('17 days');
    }
  });

  it('draws the dependencies as arrows, marking the one the dates break', () => {
    render(<Chart />);
    const arrows = timeline().querySelectorAll('[data-dependency-id]');
    expect(arrows).toHaveLength(projectDependencies.length);
    const broken = timeline().querySelectorAll('path[data-violation]');
    expect([...broken].map((path) => path.getAttribute('data-dependency-id'))).toEqual([
      'requirements-wireframes',
    ]);
    expect(bar('wireframes')).toHaveAttribute('data-violation');
    expect(bar('visual').hasAttribute('data-violation')).toBe(false);
  });

  it('shows the grid columns that fit beside the task names', () => {
    render(<Chart />);
    const headers = within(taskGrid())
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers[0]).toBe('Task');
    if (isDesktop) {
      expect(headers).toEqual(['Task', 'Start', 'End', 'Duration', 'Progress']);
      expect(gridRow('wireframes').textContent).toContain('60%');
    } else if (isPhone) {
      expect(headers).toEqual(['Task']);
    }
  });

  it('collapses and expands summaries with the arrow keys and their buttons', async () => {
    const onExpandedChange = vi.fn();
    render(<Chart onExpandedChange={onExpandedChange} />);
    gridRow('discovery').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(gridRow('discovery')).toHaveAttribute('aria-expanded', 'false');
    expect(taskGrid().querySelector('[data-task-id="kickoff"]')).toBeNull();
    expect(timeline().querySelector('[data-task-id="kickoff"]')).toBeNull();
    // Arrows to hidden tasks hide with them.
    expect(timeline().querySelector('[data-dependency-id="kickoff-interviews"]')).toBeNull();
    expect(onExpandedChange).toHaveBeenLastCalledWith(new Set(['design', 'build', 'launch']));
    await userEvent.keyboard('{ArrowRight}');
    expect(gridRow('discovery')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedTaskId()).toBe('kickoff');
    await userEvent.keyboard('{ArrowLeft}');
    expect(focusedTaskId()).toBe('discovery');
    await userEvent.keyboard('{End}');
    expect(focusedTaskId()).toBe('golive');
    await userEvent.keyboard('{Home}{ArrowDown}');
    expect(focusedTaskId()).toBe('kickoff');

    await userEvent.click(screen.getByRole('button', { name: 'Collapse Build' }));
    expect(gridRow('build')).toHaveAttribute('aria-expanded', 'false');
    expect(taskGrid().querySelector('[data-task-id="api"]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Expand Build' }));
    expect(gridRow('api')).toBeTruthy();
  });

  it('follows controlled expandedIds, and starts from defaultExpandedIds', () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <Chart expandedIds={['build']} onExpandedChange={onExpandedChange} />,
    );
    expect(taskGrid().querySelectorAll('[data-task-id]')).toHaveLength(4 + 4);
    screen.getByRole('button', { name: 'Collapse Build' }).click();
    expect(onExpandedChange).toHaveBeenCalledWith(new Set());
    // Still controlled: nothing changes until the app says so.
    expect(gridRow('api')).toBeTruthy();
    rerender(<Chart expandedIds={[]} />);
    expect(taskGrid().querySelectorAll('[data-task-id]')).toHaveLength(4);
    rerender(<Chart key="fresh" defaultExpandedIds={['launch']} />);
    expect(taskGrid().querySelectorAll('[data-task-id]')).toHaveLength(4 + 3);
  });

  it('moves between bars with the arrow keys, Home and End', async () => {
    render(<Chart />);
    bar('discovery').focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(focusedTaskId()).toBe('interviews');
    // The task grid's tab stop follows.
    expect(gridRow('interviews')).toHaveAttribute('tabindex', '0');
    await userEvent.keyboard('{End}');
    expect(focusedTaskId()).toBe('golive');
    await userEvent.keyboard('{ArrowUp}{Home}');
    expect(focusedTaskId()).toBe('discovery');
  });

  it('moves, resizes and sets progress with Alt and the arrow keys', async () => {
    const onTaskChange = vi.fn();
    render(<EditableChart onTaskChange={onTaskChange} />);
    const wireframes = bar('wireframes');
    expect(wireframes.getAttribute('aria-describedby')).toBeTruthy();
    wireframes.focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'wireframes',
        start: new Date(utc(10, 13)),
        end: new Date(utc(10, 18)),
        progress: 60,
      }),
    );
    await userEvent.keyboard('{Alt>}{Shift>}{ArrowRight}{/Shift}{/Alt}');
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: new Date(utc(10, 13)), end: new Date(utc(10, 19)) }),
    );
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onTaskChange).toHaveBeenLastCalledWith(expect.objectContaining({ progress: 70 }));
    await userEvent.keyboard('{Alt>}{ArrowLeft}{ArrowLeft}{/Alt}');
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: new Date(utc(10, 11)), end: new Date(utc(10, 17)) }),
    );
    expect(document.activeElement).toBe(bar('wireframes'));
    expect(bar('wireframes').getAttribute('aria-label')).toContain('70% done');

    // Locked tasks and summaries don't change.
    onTaskChange.mockClear();
    bar('content').focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(onTaskChange).not.toHaveBeenCalled();
    await expect
      .poll(() => document.querySelector('[role="group"] [aria-live]')?.textContent)
      .toBe('Content migration is locked');
    bar('build').focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(onTaskChange).not.toHaveBeenCalled();
    expect(bar('build')).toHaveAttribute('aria-readonly', 'true');
  });

  it('drags a bar to move it, its edges to resize it and its handle to set its progress', async () => {
    const onTaskChange = vi.fn();
    render(<EditableChart onTaskChange={onTaskChange} />);
    /** Waits for the app's change to come back to the bar. */
    const shows = (text: RegExp) =>
      expect.poll(() => bar('wireframes').getAttribute('aria-label')).toMatch(text);
    // Five days of Wireframes: pixels per day at this zoom.
    const day = bar('wireframes').getBoundingClientRect().width / 5;
    const start = centre(bar('wireframes'));
    drag(bar('wireframes'), start.x + 2 * day, start.y);
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: new Date(utc(10, 14)), end: new Date(utc(10, 19)) }),
    );
    await shows(/14\s?–\s?18 Oct/);

    const endHandle = bar('wireframes').querySelector('[data-handle="end"]');
    if (!endHandle) {
      throw new Error('No end handle');
    }
    drag(endHandle, centre(endHandle).x + day, centre(endHandle).y);
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: new Date(utc(10, 14)), end: new Date(utc(10, 20)) }),
    );
    await shows(/14\s?–\s?19 Oct/);

    const startHandle = bar('wireframes').querySelector('[data-handle="start"]');
    if (!startHandle) {
      throw new Error('No start handle');
    }
    drag(startHandle, centre(startHandle).x - day, centre(startHandle).y);
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: new Date(utc(10, 13)), end: new Date(utc(10, 20)) }),
    );
    await shows(/13\s?–\s?19 Oct/);

    const progress = bar('wireframes').querySelector('[data-handle="progress"]');
    if (!progress) {
      throw new Error('No progress handle');
    }
    // 60% of 7 days; drag it to the bar's end.
    drag(progress, bar('wireframes').getBoundingClientRect().right, centre(progress).y);
    expect(onTaskChange).toHaveBeenLastCalledWith(expect.objectContaining({ progress: 100 }));
  });

  it('follows the reading direction right to left', async () => {
    const onTaskChange = vi.fn();
    render(
      <div dir="rtl">
        <EditableChart onTaskChange={onTaskChange} />
      </div>,
    );
    // Later dates are further left.
    expect(bar('visual').getBoundingClientRect().right).toBeLessThan(
      bar('wireframes').getBoundingClientRect().right,
    );
    const day = bar('wireframes').getBoundingClientRect().width / 5;
    const { x, y } = centre(bar('wireframes'));
    drag(bar('wireframes'), x - 2 * day, y);
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: new Date(utc(10, 14)), end: new Date(utc(10, 19)) }),
    );
    await expect
      .poll(() => bar('wireframes').getAttribute('aria-label'))
      .toMatch(/14\s?–\s?18 Oct/);
    bar('wireframes').focus();
    await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(onTaskChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: new Date(utc(10, 15)), end: new Date(utc(10, 20)) }),
    );
  });

  it('shows where a drag will land until the bar is released', async () => {
    render(<EditableChart />);
    const element = bar('wireframes');
    const { x, y } = centre(element);
    pointer(element, 'pointerdown', x, y);
    pointer(element, 'pointermove', x + 60, y);
    await expect
      .poll(() => timeline().querySelector('[data-preview]')?.textContent)
      .toMatch(/14\s?–\s?18 Oct 2026/);
    expect(element.className).toContain('opacity-50');
    pointer(element, 'pointerup', x + 60, y);
    await expect.poll(() => timeline().querySelector('[data-preview]')).toBeNull();
  });

  it('links tasks by dragging from the end of one bar to another', async () => {
    const onDependencyCreate = vi.fn();
    render(<EditableChart onDependencyCreate={onDependencyCreate} />);
    const finish = bar('wireframes').querySelector('[data-handle="link-finish"]');
    const start = bar('training').querySelector('[data-handle="link-start"]');
    if (!finish || !start) {
      throw new Error('No link handles');
    }
    // Onto the start half of Front end: finish to start.
    const frontEnd = bar('frontend').getBoundingClientRect();
    const from = centre(finish);
    pointer(finish, 'pointerdown', from.x, from.y);
    pointer(bar('wireframes'), 'pointermove', frontEnd.left + 4, frontEnd.top + 4);
    await expect.poll(() => timeline().querySelector('[data-link-preview]')).not.toBeNull();
    expect(bar('frontend').className).toContain('ring-2');
    pointer(bar('wireframes'), 'pointerup', frontEnd.left + 4, frontEnd.top + 4);
    expect(onDependencyCreate).toHaveBeenLastCalledWith({
      from: 'wireframes',
      to: 'frontend',
      type: 'finish-to-start',
    });
    await expect
      .poll(() => timeline().querySelector('[data-dependency-id="wireframes-frontend"]'))
      .not.toBeNull();

    // From a start onto the finish half of Go live's diamond: start to finish.
    const goLive = bar('golive').getBoundingClientRect();
    drag(start, goLive.right - 2, goLive.top + goLive.height / 2);
    expect(onDependencyCreate).toHaveBeenLastCalledWith({
      from: 'training',
      to: 'golive',
      type: 'start-to-finish',
    });
    // A link that's already there (Training to QA, start to finish), or a drop on empty space, makes nothing.
    onDependencyCreate.mockClear();
    const qa = bar('qa').getBoundingClientRect();
    drag(start, qa.right - 2, qa.top + qa.height / 2);
    drag(finish, frontEnd.left + 4, frontEnd.bottom + 300);
    expect(onDependencyCreate).not.toHaveBeenCalled();
  });

  it.runIf(isDesktop)(
    'links tasks from the details, choosing the other task with the keyboard',
    async () => {
      const onDependencyCreate = vi.fn();
      render(<EditableChart onDependencyCreate={onDependencyCreate} />);
      bar('wireframes').focus();
      await userEvent.keyboard('{Enter}');
      const details = await screen.findByRole('dialog', { name: 'Wireframes' });
      expect(details.textContent).toContain('Starts before Requirements finishes');
      await userEvent.click(within(details).getByRole('button', { name: 'Link to a task' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Start to start' }));
      await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
      expect(
        screen.getByText(/Choose the task Wireframes links to \(start to start\)/, {
          selector: 'p',
        }),
      ).toBeTruthy();
      await expect.poll(focusedTaskId).toBe('wireframes');
      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(onDependencyCreate).toHaveBeenLastCalledWith({
        from: 'wireframes',
        to: 'visual',
        type: 'start-to-start',
      });
      expect(screen.queryByText(/Choose the task/, { selector: 'p' })).toBeNull();
      await expect
        .poll(() => document.querySelector('[role="group"] [aria-live]')?.textContent)
        .toBe('Linked Wireframes to Visual design, start to start');
    },
  );

  it('cancels linking with Escape', async () => {
    const onDependencyCreate = vi.fn();
    render(<EditableChart onDependencyCreate={onDependencyCreate} />);
    await userEvent.click(bar('api'));
    const details = await screen.findByRole('dialog', { name: 'API' });
    await userEvent.click(within(details).getByRole('button', { name: 'Link to a task' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Finish to start' }));
    await expect
      .poll(() => screen.queryByText(/Choose the task API links to/, { selector: 'p' }))
      .not.toBeNull();
    bar('api').focus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText(/Choose the task/, { selector: 'p' })).toBeNull();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onDependencyCreate).not.toHaveBeenCalled();
  });

  it('removes a dependency from the details', async () => {
    const onDependencyDelete = vi.fn();
    render(<EditableChart onDependencyDelete={onDependencyDelete} />);
    bar('wireframes').focus();
    await userEvent.keyboard('{Enter}');
    const details = await screen.findByRole('dialog', { name: 'Wireframes' });
    expect(within(details).getByRole('list', { name: 'Depends on' }).textContent).toContain(
      'Requirements',
    );
    await userEvent.click(
      within(details).getByRole('button', {
        name: 'Remove the link from Requirements to Wireframes',
      }),
    );
    expect(onDependencyDelete).toHaveBeenCalledWith('requirements-wireframes');
    expect(timeline().querySelector('[data-dependency-id="requirements-wireframes"]')).toBeNull();
    expect(bar('wireframes').hasAttribute('data-violation')).toBe(false);
  });

  it('opens the details on a click, or on a second tap on touch screens', async () => {
    render(<Chart />);
    if (isTouch) {
      await commands.tap('[role="grid"] [data-task-id="visual"]');
      expect(bar('visual')).toHaveAttribute('data-active');
      expect(screen.queryByRole('dialog')).toBeNull();
      await commands.tap('[role="grid"] [data-task-id="visual"]');
    } else {
      await userEvent.click(bar('visual'));
    }
    const details = await screen.findByRole('dialog', { name: 'Visual design' });
    expect(details.textContent).toContain('10 days');
    expect(details.textContent).toContain('20% done');
    expect(within(details).queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('zooms from hours to quarters with the toolbar', async () => {
    const onZoomChange = vi.fn();
    render(<Chart onZoomChange={onZoomChange} />);
    const header = () => timeline().querySelector('[role="columnheader"]')?.textContent ?? '';
    expect(header()).toContain('October 2026');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onZoomChange).toHaveBeenLastCalledWith('hour');
    // Days above the hours.
    expect(header()).toMatch(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} Oct/);
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    for (let step = 0; step < 4; step += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    }
    expect(onZoomChange).toHaveBeenLastCalledWith('quarter');
    expect(header()).toContain('Q4');
    expect(header()).toContain('2026');
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
  });

  it.runIf(isDesktop)('chooses a zoom from the list, and follows a controlled zoom', async () => {
    const onZoomChange = vi.fn();
    const { rerender } = render(<Chart zoom="day" onZoomChange={onZoomChange} />);
    const trigger = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-haspopup') === 'listbox');
    if (!trigger) {
      throw new Error('No zoom list');
    }
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: 'Months' }));
    expect(onZoomChange).toHaveBeenLastCalledWith('month');
    // Controlled: still days until the app says otherwise.
    expect(timeline().querySelector('[role="columnheader"]')?.textContent).toContain(
      'October 2026',
    );
    rerender(<Chart zoom="month" onZoomChange={onZoomChange} />);
    expect(timeline().querySelector('[role="columnheader"]')?.textContent).toContain('Oct');
    expect(timeline().querySelector('[role="columnheader"]')?.textContent).not.toContain(
      'October 2026',
    );
  });

  it('draws the today line and shades non-working time', () => {
    const { rerender } = render(<Chart />);
    expect(timeline().querySelector('[data-now-line]')).not.toBeNull();
    expect(timeline().querySelectorAll('[data-non-working]').length).toBeGreaterThan(0);
    rerender(<Chart hasNowLine={false} />);
    expect(timeline().querySelector('[data-now-line]')).toBeNull();
    rerender(<Chart workingDays={[0, 1, 2, 3, 4, 5, 6]} />);
    expect(timeline().querySelector('[data-non-working]')).toBeNull();
    rerender(<Chart now={Date.UTC(2030, 0, 1)} />);
    expect(timeline().querySelector('[data-now-line]')).toBeNull();
  });

  it('scrolls to today from the Today button, widening the range when needed', async () => {
    render(<Chart now={Date.UTC(2027, 1, 10, 12)} />);
    expect(timeline().querySelector('[data-now-line]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    await expect.poll(() => timeline().querySelector('[data-now-line]')).not.toBeNull();
    const body = timeline().parentElement;
    const line = timeline().querySelector('[data-now-line]');
    if (!body || !line) {
      throw new Error('No timeline');
    }
    await expect
      .poll(() => {
        const view = body.getBoundingClientRect();
        const x = line.getBoundingClientRect().left;
        return x > view.left && x < view.right;
      })
      .toBe(true);
  });

  it('marks the critical path', () => {
    render(<Chart hasCriticalPath />);
    const critical = [...timeline().querySelectorAll<HTMLElement>('[data-critical]')].map(
      (element) => element.dataset.taskId,
    );
    expect(critical.sort()).toEqual(['golive', 'integration', 'qa']);
    expect(bar('qa').getAttribute('aria-label')).toContain('on the critical path');
  });

  it('renders only the rows in view for 5,000 tasks, scrolling both panes together', async () => {
    const { tasks, dependencies } = manyTasks(5000);
    render(<Chart tasks={tasks} dependencies={dependencies} />);
    expect(taskGrid().getAttribute('aria-rowcount')).toBe('5001');
    const rendered = () => taskGrid().querySelectorAll('[data-task-id]').length;
    expect(rendered()).toBeGreaterThan(5);
    expect(rendered()).toBeLessThan(80);
    expect(timeline().querySelectorAll('[data-task-id]').length).toBe(rendered());
    expect(timeline().querySelectorAll('[data-dependency-id]').length).toBeLessThan(80);

    const body = timeline().parentElement;
    const gridBody = taskGrid().parentElement;
    if (!body || !gridBody) {
      throw new Error('No scroll areas');
    }
    const rowHeight = gridRow('phase-0').getBoundingClientRect().height;
    body.scrollTop = 2500 * rowHeight;
    await expect.poll(() => gridBody.scrollTop).toBe(body.scrollTop);
    await expect.poll(() => taskGrid().querySelector('[aria-rowindex="2502"]')).not.toBeNull();
    expect(rendered()).toBeLessThan(80);
    // The rows line up across the split.
    const row = taskGrid().querySelector('[aria-rowindex="2502"]');
    const timelineRow = timeline().querySelector('[aria-rowindex="2502"]');
    expect(row?.getBoundingClientRect().top).toBeCloseTo(
      timelineRow?.getBoundingClientRect().top ?? 0,
      0,
    );
  });

  it('keeps the active row rendered (and focusable) when it scrolls out of view', async () => {
    const { tasks } = manyTasks(2000);
    render(<Chart tasks={tasks} dependencies={[]} />);
    gridRow('phase-0').focus();
    await userEvent.keyboard('{End}');
    expect(focusedTaskId()).toBe(tasks.at(-1)?.id);
    await userEvent.keyboard('{Home}');
    expect(focusedTaskId()).toBe('phase-0');
    const body = timeline().parentElement;
    if (body) {
      body.scrollTop = 1000 * gridRow('phase-0').getBoundingClientRect().height;
    }
    await expect.poll(() => taskGrid().querySelector('[aria-rowindex="1002"]')).not.toBeNull();
    expect(gridRow('phase-0')).toHaveAttribute('tabindex', '0');
  });

  it('shows the empty state without tasks', () => {
    render(<Chart tasks={[]} dependencies={[]} />);
    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.queryByRole('treegrid')).toBeNull();
  });

  it('uses the strings UIProvider gives it', () => {
    render(
      <Chart
        messages={{
          ganttTasks: 'Aufgaben',
          ganttTimeline: 'Zeitplan',
          ganttTaskColumn: 'Vorgang',
          ganttZoomIn: 'Vergrößern',
        }}
      />,
    );
    expect(screen.getByRole('treegrid', { name: 'Aufgaben' })).toBeTruthy();
    expect(screen.getByRole('grid', { name: 'Zeitplan' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Vorgang' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vergrößern' })).toBeTruthy();
    expect(screen.getByRole('separator', { name: 'Resize Aufgaben' })).toBeTruthy();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<EditableChart hasCriticalPath />);
    await expectNoAxeViolations(container);
  });

  it('never makes the page scroll sideways (the timeline scrolls inside)', () => {
    render(<Chart defaultZoom="hour" />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('stops rendering once it has laid itself out', async () => {
    // Inline ref callbacks that re-measure every render, or observer updates that always make new state, would keep
    // the chart rendering forever.
    let commits = 0;
    const { tasks, dependencies } = manyTasks(500);
    render(
      <Profiler
        id="gantt"
        onRender={() => {
          commits += 1;
        }}
      >
        <Chart tasks={tasks} dependencies={dependencies} isEditable onTaskChange={vi.fn()} />
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
