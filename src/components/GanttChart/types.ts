// GanttChart's public data types: tasks (a tree through `parentId`), the dependencies between them, the zoom levels
// and the task grid's columns.
import type { ReactNode } from 'react';
import type { Instant } from '../../utils/time';
import type { Tone } from '../../utils/types';

export interface GanttTask {
  /** Unique across the chart. */
  id: string;
  /**
   * The summary task this one belongs to. Top-level tasks have none. Tasks are a flat list, so the app can replace a
   * changed task in place; siblings keep their order in `tasks`.
   */
  parentId?: string;
  label: string;
  /** A Date, epoch milliseconds or an ISO 8601 string. */
  start: Instant;
  /** When the task finishes (exclusive: a task that ends at midnight covers the day before). */
  end: Instant;
  /**
   * Percent done, 0 to 100. A summary task (one with children) without its own shows its children's, weighted by
   * their length.
   */
  progress?: number;
  /** A point in time drawn as a diamond at `start`. A task whose `end` equals its `start` is one too. */
  isMilestone?: boolean;
  /** The bar's colour. Defaults to `accent`. */
  tone?: Tone;
  /** A locked task can't be moved, resized or have its progress changed. */
  isLocked?: boolean;
  /** More about the task, shown in its details popover. */
  detail?: ReactNode;
}

/**
 * How a dependency ties its tasks together: `finish-to-start` (the next task starts once this one finishes, the
 * usual kind), `start-to-start`, `finish-to-finish` or `start-to-finish`.
 */
export type GanttDependencyType =
  'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';

export interface GanttDependency {
  id: string;
  /** The predecessor's task id. */
  from: string;
  /** The successor's task id. */
  to: string;
  /** Defaults to `finish-to-start`. */
  type?: GanttDependencyType;
}

/** A new dependency drawn by the user (dragging from a bar's end, or linking from a task's details). */
export interface GanttDependencyDraft {
  from: string;
  to: string;
  type: GanttDependencyType;
}

/** What a task is drawn as: a bar, a summary bar spanning its children, or a milestone's diamond. */
export type GanttTaskKind = 'task' | 'summary' | 'milestone';

/** The timeline's zoom: what one column of the time scale is. */
export type GanttZoom = 'hour' | 'day' | 'week' | 'month' | 'quarter';

/** The task grid's columns after the task names. */
export type GanttColumn = 'start' | 'end' | 'duration' | 'progress';
