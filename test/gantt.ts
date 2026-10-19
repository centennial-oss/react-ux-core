// A website relaunch plan for GanttChart stories and tests (October–November 2026, UTC): four phases of tasks and
// milestones with every dependency type, one dependency the dates break (Wireframes start before Requirements
// finish) and one locked task. Plus a generator of thousands of tasks. Deterministic, with a frozen "now".
import type { GanttDependency, GanttTask } from '../src/components/GanttChart';

const DAY = 86_400_000;
const day = (month: number, date: number) => Date.UTC(2026, month - 1, date);

/** "Now" for stories and tests: Wednesday 14 October 2026, 10:00 UTC. */
export const PROJECT_NOW = Date.UTC(2026, 9, 14, 10);

export const projectTasks: GanttTask[] = [
  { id: 'discovery', label: 'Discovery', start: day(10, 5), end: day(10, 15) },
  {
    id: 'kickoff',
    parentId: 'discovery',
    label: 'Kickoff',
    start: day(10, 5),
    end: day(10, 5),
    isMilestone: true,
  },
  {
    id: 'interviews',
    parentId: 'discovery',
    label: 'Stakeholder interviews',
    start: day(10, 5),
    end: day(10, 10),
    progress: 100,
  },
  {
    id: 'requirements',
    parentId: 'discovery',
    label: 'Requirements',
    start: day(10, 7),
    end: day(10, 15),
    progress: 80,
    detail: 'Signed off by the steering group.',
  },
  { id: 'design', label: 'Design', start: day(10, 12), end: day(10, 30) },
  {
    id: 'wireframes',
    parentId: 'design',
    label: 'Wireframes',
    start: day(10, 12),
    end: day(10, 17),
    progress: 60,
  },
  {
    id: 'visual',
    parentId: 'design',
    label: 'Visual design',
    start: day(10, 19),
    end: day(10, 29),
    progress: 20,
    tone: 'success',
  },
  {
    id: 'review',
    parentId: 'design',
    label: 'Design review',
    start: day(10, 29),
    end: day(10, 29),
    isMilestone: true,
  },
  { id: 'build', label: 'Build', start: day(10, 19), end: day(11, 19) },
  {
    id: 'frontend',
    parentId: 'build',
    label: 'Front end',
    start: day(10, 26),
    end: day(11, 14),
  },
  {
    id: 'api',
    parentId: 'build',
    label: 'API',
    start: day(10, 19),
    end: day(11, 7),
    progress: 10,
  },
  {
    id: 'content',
    parentId: 'build',
    label: 'Content migration',
    start: day(11, 2),
    end: day(11, 14),
    isLocked: true,
    tone: 'warning',
  },
  {
    id: 'integration',
    parentId: 'build',
    label: 'Integration',
    start: day(11, 9),
    end: day(11, 19),
  },
  { id: 'launch', label: 'Launch', start: day(11, 16), end: day(11, 26) },
  { id: 'qa', parentId: 'launch', label: 'QA', start: day(11, 19), end: day(11, 25) },
  {
    id: 'training',
    parentId: 'launch',
    label: 'Training',
    start: day(11, 16),
    end: day(11, 19),
  },
  {
    id: 'golive',
    parentId: 'launch',
    label: 'Go live',
    start: day(11, 25),
    end: day(11, 25),
    isMilestone: true,
  },
];

export const projectDependencies: GanttDependency[] = [
  { id: 'kickoff-interviews', from: 'kickoff', to: 'interviews' },
  { id: 'interviews-requirements', from: 'interviews', to: 'requirements', type: 'start-to-start' },
  // Broken: Wireframes start on the 12th, Requirements finish on the 14th.
  { id: 'requirements-wireframes', from: 'requirements', to: 'wireframes' },
  { id: 'wireframes-visual', from: 'wireframes', to: 'visual' },
  { id: 'visual-review', from: 'visual', to: 'review' },
  { id: 'visual-frontend', from: 'visual', to: 'frontend', type: 'start-to-start' },
  { id: 'requirements-api', from: 'requirements', to: 'api' },
  { id: 'api-integration', from: 'api', to: 'integration' },
  { id: 'frontend-integration', from: 'frontend', to: 'integration', type: 'finish-to-finish' },
  { id: 'integration-qa', from: 'integration', to: 'qa' },
  { id: 'training-qa', from: 'training', to: 'qa', type: 'start-to-finish' },
  { id: 'qa-golive', from: 'qa', to: 'golive' },
];

/**
 * `count` tasks in phases of ten (a summary and nine tasks, each starting when the one before finishes), over
 * about a year from 5 October 2026, with a finish-to-start dependency between neighbours.
 */
export function manyTasks(count: number): { tasks: GanttTask[]; dependencies: GanttDependency[] } {
  const tasks: GanttTask[] = [];
  const dependencies: GanttDependency[] = [];
  const start = day(10, 5);
  for (let index = 0; tasks.length < count; index += 1) {
    const phase = `phase-${String(index)}`;
    const phaseStart = start + (index % 36) * 10 * DAY;
    tasks.push({
      id: phase,
      label: `Phase ${String(index + 1)}`,
      start: phaseStart,
      end: phaseStart + 9 * DAY,
    });
    for (let step = 0; step < 9 && tasks.length < count; step += 1) {
      const id = `${phase}-${String(step)}`;
      tasks.push({
        id,
        parentId: phase,
        label: `Task ${String(index + 1)}.${String(step + 1)}`,
        start: phaseStart + step * DAY,
        end: phaseStart + (step + 1) * DAY,
        progress: (step * 11) % 100,
      });
      if (step > 0) {
        dependencies.push({ id: `${id}-link`, from: `${phase}-${String(step - 1)}`, to: id });
      }
    }
  }
  return { tasks, dependencies };
}
