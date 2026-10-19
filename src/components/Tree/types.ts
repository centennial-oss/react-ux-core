import type { ReactNode } from 'react';
import type { IconComponent } from '../../utils/icon';
import type { Tone } from '../../utils/types';

/** What every node has, at any level. */
interface TreeNodeBase<T> {
  /** Unique across the whole tree. */
  id: string;
  /** Plain text: the row's label, and what typeahead matches. */
  label: string;
  icon?: IconComponent;
  /** The icon's colour. Defaults to `neutral` (muted). */
  tone?: Tone;
  /** Shown at the end of the row, for example a count or a "new" marker. */
  badge?: ReactNode;
  isDisabled?: boolean;
  /** The app's own data for the node, handed back on selection. */
  data?: T;
}

// The tree is at most five levels deep (counting category headings): each level's children are the next level, and
// the fifth has none.
export type TreeNodeLevel5<T = unknown> = TreeNodeBase<T> & { children?: never };
export type TreeNodeLevel4<T = unknown> = TreeNodeBase<T> & {
  children?: readonly TreeNodeLevel5<T>[];
};
export type TreeNodeLevel3<T = unknown> = TreeNodeBase<T> & {
  children?: readonly TreeNodeLevel4<T>[];
};
export type TreeNodeLevel2<T = unknown> = TreeNodeBase<T> & {
  children?: readonly TreeNodeLevel3<T>[];
};

/** A top-level node: a category heading (with `hasCategories`) or an item. Nodes nest up to five levels in all. */
export type TreeNode<T = unknown> = TreeNodeBase<T> & { children?: readonly TreeNodeLevel2<T>[] };

/** A node at any level. */
export type AnyTreeNode<T = unknown> =
  TreeNode<T> | TreeNodeLevel2<T> | TreeNodeLevel3<T> | TreeNodeLevel4<T> | TreeNodeLevel5<T>;

/** The most levels a tree shows, counting category headings. */
export const MAX_TREE_DEPTH = 5;
