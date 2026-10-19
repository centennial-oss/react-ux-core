import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bell,
  Bold,
  Italic,
  Mic,
  Pin,
  Star,
  Underline,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import type { Key } from 'react-aria-components';
import { ToggleButton, ToggleButtonGroup } from './ToggleButton';

const meta = {
  title: 'Actions/ToggleButton',
  component: ToggleButton,
  args: { children: 'Pin', icon: Pin },
} satisfies Meta<typeof ToggleButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Off and on. Pressing flips it (`aria-pressed`); unpressed it's neutral, pressed it's the solid fill of its tone. */
export const Basic: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleButton icon={Pin}>Pin</ToggleButton>
      <ToggleButton icon={Pin} defaultSelected>
        Pinned
      </ToggleButton>
      <ToggleButton icon={Star} variant="outline">
        Favourite
      </ToggleButton>
      <ToggleButton icon={Star} variant="outline" tone="warning" defaultSelected>
        Favourite
      </ToggleButton>
    </div>
  ),
};

/** `ghost` (the default), `outline` and `soft`, off and on. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      {(['ghost', 'outline', 'soft'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          <ToggleButton variant={variant} icon={Bell}>
            {`Notify (${variant})`}
          </ToggleButton>
          <ToggleButton variant={variant} icon={Bell} defaultSelected>
            {`Notify (${variant})`}
          </ToggleButton>
        </div>
      ))}
    </div>
  ),
};

/** The pressed state takes the button tones. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {(['neutral', 'accent', 'success', 'warning', 'danger'] as const).map((tone) => (
        <ToggleButton key={tone} tone={tone} variant="outline" defaultSelected>
          {tone}
        </ToggleButton>
      ))}
    </div>
  ),
};

/** Button sizes, with text and icon-only (square, with the label as its name and tooltip). */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          <ToggleButton size={size} icon={Mic} variant="outline">
            {`Mute (${size})`}
          </ToggleButton>
          <ToggleButton size={size} icon={VolumeX} isIconOnly variant="outline" defaultSelected>
            Mute
          </ToggleButton>
        </div>
      ))}
    </div>
  ),
};

/**
 * A single choice that can be cleared (press the pressed one again): radios that arrow keys move between without
 * choosing. For a choice that always has an answer, Pillbox is the better fit.
 */
export const SingleSelection: Story = {
  render: () => (
    <ToggleButtonGroup aria-label="Alignment" defaultSelectedKeys={['left']}>
      <ToggleButton id="left" icon={AlignLeft} isIconOnly>
        Align left
      </ToggleButton>
      <ToggleButton id="center" icon={AlignCenter} isIconOnly>
        Align centre
      </ToggleButton>
      <ToggleButton id="right" icon={AlignRight} isIconOnly>
        Align right
      </ToggleButton>
      <ToggleButton id="justify" icon={AlignJustify} isIconOnly>
        Justify
      </ToggleButton>
    </ToggleButtonGroup>
  ),
};

/** Several on at once. */
export const MultipleSelection: Story = {
  render: () => (
    <ToggleButtonGroup
      aria-label="Text style"
      selectionMode="multiple"
      defaultSelectedKeys={['bold', 'underline']}
    >
      <ToggleButton id="bold" icon={Bold} isIconOnly>
        Bold
      </ToggleButton>
      <ToggleButton id="italic" icon={Italic} isIconOnly>
        Italic
      </ToggleButton>
      <ToggleButton id="underline" icon={Underline} isIconOnly>
        Underline
      </ToggleButton>
    </ToggleButtonGroup>
  ),
};

/** `isAttached` joins the buttons into one bordered strip; `size`, `tone` and `variant` apply to every button. */
export const Attached: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <ToggleButtonGroup
        aria-label="Period"
        isAttached
        size="sm"
        tone="accent"
        defaultSelectedKeys={['week']}
        disallowEmptySelection
      >
        <ToggleButton id="day">Day</ToggleButton>
        <ToggleButton id="week">Week</ToggleButton>
        <ToggleButton id="month">Month</ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup
        aria-label="Text style"
        selectionMode="multiple"
        isAttached
        defaultSelectedKeys={['italic']}
      >
        <ToggleButton id="bold" icon={Bold} isIconOnly>
          Bold
        </ToggleButton>
        <ToggleButton id="italic" icon={Italic} isIconOnly>
          Italic
        </ToggleButton>
        <ToggleButton id="underline" icon={Underline} isIconOnly>
          Underline
        </ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup
        aria-label="Alignment"
        orientation="vertical"
        isAttached
        defaultSelectedKeys={['left']}
      >
        <ToggleButton id="left" icon={AlignLeft}>
          Left
        </ToggleButton>
        <ToggleButton id="center" icon={AlignCenter}>
          Centre
        </ToggleButton>
        <ToggleButton id="right" icon={AlignRight}>
          Right
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  ),
};

/** A disabled button, and a disabled group. */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <ToggleButton icon={Pin} variant="outline" isDisabled>
        Pin
      </ToggleButton>
      <ToggleButtonGroup aria-label="Alignment" isDisabled defaultSelectedKeys={['left']}>
        <ToggleButton id="left" icon={AlignLeft} isIconOnly>
          Align left
        </ToggleButton>
        <ToggleButton id="center" icon={AlignCenter} isIconOnly>
          Align centre
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  ),
};

/** Controlled: `isSelected` / `onChange` on a button, `selectedKeys` / `onSelectionChange` on a group. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [isMuted, setMuted] = useState(false);
    const [styles, setStyles] = useState<Set<Key>>(new Set(['bold']));
    return (
      <div className="flex flex-col items-start gap-3">
        <ToggleButton icon={VolumeX} variant="outline" isSelected={isMuted} onChange={setMuted}>
          Mute
        </ToggleButton>
        <ToggleButtonGroup
          aria-label="Text style"
          selectionMode="multiple"
          selectedKeys={styles}
          onSelectionChange={setStyles}
        >
          <ToggleButton id="bold" icon={Bold} isIconOnly>
            Bold
          </ToggleButton>
          <ToggleButton id="italic" icon={Italic} isIconOnly>
            Italic
          </ToggleButton>
        </ToggleButtonGroup>
        <p className="text-sm text-fg-muted">
          {`${isMuted ? 'Muted' : 'Sound on'}; styles: ${[...styles].join(', ') || 'none'}`}
        </p>
      </div>
    );
  },
};
