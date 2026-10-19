import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChartLine, Pencil, Share2 } from 'lucide-react';
import { WidgetFrame } from './WidgetFrame';

const meta = {
  title: 'Dashboard/WidgetFrame',
  component: WidgetFrame,
  args: { title: 'Requests', icon: ChartLine },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-64 max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WidgetFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = <p className="p-3 text-sm text-fg-muted">Widget content</p>;

/** A titled region with one action menu: the standard actions, the widget type's and the host's. */
export const Default: Story = {
  args: {
    children: body,
    updatedAt: new Date(Date.UTC(2026, 9, 18, 9, 30)),
    actions: [
      { id: 'refresh', label: 'Refresh', onAction: () => undefined },
      { id: 'share', label: 'Share', icon: Share2, onAction: () => undefined },
    ],
  },
};

/** Reloading in the background: the data stays, with a subtle indicator (WID-09). */
export const Refreshing: Story = {
  args: { children: body, isRefreshing: true },
};

/** A refresh failed: the earlier data stays, and the indicator retries (DATA-09). */
export const RefreshFailed: Story = {
  args: { children: body, onRefreshErrorRetry: () => undefined },
};

/** Edit mode: the body ignores the pointer, and the lock and setup status show (WID-10, EDIT-21). */
export const Editing: Story = {
  args: {
    children: body,
    mode: 'edit',
    isLocked: true,
    hasSetupIssue: true,
    onConfigure: () => undefined,
    actions: [{ id: 'configure', label: 'Configure', icon: Pencil, onAction: () => undefined }],
  },
};

/** Accented while the consolidated legend highlights a series it shows (CTX-12), with its own time range. */
export const Highlighted: Story = {
  args: { children: body, isHighlighted: true, titleNote: 'Uses its own time range: Last 7 days' },
};

/** The title kept for screen readers only; the region is still named by it (WID-07). */
export const HiddenTitle: Story = {
  args: {
    children: body,
    isTitleHidden: true,
    actions: [{ id: 'a', label: 'Refresh', onAction: () => undefined }],
  },
};
