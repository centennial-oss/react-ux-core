/** Tree's strings for reordering and row toggles (the rest of Tree has no text of its own). */
export interface TreeMessages {
  /** The name of a row's drag handle. */
  treeDragNode: (params: { item: string }) => string;
  /** Announced after a node moves into another node. `position` counts from 1. */
  treeMovedInto: (params: { item: string; parent: string; position: number }) => string;
  /** Announced after a node moves to the top level. `position` counts from 1. */
  treeMovedToTop: (params: { item: string; position: number }) => string;
  /** The name of a row toggle, such as "Visible, Header". */
  treeRowToggle: (params: { toggle: string; item: string }) => string;
}

export const defaultTreeMessages: TreeMessages = {
  treeDragNode: ({ item }) => `Drag ${item}`,
  treeMovedInto: ({ item, parent, position }) =>
    `Moved ${item} into ${parent}, position ${String(position)}`,
  treeMovedToTop: ({ item, position }) =>
    `Moved ${item} to the top level, position ${String(position)}`,
  treeRowToggle: ({ toggle, item }) => `${toggle}, ${item}`,
};
