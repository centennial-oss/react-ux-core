import type { Meta, StoryObj } from '@storybook/react-vite';
import { safeChanges, sampleChanges } from '../../test/diff';
import { PlanReview } from './PlanReview';

const meta = {
  title: 'Diff/PlanReview',
  component: PlanReview,
  args: {
    changes: sampleChanges,
    onApply: () => undefined,
  },
} satisfies Meta<typeof PlanReview>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A 40-change plan with two replacements and three destroys, stressed in the summary. Filter by action or type;
 * each change expands to a structural diff. Applying asks for the typed word "apply".
 */
export const Default: Story = {
  args: {
    warnings: [
      'database_instance.catalog will be unavailable for about 10 minutes while it is replaced.',
    ],
  },
};

/** The replacements expanded: the attributes that force each one, and unknown values "(known after apply)". */
export const Replacements: Story = {
  args: {
    changes: sampleChanges.filter((change) => change.action === 'replace'),
    defaultExpandedIds: ['replace-archive', 'replace-db'],
  },
};

/** A sensitive change: values are masked until revealed, and a changed one shows as changed. */
export const SensitiveValues: Story = {
  args: {
    changes: sampleChanges.filter((change) => change.isSensitive === true),
    defaultExpandedIds: ['update-db-password'],
  },
};

/** Nothing destroyed or replaced: Apply still confirms, without a typed word. */
export const NonDestructive: Story = {
  args: { changes: safeChanges, title: 'Website changes' },
};

/** Several planner warnings. */
export const Warnings: Story = {
  args: {
    changes: safeChanges,
    warnings: [
      'dns_record.www: a TTL under 600 seconds increases query volume.',
      'storage_bucket.images: versioning is on, so deleted objects keep using storage.',
    ],
  },
};

/** A plan with no changes. */
export const NoChanges: Story = {
  args: { changes: [] },
};
