// OrgChart's model, apart from drawing: who reports to whom (built once per `people`), who is shown for a set of
// expanded people, where the arrow keys go, and who a search finds. Pure, so it's unit-tested on its own. People are
// numbers here (their index in `people`), which keeps a 5,000-person org in a few typed arrays.
import { indexTree } from '../treeLayout';
import type { OrgPerson } from './types';

export interface OrgTree<P extends OrgPerson = OrgPerson> {
  people: readonly P[];
  /** Each id's index in `people` (the first, when an id repeats). */
  index: ReadonlyMap<string, number>;
  /** Each person's manager's index: -1 at the top, -2 for a repeated id (never shown). */
  manager: Int32Array;
  depth: Int32Array;
  /** Each person's reports in reading order: assistants first, then the rest, each in input order. */
  reports: readonly (readonly number[])[];
  /** Hangs beside their manager's line: marked as an assistant, with no reports of their own. */
  isAssistant: Uint8Array;
  /** The people at the top. */
  roots: readonly number[];
  /** Everyone in reading order, each person before their reports. */
  preorder: Int32Array;
  /** Everyone under each person, at any depth. */
  total: Int32Array;
  /** Each person's position among their manager's reports (or among the people at the top). */
  position: Int32Array;
}

const NONE: readonly number[] = [];

/** Indexes `people` by their managers. */
export function buildOrgTree<P extends OrgPerson>(people: readonly P[]): OrgTree<P> {
  const base = indexTree(
    people,
    (person) => person.id,
    (person) => person.managerId,
  );
  const count = people.length;
  const isAssistant = new Uint8Array(count);
  const reports: (readonly number[])[] = new Array<readonly number[]>(count).fill(NONE);
  const position = new Int32Array(count);
  for (const node of base.preorder) {
    const kids = base.children[node] ?? NONE;
    if (kids.length === 0) {
      continue;
    }
    const assistants: number[] = [];
    const rest: number[] = [];
    for (const kid of kids) {
      const hangs = people[kid]?.isAssistant === true && (base.children[kid]?.length ?? 0) === 0;
      isAssistant[kid] = hangs ? 1 : 0;
      (hangs ? assistants : rest).push(kid);
    }
    const ordered = assistants.length > 0 ? [...assistants, ...rest] : kids;
    ordered.forEach((kid, at) => {
      position[kid] = at;
    });
    reports[node] = ordered;
  }
  base.roots.forEach((root, at) => {
    position[root] = at;
  });
  // Reading order follows the reports' order, so it's rebuilt rather than taken from the index.
  const preorder = new Int32Array(base.preorder.length);
  const stack = [...base.roots].reverse();
  let cursor = 0;
  while (stack.length > 0) {
    const node = stack.pop() ?? 0;
    preorder[cursor++] = node;
    const kids = reports[node] ?? NONE;
    for (let at = kids.length - 1; at >= 0; at--) {
      stack.push(kids[at] ?? 0);
    }
  }
  const total = new Int32Array(count);
  for (let at = preorder.length - 1; at >= 0; at--) {
    const node = preorder[at] ?? 0;
    const manager = base.parent[node] ?? -1;
    if (manager >= 0) {
      total[manager] = (total[manager] ?? 0) + 1 + (total[node] ?? 0);
    }
  }
  return {
    people,
    index: base.index,
    manager: base.parent,
    depth: base.depth,
    reports,
    isAssistant,
    roots: base.roots,
    preorder,
    total,
    position,
  };
}

/** Who is shown, in reading order, and each person's place in that order (-1 when hidden). */
export interface OrgView {
  order: Int32Array;
  placeOf: Int32Array;
}

/** The people shown when `expanded` people have their reports shown: the people at the top, and down from there. */
export function visiblePeople(tree: OrgTree, expanded: ReadonlySet<string>): OrgView {
  const placeOf = new Int32Array(tree.people.length).fill(-1);
  const order: number[] = [];
  const stack = [...tree.roots].reverse();
  while (stack.length > 0) {
    const node = stack.pop() ?? 0;
    placeOf[node] = order.length;
    order.push(node);
    const kids = tree.reports[node] ?? NONE;
    if (kids.length > 0 && expanded.has(tree.people[node]?.id ?? '')) {
      for (let at = kids.length - 1; at >= 0; at--) {
        stack.push(kids[at] ?? 0);
      }
    }
  }
  return { order: Int32Array.from(order), placeOf };
}

/** The ids of everyone above `depth` who has reports: what OrgChart expands when it isn't told what to. */
export function expandedToDepth(tree: OrgTree, depth: number): Set<string> {
  const ids = new Set<string>();
  for (const node of tree.preorder) {
    if ((tree.depth[node] ?? 0) < depth && (tree.reports[node]?.length ?? 0) > 0) {
      ids.add(tree.people[node]?.id ?? '');
    }
  }
  return ids;
}

/** A person's managers, nearest first. */
export function managersOf(tree: OrgTree, node: number): number[] {
  const result: number[] = [];
  for (
    let manager = tree.manager[node] ?? -1;
    manager >= 0;
    manager = tree.manager[manager] ?? -1
  ) {
    result.push(manager);
  }
  return result;
}

/** The nearest shown person at or above `node`, or -1 when `node` isn't in the chart. */
export function shownOrAbove(tree: OrgTree, view: OrgView, node: number): number {
  let current = node;
  while (current >= 0 && (view.placeOf[current] ?? -1) < 0) {
    current = tree.manager[current] ?? -1;
  }
  return current;
}

/**
 * A key's move in the chart's terms: `forward` toward reports, `backward` toward the manager, `next` and `previous`
 * along the level, `first` and `last` in reading order.
 */
export type OrgStep = 'forward' | 'backward' | 'next' | 'previous' | 'first' | 'last';

/** What a step does: focus someone, or show or hide someone's reports. */
export type OrgMove =
  | { kind: 'focus'; node: number }
  | { kind: 'expand'; node: number }
  | { kind: 'collapse'; node: number };

/**
 * Where a step goes from `from`, as in a tree view: `forward` shows a person's reports, then moves to the first;
 * `backward` hides them, then moves to the manager; `next` and `previous` move to the neighbouring shown person at the
 * same depth. Null when there's nowhere to go.
 */
export function orgMove(
  tree: OrgTree,
  view: OrgView,
  expanded: ReadonlySet<string>,
  from: number,
  step: OrgStep,
): OrgMove | null {
  const hasReports = (tree.reports[from]?.length ?? 0) > 0;
  const isExpanded = hasReports && expanded.has(tree.people[from]?.id ?? '');
  switch (step) {
    case 'forward': {
      if (!hasReports) {
        return null;
      }
      return isExpanded
        ? { kind: 'focus', node: tree.reports[from]?.[0] ?? from }
        : { kind: 'expand', node: from };
    }
    case 'backward': {
      if (isExpanded) {
        return { kind: 'collapse', node: from };
      }
      const manager = tree.manager[from] ?? -1;
      return manager >= 0 ? { kind: 'focus', node: manager } : null;
    }
    case 'next':
    case 'previous': {
      const depth = tree.depth[from] ?? 0;
      const delta = step === 'next' ? 1 : -1;
      for (
        let place = (view.placeOf[from] ?? 0) + delta;
        place >= 0 && place < view.order.length;
        place += delta
      ) {
        const node = view.order[place] ?? 0;
        if ((tree.depth[node] ?? 0) === depth) {
          return { kind: 'focus', node };
        }
      }
      return null;
    }
    case 'first':
    case 'last': {
      const node = view.order[step === 'first' ? 0 : view.order.length - 1];
      return node === undefined || node === from ? null : { kind: 'focus', node };
    }
  }
}

/** Each person's name and title in lower case, for searching. */
export function searchTexts(people: readonly OrgPerson[]): string[] {
  return people.map((person) => `${person.name}\n${person.title ?? ''}`.toLocaleLowerCase());
}

/** Everyone whose name or title contains `query` (ignoring case), in reading order. */
export function searchPeople(tree: OrgTree, texts: readonly string[], query: string): number[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') {
    return [];
  }
  const found: number[] = [];
  for (const node of tree.preorder) {
    if (texts[node]?.includes(needle)) {
      found.push(node);
    }
  }
  return found;
}
