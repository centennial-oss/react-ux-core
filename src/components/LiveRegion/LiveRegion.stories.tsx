import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../Button/Button';
import { Inline } from '../Layout/Layout';
import { LiveRegion, useAnnouncer } from './LiveRegion';

const meta = {
  title: 'Display/LiveRegion',
  component: LiveRegion,
  // Nothing visible changes: the announcements are for screen readers.
  tags: ['!visual'],
} satisfies Meta<typeof LiveRegion>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Announces state text as it changes: each press is read out by screen readers ("3 items in the cart"). */
export const StateText: Story = {
  render: () => {
    const [count, setCount] = useState(0);
    return (
      <>
        <Button
          onPress={() => {
            setCount(count + 1);
          }}
        >
          Add to cart
        </Button>
        <LiveRegion>{count === 0 ? '' : `${String(count)} items in the cart`}</LiveRegion>
      </>
    );
  },
};

/** `useAnnouncer` announces what an action did, assertively for failures; the same text twice is read twice. */
export const Announcer: Story = {
  render: () => {
    const polite = useAnnouncer();
    const assertive = useAnnouncer();
    return (
      <Inline>
        <Button
          onPress={() => {
            polite.announce('Row added');
          }}
        >
          Add row
        </Button>
        <Button
          variant="outline"
          tone="danger"
          onPress={() => {
            assertive.announce('Couldn’t save the row');
          }}
        >
          Fail to save
        </Button>
        <LiveRegion ref={polite.ref} />
        <LiveRegion ref={assertive.ref} politeness="assertive" />
      </Inline>
    );
  },
};
