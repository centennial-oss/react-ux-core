import type { Meta, StoryObj } from '@storybook/react-vite';
import { Globe, MapPin, MessageSquare, Telescope } from 'lucide-react';
import { useState } from 'react';
import { people } from '../../../test/people';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { Switch } from '../Switch';
import { HoverCard } from './HoverCard';

const meta = {
  title: 'Overlays/HoverCard',
  component: HoverCard,
  args: { content: null, children: null },
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const ada = people[0];

/** A person card: who they are, where, and actions. Its links and buttons are reachable with Tab from the trigger. */
function PersonCard() {
  return (
    <div className="flex w-72 max-w-full flex-col gap-3 text-sm">
      <div className="flex items-start gap-3">
        <Avatar
          name={ada.name}
          src={ada.src}
          size="lg"
          presence={{ tone: 'success', label: 'Online' }}
        />
        <div className="min-w-0">
          <p className="font-semibold">{ada.name}</p>
          <p className="text-fg-muted">Lead analyst, Engines team</p>
          <p className="mt-1 flex items-center gap-1 text-fg-muted">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            London, 4:20 PM local time
          </p>
        </div>
      </div>
      <p>
        Writes the programs for the Analytical Engine and reviews changes to the Bernoulli tables.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" tone="accent" icon={MessageSquare}>
          Message
        </Button>
        <Button size="sm" variant="outline" href="#people/ada">
          View profile
        </Button>
      </div>
    </div>
  );
}

/**
 * Hover or focus a name or avatar for a moment, or long-press it on a touch screen. Pressing either still follows the
 * link. Anchored with an arrow on tablet and desktop; a bottom sheet on phones.
 */
export const UserCard: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="flex items-center gap-3 pb-64 text-sm">
      <HoverCard aria-label={ada.name} content={<PersonCard />} hasArrow>
        <Button href="#people/ada" variant="link" className="rounded-full">
          <Avatar name={ada.name} src={ada.src} size="sm" />
        </Button>
      </HoverCard>
      <p>
        Reviewed by{' '}
        <HoverCard aria-label={ada.name} content={<PersonCard />} hasArrow defaultOpen>
          <Button href="#people/ada" variant="link" tone="accent">
            {ada.name}
          </Button>
        </HoverCard>
      </p>
    </div>
  ),
};

/** A preview of the page a link leads to, so readers can decide before they leave this one. */
export const LinkPreview: Story = {
  tags: ['visual-page'],
  render: () => (
    <p className="max-w-prose pb-72 text-sm">
      The{' '}
      <HoverCard
        aria-label="First deep field from the Webb telescope"
        placement="bottom start"
        defaultOpen
        content={
          <div className="flex w-80 max-w-full flex-col gap-2">
            <div
              aria-hidden="true"
              className="flex h-24 items-center justify-center rounded-control bg-accent-bg text-accent-fg"
            >
              <Telescope className="size-10" />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Globe aria-hidden="true" className="size-3.5 shrink-0" />
              science.example.org
            </p>
            <p className="font-semibold">First deep field from the Webb telescope</p>
            <p className="text-fg-muted">
              Thousands of galaxies, some as they were 13 billion years ago, in the telescope&apos;s
              first full-colour image.
            </p>
          </div>
        }
      >
        <Button href="#webb" variant="link" tone="accent">
          first deep field
        </Button>
      </HoverCard>{' '}
      showed galaxies in more detail than any image before it.
    </p>
  ),
};

/** Controlled with `isOpen` and `onOpenChange`: the switch and the trigger open and close the same card. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function Render() {
    const [isOpen, setOpen] = useState(false);
    return (
      <div className="flex flex-col items-start gap-4 pb-64 text-sm">
        <Switch isSelected={isOpen} onChange={setOpen}>
          Show the card
        </Switch>
        <HoverCard
          aria-label={ada.name}
          content={<PersonCard />}
          hasArrow
          isOpen={isOpen}
          onOpenChange={setOpen}
        >
          <Button href="#people/ada" variant="link" tone="accent">
            {ada.name}
          </Button>
        </HoverCard>
      </div>
    );
  },
};

/** `delay` and `closeDelay` (600 and 200 ms by default). These open at once and close after a second. */
export const Delays: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex gap-4 pb-64 text-sm">
      <HoverCard
        aria-label={ada.name}
        content={<PersonCard />}
        delay={0}
        closeDelay={1000}
        hasArrow
      >
        <Button href="#people/ada" variant="link" tone="accent">
          {ada.name}
        </Button>
      </HoverCard>
    </div>
  ),
};
