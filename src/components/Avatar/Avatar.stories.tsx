import type { Meta, StoryObj } from '@storybook/react-vite';
import { brokenPicture, people } from '../../../test/people';
import { Avatar } from './Avatar';
import { AvatarGroup } from './AvatarGroup';
import type { AvatarColor } from './avatarColors';

const meta = {
  title: 'Display/Avatar',
  component: Avatar,
  args: { name: 'Ada Lovelace' },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

const ada = people[0];

/** Initials on a colour picked from the name, or a picture. A picture that fails to load falls back to initials. */
export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Avatar name="Grace Hopper" />
      <Avatar name={ada.name} src={ada.src} />
      <Avatar name="Alan Turing" src={brokenPicture} />
      <Avatar name="Vera Rubin" initials="VR" shape="square" />
    </div>
  ),
};

/** Five sizes, from 24 to 64 px, in both shapes. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(['circle', 'square'] as const).map((shape) => (
        <div key={shape} className="flex flex-wrap items-end gap-3">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Avatar key={size} name="Katherine Johnson" size={size} shape={shape} />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** A presence dot in StatusDot's tones and shapes; its label joins the avatar's name ("Ada Lovelace, Online"). */
export const Presence: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-4">
      <Avatar name={ada.name} src={ada.src} presence={{ tone: 'success', label: 'Online' }} />
      <Avatar name="Grace Hopper" presence={{ tone: 'warning', label: 'Away' }} size="lg" />
      <Avatar
        name="Alan Turing"
        presence={{ tone: 'danger', label: 'Do not disturb' }}
        size="xl"
        shape="square"
      />
      <Avatar name="Carl Sagan" presence={{ tone: 'neutral', label: 'Offline' }} size="sm" />
    </div>
  ),
};

const colors: AvatarColor[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
  'chart-9',
  'chart-10',
  'accent',
  'success',
  'warning',
  'danger',
  'neutral',
];

/** Every colour: the chart palette as tints under the text colour, and the tones' soft pairs. */
export const Colors: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <Avatar
          key={color}
          name={color}
          initials={color.startsWith('chart-') ? color.slice(6) : color.slice(0, 2).toUpperCase()}
          color={color}
        />
      ))}
    </div>
  ),
};

/** Overlapping avatars ending with "+N", which opens a list of the others. The group is named "8 people". */
export const Group: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <AvatarGroup
        people={people.map((person, index) => ({
          ...person,
          presence: index === 0 ? { tone: 'success', label: 'Online' } : undefined,
        }))}
      />
      <AvatarGroup people={people} max={3} size="md" />
      <AvatarGroup people={people.slice(0, 3)} size="lg" />
    </div>
  ),
};
