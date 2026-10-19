/** SplitView's strings. */
export interface SplitViewMessages {
  /** The name of the handle after a pane, which resizes it. */
  splitViewResize: (params: { pane: string }) => string;
  /** A pane's name when `paneLabels` doesn't give one. `position` counts from 1. */
  splitViewPane: (params: { position: number }) => string;
  /** The drawer's title for the secondary pane on narrow screens, when `paneLabels` doesn't name it. */
  splitViewDetails: string;
}

export const defaultSplitViewMessages: SplitViewMessages = {
  splitViewResize: ({ pane }) => `Resize ${pane}`,
  splitViewPane: ({ position }) => `Pane ${String(position)}`,
  splitViewDetails: 'Details',
};
