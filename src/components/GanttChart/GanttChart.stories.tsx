import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { manyTasks, PROJECT_NOW, projectDependencies, projectTasks } from '../../../test/gantt';
import { GanttChart } from './GanttChart';
import type { GanttDependency, GanttTask } from './types';

const meta = {
  title: 'Display/GanttChart',
  component: GanttChart,
  args: {
    tasks: projectTasks,
    dependencies: projectDependencies,
    now: PROJECT_NOW,
    timeZone: 'UTC',
    firstDayOfWeek: 1,
    'aria-label': 'Website relaunch',
  },
} satisfies Meta<typeof GanttChart>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A website relaunch: four phases of tasks with progress, summary bars spanning their children, milestones, and
 * dependencies of every type. Wireframes start before Requirements finish, so that arrow and bar are highlighted.
 * Weekends are shaded and the red line is today.
 */
export const Default: Story = {};

/**
 * Editable: drag a bar to move it, its edges to resize it, the handle under it to set its progress, and the dot at
 * either end onto another bar to link them (which ends you join picks the dependency type). With the keyboard, Alt
 * and Left or Right move the focused bar a day; Alt, Shift and Left or Right change its length; Alt and Up or Down
 * its progress. A task's details (Enter, or a click) remove dependencies and link it to another task. Content
 * migration is locked.
 */
export const Editable: Story = {
  tags: ['!visual'],
  render: function EditableStory(args) {
    const [tasks, setTasks] = useState<GanttTask[]>(projectTasks);
    const [dependencies, setDependencies] = useState<GanttDependency[]>(projectDependencies);
    return (
      <GanttChart
        {...args}
        tasks={tasks}
        dependencies={dependencies}
        isEditable
        onTaskChange={(changed) => {
          setTasks((current) => current.map((task) => (task.id === changed.id ? changed : task)));
        }}
        onDependencyCreate={(draft) => {
          setDependencies((current) => [
            ...current,
            { id: `${draft.from}-${draft.to}-${draft.type}`, ...draft },
          ]);
        }}
        onDependencyDelete={(id) => {
          setDependencies((current) => current.filter((dependency) => dependency.id !== id));
        }}
      />
    );
  },
};

/** The critical path: the tasks (and links) that can't slip without moving Go live, outlined in red. */
export const CriticalPath: Story = {
  args: { hasCriticalPath: true },
};

/** Zoomed in to hours, with the hours outside 9 to 17 shaded. */
export const Hours: Story = {
  args: { defaultZoom: 'hour' },
};

/** Zoomed out to weeks. */
export const Weeks: Story = {
  args: { defaultZoom: 'week' },
};

/** Zoomed out to months. */
export const Months: Story = {
  tags: ['!visual'],
  args: { defaultZoom: 'month' },
};

/** Zoomed out to quarters. */
export const Quarters: Story = {
  args: { defaultZoom: 'quarter' },
};

/** Summary tasks collapsed at first; the arrows to hidden tasks hide with them. */
export const Collapsed: Story = {
  tags: ['!visual'],
  args: { defaultExpandedIds: ['design'] },
};

const thousands = manyTasks(5000);

/** 5,000 tasks and 4,500 dependencies: only the rows in view render, in both panes. */
export const ThousandsOfTasks: Story = {
  tags: ['!visual'],
  args: {
    tasks: thousands.tasks,
    dependencies: thousands.dependencies,
    'aria-label': 'Programme',
  },
};

/** No tasks yet. */
export const Empty: Story = {
  args: { tasks: [], dependencies: [] },
};
