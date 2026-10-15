import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bold, Italic, Minus, Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from './IconButton';

const meta = {
  title: 'Actions/IconButton',
  component: IconButton,
  args: { icon: Settings, 'aria-label': 'Settings', variant: 'ghost', tone: 'neutral', size: 'md' },
  argTypes: { icon: { control: false } },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const VariantsAndSizes: Story = {
  render: () => (
    <div className="grid gap-3">
      {(['ghost', 'soft', 'outline', 'solid'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <IconButton
              key={size}
              icon={Settings}
              aria-label={`Settings ${size}`}
              variant={variant}
              size={size}
            />
          ))}
          <IconButton icon={Trash2} aria-label="Delete" variant={variant} tone="danger" />
          <IconButton icon={Plus} aria-label="Add" variant={variant} tone="accent" />
          <IconButton icon={Plus} aria-label="Add (disabled)" variant={variant} isDisabled />
        </div>
      ))}
    </div>
  ),
};

/** `isSelected` makes a toggle button (aria-pressed). */
export const Toggle: Story = {
  render: () => (
    <div className="flex gap-1">
      <IconButton icon={Bold} aria-label="Bold" defaultSelected />
      <IconButton icon={Italic} aria-label="Italic" defaultSelected={false} variant="outline" />
    </div>
  ),
};

/** Hold a button (mouse, touch, or Space/Enter) to repeat. */
export const PressAndHold: Story = {
  tags: ['!visual'],
  render: function PressAndHoldStory() {
    const [value, setValue] = useState(10);
    return (
      <div className="flex items-center gap-2 text-fg">
        <IconButton
          icon={Minus}
          aria-label="Decrease"
          variant="outline"
          onRepeat={() => {
            setValue((v) => v - 1);
          }}
        />
        <output className="w-12 text-center tabular-nums" aria-live="polite">
          {value}
        </output>
        <IconButton
          icon={Plus}
          aria-label="Increase"
          variant="outline"
          onRepeat={() => {
            setValue((v) => v + 1);
          }}
        />
      </div>
    );
  },
};

export const Pending: Story = { args: { isPending: true, variant: 'soft' } };
