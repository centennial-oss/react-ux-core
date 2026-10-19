import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Download, Save, Trash2 } from 'lucide-react';
import { Button, type ButtonTone, type ButtonVariant } from './Button';

const VARIANTS: ButtonVariant[] = ['solid', 'soft', 'outline', 'ghost', 'link'];
const TONES: ButtonTone[] = ['neutral', 'accent', 'success', 'warning', 'danger'];

const meta = {
  title: 'Actions/Button',
  component: Button,
  args: {
    children: 'Save changes',
    variant: 'solid',
    tone: 'accent',
    size: 'md',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    tone: { control: 'inline-radio', options: TONES },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    iconPosition: { control: 'inline-radio', options: ['start', 'end'] },
    icon: { control: false },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The interactive playground: change the props in the Controls panel. */
export const Playground: Story = { tags: ['!visual'] };

/** Every variant in every tone. */
export const VariantsAndTones: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          {TONES.map((tone) => (
            <Button key={tone} {...args} variant={variant} tone={tone}>
              {`${variant} ${tone}`}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} icon={Save}>
        Save
      </Button>
      <Button {...args} variant="outline" icon={Download}>
        Export
      </Button>
      <Button {...args} variant="ghost" icon={ArrowRight} iconPosition="end">
        Continue
      </Button>
      <Button {...args} variant="soft" tone="danger" icon={Trash2}>
        Delete
      </Button>
    </div>
  ),
};

/** Pending shows a spinner, keeps the button's width, sets aria-busy and ignores presses. */
export const Pending: Story = {
  args: { isPending: true, icon: Save },
};

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant} isDisabled>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

/** With `href`, Button renders a link through UIProvider's LinkComponent. */
export const AsLink: Story = {
  render: ({ tone, size }) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button tone={tone} size={size} href="#settings">
        Open settings
      </Button>
      <Button tone={tone} size={size} variant="link" href="#docs">
        Read the docs
      </Button>
    </div>
  ),
};

/** Buttons wrap rather than overflow at the narrowest phone width (360 px). */
export const NarrowContainer: Story = {
  globals: { viewport: { value: 'phone360' } },
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args} icon={Save}>
        Save changes
      </Button>
      <Button {...args} variant="outline" tone="neutral">
        Cancel
      </Button>
      <Button {...args} variant="soft" tone="danger" icon={Trash2}>
        Delete record
      </Button>
    </div>
  ),
};
