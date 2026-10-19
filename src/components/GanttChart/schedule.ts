// GanttChart's task model, all linear in the number of tasks and dependencies: the tree the `parentId`s make, summary
// tasks rolled up from their children, the rows left after collapsing, dependency violations, and the critical path.
import { clamp } from '../../utils/math';
import { toEpochMs } from '../../utils/time';
import type { Tone } from '../../utils/types';
import type { GanttDependency, GanttDependencyType, GanttTask, GanttTaskKind } from './types';

/** A task where the chart draws it: its place in the tree and its times as epoch milliseconds. */
export interface TaskNode {
  task: GanttTask;
  id: string;
  /** 0 for top-level tasks. */
  level: number;
  parentId: string | null;
  childIds: string[];
  /** Its position among its siblings, from 1, and how many siblings there are (for `aria-posinset`, `aria-setsize`). */
  position: number;
  siblingCount: number;
  /** A summary's span its children's; NaN when the task has no valid dates. */
  start: number;
  end: number;
  /** Percent done, 0–100. */
  progress: number;
  kind: GanttTaskKind;
  isLocked: boolean;
  tone: Tone;
}

export interface GanttModel {
  nodes: ReadonlyMap<string, TaskNode>;
  /** Every task id in tree order (parents before their children). */
  order: readonly string[];
  /** The ids of the tasks with children. */
  parentIds: readonly string[];
  /** The earliest start and latest end, or undefined without dated tasks. */
  extent: [number, number] | undefined;
}

/** Whether a node has dates to draw. */
export function isDated(node: { start: number; end: number }): boolean {
  return Number.isFinite(node.start) && Number.isFinite(node.end);
}

/**
 * Builds the tree. A task whose `parentId` names no task (or itself) is a top-level task; tasks caught in a cycle of
 * parents become top-level too, at their first place in `tasks`.
 */
export function buildModel(tasks: readonly GanttTask[]): GanttModel {
  const byId = new Map<string, GanttTask>();
  for (const task of tasks) {
    if (!byId.has(task.id)) {
      byId.set(task.id, task);
    }
  }
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const task of byId.values()) {
    const parent = task.parentId;
    if (parent !== undefined && parent !== task.id && byId.has(parent)) {
      const list = children.get(parent) ?? [];
      list.push(task.id);
      children.set(parent, list);
    } else {
      roots.push(task.id);
    }
  }

  const nodes = new Map<string, TaskNode>();
  const order: string[] = [];
  // Depth first, without recursion (a long chain of parents mustn't overflow the stack).
  const walk = (rootIds: readonly string[], parentId: string | null, level: number) => {
    const stack: {
      ids: readonly string[];
      index: number;
      parentId: string | null;
      level: number;
    }[] = [{ ids: rootIds, index: 0, parentId, level }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (!frame) {
        break;
      }
      const id = frame.ids[frame.index];
      if (id === undefined) {
        stack.pop();
        continue;
      }
      frame.index += 1;
      const task = byId.get(id);
      if (!task || nodes.has(id)) {
        continue;
      }
      const childIds = children.get(id) ?? [];
      nodes.set(id, {
        task,
        id,
        level: frame.level,
        parentId: frame.parentId,
        childIds: [],
        position: 1,
        siblingCount: 1,
        start: Number.NaN,
        end: Number.NaN,
        progress: 0,
        kind: 'task',
        isLocked: task.isLocked === true,
        tone: task.tone ?? 'accent',
      });
      order.push(id);
      if (childIds.length > 0) {
        stack.push({ ids: childIds, index: 0, parentId: id, level: frame.level + 1 });
      }
    }
  };
  walk(roots, null, 0);
  // Whatever the roots didn't reach is in a cycle of parents: start it again from its first task.
  if (order.length < byId.size) {
    for (const id of byId.keys()) {
      if (!nodes.has(id)) {
        walk([id], null, 0);
      }
    }
  }
  const topLevel: TaskNode[] = [];
  for (const id of order) {
    const node = nodes.get(id);
    const parent = node?.parentId === null ? undefined : nodes.get(node?.parentId ?? '');
    if (parent) {
      parent.childIds.push(id);
    } else if (node) {
      topLevel.push(node);
    }
  }
  topLevel.forEach((node, index) => {
    node.position = index + 1;
    node.siblingCount = topLevel.length;
  });
  // Roll up, children before their parents (who number them).
  const parentIds: string[] = [];
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const node = nodes.get(order[index] ?? '');
    if (!node) {
      continue;
    }
    rollUp(node, nodes);
    if (node.childIds.length > 0) {
      parentIds.push(node.id);
    }
    if (isDated(node)) {
      min = Math.min(min, node.start);
      max = Math.max(max, node.end);
    }
  }
  parentIds.reverse();
  return { nodes, order, parentIds, extent: min <= max ? [min, max] : undefined };
}

/** Sets a node's times, progress and kind; its children are already done. */
function rollUp(node: TaskNode, nodes: ReadonlyMap<string, TaskNode>) {
  const { task } = node;
  const ownProgress = task.progress === undefined ? undefined : clamp(task.progress, 0, 100);
  if (node.childIds.length > 0) {
    let start = Number.POSITIVE_INFINITY;
    let end = Number.NEGATIVE_INFINITY;
    let weighted = 0;
    let weights = 0;
    let plain = 0;
    let count = 0;
    node.childIds.forEach((childId, index) => {
      const child = nodes.get(childId);
      if (!child) {
        return;
      }
      child.position = index + 1;
      child.siblingCount = node.childIds.length;
      if (isDated(child)) {
        start = Math.min(start, child.start);
        end = Math.max(end, child.end);
        const length = child.end - child.start;
        weighted += child.progress * length;
        weights += length;
      }
      plain += child.progress;
      count += 1;
    });
    node.kind = 'summary';
    if (start <= end) {
      node.start = start;
      node.end = end;
    } else {
      setOwnTimes(node);
    }
    node.progress =
      ownProgress ?? (weights > 0 ? weighted / weights : count > 0 ? plain / count : 0);
    return;
  }
  setOwnTimes(node);
  node.progress = ownProgress ?? 0;
  node.kind =
    task.isMilestone === true || (isDated(node) && node.end === node.start) ? 'milestone' : 'task';
  if (node.kind === 'milestone' && Number.isFinite(node.start)) {
    node.end = node.start;
  }
}

function setOwnTimes(node: TaskNode) {
  const start = toEpochMs(node.task.start);
  const end = toEpochMs(node.task.end);
  node.start = Number.isFinite(start) ? start : Number.NaN;
  // An end before the start (or missing) makes a point in time.
  node.end = Number.isFinite(node.start)
    ? Number.isFinite(end)
      ? Math.max(end, start)
      : start
    : Number.NaN;
}

/**
 * The tasks shown as rows, in tree order: everything except the descendants of collapsed summaries (summaries not in
 * `expandedIds`).
 */
export function visibleRows(model: GanttModel, expandedIds: ReadonlySet<string>): TaskNode[] {
  const rows: TaskNode[] = [];
  let hiddenBelow = Number.POSITIVE_INFINITY;
  for (const id of model.order) {
    const node = model.nodes.get(id);
    if (!node) {
      continue;
    }
    if (node.level > hiddenBelow) {
      continue;
    }
    hiddenBelow = Number.POSITIVE_INFINITY;
    rows.push(node);
    if (node.childIds.length > 0 && !expandedIds.has(id)) {
      hiddenBelow = node.level;
    }
  }
  return rows;
}

/** A dependency between two known tasks, with whether the dates break it. */
export interface PlacedDependency {
  id: string;
  dependency: GanttDependency;
  type: GanttDependencyType;
  from: TaskNode;
  to: TaskNode;
  isViolated: boolean;
}

/** Whether a successor's dates break its dependency on a predecessor. */
export function isViolated(
  type: GanttDependencyType,
  from: { start: number; end: number },
  to: { start: number; end: number },
): boolean {
  switch (type) {
    case 'start-to-start':
      return to.start < from.start;
    case 'finish-to-finish':
      return to.end < from.end;
    case 'start-to-finish':
      return to.end < from.start;
    default:
      return to.start < from.end;
  }
}

/** The dependencies whose tasks both exist (and differ), with their violations. */
export function placeDependencies(
  dependencies: readonly GanttDependency[],
  model: GanttModel,
): PlacedDependency[] {
  const placed: PlacedDependency[] = [];
  for (const dependency of dependencies) {
    const from = model.nodes.get(dependency.from);
    const to = model.nodes.get(dependency.to);
    if (!from || !to || from === to) {
      continue;
    }
    const type = dependency.type ?? 'finish-to-start';
    placed.push({
      id: dependency.id,
      dependency,
      type,
      from,
      to,
      isViolated: isDated(from) && isDated(to) && isViolated(type, from, to),
    });
  }
  return placed;
}

/** The latest a task may finish for one successor, given the successor's latest finish. */
function latestFinishFor(
  type: GanttDependencyType,
  task: TaskNode,
  successor: TaskNode,
  successorFinish: number,
): number {
  const own = task.end - task.start;
  const successorStart = successorFinish - (successor.end - successor.start);
  switch (type) {
    case 'start-to-start':
      return successorStart + own;
    case 'finish-to-finish':
      return successorFinish;
    case 'start-to-finish':
      return successorFinish + own;
    default:
      return successorStart;
  }
}

/**
 * The critical path: the tasks with no slack, which can't slip without moving the project's end (the latest end of
 * any task), and the dependencies between them. A backward pass over the dependency graph in reverse topological
 * order; summaries and undated tasks take no part, and tasks in a dependency cycle are left out.
 */
export function criticalPath(
  model: GanttModel,
  dependencies: readonly PlacedDependency[],
): { taskIds: Set<string>; dependencyIds: Set<string> } {
  const takesPart = (node: TaskNode) => node.kind !== 'summary' && isDated(node);
  const successors = new Map<string, PlacedDependency[]>();
  const pending = new Map<string, number>();
  let projectEnd = Number.NEGATIVE_INFINITY;
  for (const node of model.nodes.values()) {
    if (takesPart(node)) {
      projectEnd = Math.max(projectEnd, node.end);
      pending.set(node.id, 0);
    }
  }
  const links = dependencies.filter((link) => takesPart(link.from) && takesPart(link.to));
  for (const link of links) {
    const list = successors.get(link.from.id) ?? [];
    list.push(link);
    successors.set(link.from.id, list);
    // Counted per predecessor: a task is ready once every successor of it is done.
    pending.set(link.from.id, (pending.get(link.from.id) ?? 0) + 1);
  }
  // Reverse topological order: tasks with no unfinished successors first.
  const predecessors = new Map<string, PlacedDependency[]>();
  for (const link of links) {
    const list = predecessors.get(link.to.id) ?? [];
    list.push(link);
    predecessors.set(link.to.id, list);
  }
  const latestFinish = new Map<string, number>();
  const ready = [...pending].filter(([, count]) => count === 0).map(([id]) => id);
  while (ready.length > 0) {
    const id = ready.pop();
    const node = id === undefined ? undefined : model.nodes.get(id);
    if (!node) {
      continue;
    }
    let finish = projectEnd;
    for (const link of successors.get(node.id) ?? []) {
      const successorFinish = latestFinish.get(link.to.id);
      if (successorFinish !== undefined) {
        finish = Math.min(finish, latestFinishFor(link.type, node, link.to, successorFinish));
      }
    }
    latestFinish.set(node.id, finish);
    for (const link of predecessors.get(node.id) ?? []) {
      const left = (pending.get(link.from.id) ?? 1) - 1;
      pending.set(link.from.id, left);
      if (left === 0) {
        ready.push(link.from.id);
      }
    }
  }
  const taskIds = new Set<string>();
  for (const [id, finish] of latestFinish) {
    const node = model.nodes.get(id);
    if (node && finish - node.end <= 0) {
      taskIds.add(id);
    }
  }
  const dependencyIds = new Set(
    links
      .filter((link) => taskIds.has(link.from.id) && taskIds.has(link.to.id))
      .map((link) => link.id),
  );
  return { taskIds, dependencyIds };
}
