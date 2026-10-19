import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, ThumbsUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { Rating } from './Rating';
import { RatingDisplay } from './RatingDisplay';

const meta = {
  title: 'Inputs/Rating',
  component: Rating,
  args: { label: 'Rating', defaultValue: 3 },
} satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** `step={0.5}` takes half icons: press the left half of an icon, or step by halves with the arrow keys. */
export const HalfSteps: Story = {
  args: { label: 'Overall', step: 0.5, defaultValue: 3.5, description: 'Half stars allowed' },
};

/** Small, medium and large. Each icon is at least 24 px wide to point at, more on touch screens. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Rating label="Small" size="sm" defaultValue={2} />
      <Rating label="Medium" size="md" defaultValue={3} />
      <Rating label="Large" size="lg" defaultValue={4} />
    </div>
  ),
};

/** `tone` colours the filled icons; `warning` (gold) is the default. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Rating label="Warning" tone="warning" defaultValue={3} />
      <Rating label="Accent" tone="accent" defaultValue={3} />
      <Rating label="Success" tone="success" defaultValue={3} />
      <Rating label="Danger" tone="danger" defaultValue={3} />
      <Rating label="Neutral" tone="neutral" defaultValue={3} />
    </div>
  ),
};

/** Any icon component, drawn outlined when empty and filled in the tone; `maxValue` sets how many. */
export const CustomIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Rating label="Love it?" icon={Heart} tone="danger" defaultValue={4} />
      <Rating label="Helpful" icon={ThumbsUp} tone="accent" maxValue={3} defaultValue={2} />
      <Rating label="Energy" icon={Zap} tone="warning" maxValue={10} size="sm" defaultValue={7} />
    </div>
  ),
};

/** `isClearable`: choosing the current rating again, or Delete or Backspace, clears it. */
export const Clearable: Story = {
  tags: ['!visual'],
  args: {
    label: 'Your rating',
    isClearable: true,
    description: 'Choose the same star again to clear it',
  },
};

/**
 * `isReadOnly` keeps the slider in the tab order, announced as read-only, with the exact value filled. It still
 * submits with a form.
 */
export const ReadOnly: Story = {
  args: {
    label: 'Average from reviewers',
    isReadOnly: true,
    value: 3.7,
    description: '1,284 reviews',
  },
};

/** RatingDisplay: a cheap, unfocusable image named "3.7 out of 5", for tables, lists and summaries. */
export const Display: Story = {
  render: () => (
    <div className="flex flex-col gap-3 text-sm text-fg">
      <RatingDisplay value={3.7} />
      <RatingDisplay value={4.25} size="lg" />
      <RatingDisplay value={1.5} size="sm" tone="accent" />
      <RatingDisplay value={null} />
      <p>
        Rated <RatingDisplay value={4.6} size="sm" /> by 1,284 people
      </p>
    </div>
  ),
};

const products = [
  { name: 'Trail runner', rating: 4.6, reviews: 1284 },
  { name: 'Day pack', rating: 3.9, reviews: 312 },
  { name: 'Rain shell', rating: 4.2, reviews: 877 },
  { name: 'Camp stove', rating: 2.8, reviews: 96 },
];

/** RatingDisplay is one inline element, cheap to render in every row of a table or list. */
export const InTable: Story = {
  render: () => (
    <table className="w-full max-w-md text-start text-sm text-fg">
      <thead>
        <tr className="border-b border-border text-fg-muted">
          <th scope="col" className="py-2 text-start font-medium">
            Product
          </th>
          <th scope="col" className="py-2 text-start font-medium">
            Rating
          </th>
          <th scope="col" className="py-2 text-end font-medium">
            Reviews
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.name} className="border-b border-border">
            <td className="py-2">{product.name}</td>
            <td className="py-2">
              <RatingDisplay value={product.rating} size="sm" />
            </td>
            <td className="py-2 text-end tabular-nums">{product.reviews}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <Rating label="Required" isRequired description="Tell us how it went" />
      <Rating
        label="Invalid"
        isInvalid
        errorMessage="Choose at least 2 stars to continue"
        defaultValue={1}
      />
      <Rating label="Disabled" isDisabled defaultValue={3} />
      <Rating
        label="Side label"
        labelPosition="side"
        defaultValue={4}
        infoTip="1 is poor, 5 is great"
      />
    </div>
  ),
};

/** Controlled: the value lives in the app. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function Controlled() {
    const [value, setValue] = useState<number | null>(2.5);
    return (
      <div className="flex flex-col gap-2 text-sm text-fg">
        <Rating label="Service" step={0.5} isClearable value={value} onChange={setValue} />
        <span className="text-fg-muted">Value: {value ?? 'none'}</span>
      </div>
    );
  },
};
