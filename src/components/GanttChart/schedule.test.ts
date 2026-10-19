import { describe, expect, it } from 'vitest';
import { manyTasks, projectDependencies, projectTasks } from '../../../test/gantt';
import {
  buildModel,
  criticalPath,
  isViolated,
  placeDependencies,
  visibleRows,
  type GanttModel,
} from './schedule';
import type { GanttTask } from './types';

const DAY = 86_400_000;
const utc = (month: number, date: number) => Date.UTC(2026, month - 1, date);

function node(model: GanttModel, id: string) {
  const found = model.nodes.get(id);
  if (!found) {
    throw new Error(`No task ${id}`);
  }
  return found;
}

describe('buildModel', () => {
  it('builds the tree in order, with levels and positions among siblings', () => {
    const model = buildModel(projectTasks);
    expect(model.order.slice(0, 5)).toEqual([
      'discovery',
      'kickoff',
      'interviews',
      'requirements',
      'design',
    ]);
    expect(node(model, 'design')).toMatchObject({ level: 0, position: 2, siblingCount: 4 });
    expect(node(model, 'wireframes')).toMatchObject({
      level: 1,
      parentId: 'design',
      position: 1,
      siblingCount: 3,
    });
    expect(model.parentIds).toEqual(['discovery', 'design', 'build', 'launch']);
    expect(model.extent).toEqual([utc(10, 5), utc(11, 25)]);
  });

  it('rolls summaries up from their children, weighting progress by length', () => {
    const design = node(buildModel(projectTasks), 'design');
    expect(design.kind).toBe('summary');
    // Its own dates are ignored: Wireframes start it, Design review ends it.
    expect(design.start).toBe(utc(10, 12));
    expect(design.end).toBe(utc(10, 29));
    // Wireframes: 5 days at 60%; Visual design: 10 days at 20%; the milestone weighs nothing.
    expect(design.progress).toBeCloseTo((5 * 60 + 10 * 20) / 15);
  });

  it('keeps a summary’s own progress, and its own dates when no child has any', () => {
    const model = buildModel([
      { id: 'a', label: 'A', start: utc(10, 1), end: utc(10, 5), progress: 75 },
      { id: 'b', parentId: 'a', label: 'B', start: 'never', end: 'never' },
    ]);
    expect(node(model, 'a')).toMatchObject({ start: utc(10, 1), end: utc(10, 5), progress: 75 });
    expect(Number.isNaN(node(model, 'b').start)).toBe(true);
  });

  it('makes milestones of tasks marked so, or that end when they start', () => {
    const model = buildModel([
      { id: 'a', label: 'A', start: utc(10, 1), end: utc(10, 1) },
      { id: 'b', label: 'B', start: utc(10, 1), end: utc(10, 4), isMilestone: true },
      { id: 'c', label: 'C', start: utc(10, 5), end: utc(10, 1) },
    ]);
    expect(node(model, 'a').kind).toBe('milestone');
    expect(node(model, 'b')).toMatchObject({ kind: 'milestone', end: utc(10, 1) });
    // An end before the start makes a point in time.
    expect(node(model, 'c')).toMatchObject({ kind: 'milestone', end: utc(10, 5) });
  });

  it('puts tasks with missing parents, or caught in a cycle of parents, at the top', () => {
    const model = buildModel([
      { id: 'a', parentId: 'b', label: 'A', start: 0, end: DAY },
      { id: 'b', parentId: 'a', label: 'B', start: 0, end: DAY },
      { id: 'c', parentId: 'gone', label: 'C', start: 0, end: DAY },
      { id: 'd', parentId: 'd', label: 'D', start: 0, end: DAY },
    ]);
    expect(model.order).toHaveLength(4);
    expect(node(model, 'c').level).toBe(0);
    expect(node(model, 'd').level).toBe(0);
    expect(node(model, 'a').level + node(model, 'b').level).toBe(1);
  });

  it('handles 5,000 tasks and a chain of parents thousands deep', () => {
    const { tasks } = manyTasks(5000);
    expect(buildModel(tasks).order).toHaveLength(5000);
    const chain: GanttTask[] = Array.from({ length: 5000 }, (_, index) => ({
      id: String(index),
      parentId: index === 0 ? undefined : String(index - 1),
      label: `Level ${String(index)}`,
      start: 0,
      end: DAY,
    }));
    const deep = buildModel(chain);
    expect(node(deep, '4999').level).toBe(4999);
  });
});

describe('visibleRows', () => {
  it('leaves out the descendants of collapsed summaries', () => {
    const model = buildModel(projectTasks);
    const all = visibleRows(model, new Set(model.parentIds));
    expect(all).toHaveLength(projectTasks.length);
    const rows = visibleRows(model, new Set(['design']));
    expect(rows.map((row) => row.id)).toEqual([
      'discovery',
      'design',
      'wireframes',
      'visual',
      'review',
      'build',
      'launch',
    ]);
  });
});

describe('dependencies', () => {
  it('knows when dates break each type', () => {
    const before = { start: 0, end: 10 };
    expect(isViolated('finish-to-start', before, { start: 5, end: 20 })).toBe(true);
    expect(isViolated('finish-to-start', before, { start: 10, end: 20 })).toBe(false);
    expect(isViolated('start-to-start', before, { start: -1, end: 20 })).toBe(true);
    expect(isViolated('start-to-start', before, { start: 0, end: 20 })).toBe(false);
    expect(isViolated('finish-to-finish', before, { start: 0, end: 9 })).toBe(true);
    expect(isViolated('finish-to-finish', before, { start: 0, end: 10 })).toBe(false);
    expect(isViolated('start-to-finish', before, { start: -5, end: -1 })).toBe(true);
    expect(isViolated('start-to-finish', before, { start: -5, end: 0 })).toBe(false);
  });

  it('places the dependencies between known tasks, finding the one the plan breaks', () => {
    const model = buildModel(projectTasks);
    const links = placeDependencies(
      [
        ...projectDependencies,
        { id: 'unknown', from: 'nothing', to: 'qa' },
        { id: 'self', from: 'qa', to: 'qa' },
      ],
      model,
    );
    expect(links).toHaveLength(projectDependencies.length);
    expect(links.filter((link) => link.isViolated).map((link) => link.id)).toEqual([
      'requirements-wireframes',
    ]);
    expect(links.find((link) => link.id === 'visual-frontend')?.type).toBe('start-to-start');
  });

  it('finds the critical path with every dependency type', () => {
    const model = buildModel(projectTasks);
    const { taskIds, dependencyIds } = criticalPath(
      model,
      placeDependencies(projectDependencies, model),
    );
    expect([...taskIds].sort()).toEqual(['golive', 'integration', 'qa']);
    expect([...dependencyIds].sort()).toEqual(['integration-qa', 'qa-golive']);
  });

  it('leaves tasks in a dependency cycle off the critical path', () => {
    const model = buildModel([
      { id: 'a', label: 'A', start: 0, end: DAY },
      { id: 'b', label: 'B', start: DAY, end: 2 * DAY },
      { id: 'c', label: 'C', start: 0, end: 2 * DAY },
    ]);
    const links = placeDependencies(
      [
        { id: 'ab', from: 'a', to: 'b' },
        { id: 'ba', from: 'b', to: 'a' },
      ],
      model,
    );
    expect([...criticalPath(model, links).taskIds]).toEqual(['c']);
  });
});
