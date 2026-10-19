// Deterministic tasks for the KanbanBoard stories and tests: columns, priority and assignee lanes, and cards with an
// assignee, a priority, tags and a due date.

import type {
  KanbanColumn,
  KanbanItem,
  KanbanLane,
} from '../src/components/KanbanBoard/kanbanItems';
import { people } from './people';

export const boardColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress', limit: 3 },
  { id: 'review', title: 'Review', limit: 2 },
  { id: 'done', title: 'Done' },
];

export const priorities = ['High', 'Medium', 'Low'] as const;
export type Priority = (typeof priorities)[number];

export const priorityLanes: KanbanLane[] = priorities.map((priority) => ({
  id: priority.toLowerCase(),
  title: priority,
}));

const assignees = people.slice(0, 4);

export const assigneeLanes: KanbanLane[] = assignees.map((person) => ({
  id: person.name.toLowerCase().replace(/\W+/g, '-'),
  title: person.name,
}));

export interface Task {
  assignee: { name: string; src?: string };
  priority: Priority;
  tags: string[];
  /** ISO day. */
  due: string;
}

const titles = [
  'Calibrate the spectrograph',
  'Write the observing proposal',
  'Archive last night’s frames',
  'Fix the dome shutter alarm',
  'Review the photometry pipeline',
  'Order replacement filters',
  'Plan the outreach evening',
  'Update the telescope manual',
  'Reduce the transit light curves',
  'Back up the image archive',
];
const tagSets = [['Optics'], ['Software', 'Urgent'], ['Archive'], [], ['Outreach'], ['Hardware']];

/** `count` tasks spread over the columns (most of them to do), cycling titles, assignees and priorities. */
export function boardTasks(count: number, columns = boardColumns): KanbanItem<Task>[] {
  return Array.from({ length: count }, (_, index) => {
    const person = assignees[index % assignees.length] ?? people[0];
    const priority = priorities[index % priorities.length] ?? 'Low';
    const round = Math.floor(index / titles.length);
    const title = titles[index % titles.length] ?? '';
    const column = columns[[0, 0, 1, 2, 3, 0, 3][index % 7] ?? 0] ?? columns[0];
    return {
      id: `task-${String(index + 1)}`,
      label: round === 0 ? title : `${title} ${String(round + 1)}`,
      columnId: column?.id ?? 'todo',
      laneId: priority.toLowerCase(),
      data: {
        assignee: { name: person.name, src: 'src' in person ? person.src : undefined },
        priority,
        tags: tagSets[index % tagSets.length] ?? [],
        due: `2026-11-${String((index % 27) + 1).padStart(2, '0')}`,
      },
    };
  });
}

/** The tasks with their lane set to their assignee, for a board in assignee lanes. */
export function byAssignee(tasks: readonly KanbanItem<Task>[]): KanbanItem<Task>[] {
  return tasks.map((task) => ({
    ...task,
    laneId: task.data?.assignee.name.toLowerCase().replace(/\W+/g, '-'),
  }));
}
