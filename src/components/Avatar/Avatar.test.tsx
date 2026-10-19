import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { brokenPicture, people } from '../../../test/people';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { UserMenu } from '../../shell/UserMenu';
import { Avatar } from './Avatar';
import { AvatarGroup } from './AvatarGroup';
import { avatarColorFor } from './avatarColors';
import type { AvatarMessages } from './messages';

const hasTouch = navigator.maxTouchPoints > 0;
const ada = people[0];

describe('Avatar', () => {
  it('is an image named by the name, showing initials on a colour from the name', () => {
    render(<Avatar name="Grace Hopper" />);
    const avatar = screen.getByRole('img', { name: 'Grace Hopper' });
    expect(avatar.querySelector('[data-initials="GH"]')).not.toBeNull();
    // The same name always gets the same colour.
    expect(avatarColorFor('Grace Hopper')).toBe(avatarColorFor(' grace hopper '));
    expect(avatar.innerHTML).toContain(`--color-${avatarColorFor('Grace Hopper')}`);
  });

  it('shows the picture, and falls back to initials when it fails to load', async () => {
    const { rerender } = render(<Avatar name={ada.name} src={ada.src} />);
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' });
    await expect.poll(() => avatar.querySelector('img')?.complete).toBe(true);
    expect(avatar.querySelector('img')?.naturalWidth).toBeGreaterThan(0);
    rerender(<Avatar name={ada.name} src={brokenPicture} />);
    await expect.poll(() => avatar.querySelector('[data-initials="AL"]')).not.toBeNull();
    expect(avatar.querySelector('img')).toBeNull();
  });

  it('adds the presence to its name and takes an explicit colour and initials', () => {
    render(
      <Avatar
        name="Alan Turing"
        initials="AMT"
        color="accent"
        presence={{ tone: 'success', label: 'Online' }}
      />,
    );
    const avatar = screen.getByRole('img', { name: 'Alan Turing, Online' });
    expect(avatar.querySelector('[data-initials="AMT"]')).not.toBeNull();
    expect(avatar.querySelector('.bg-accent-bg')).not.toBeNull();
  });

  it('has five sizes', () => {
    render(
      <div>
        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
          <Avatar key={size} name={size} size={size} />
        ))}
      </div>,
    );
    const widths = ['xs', 'sm', 'md', 'lg', 'xl'].map(
      (size) => screen.getByRole('img', { name: size }).getBoundingClientRect().width,
    );
    expect(widths).toEqual([24, 32, 36, 48, 64]);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="flex gap-2 p-2">
        <Avatar name="Grace Hopper" />
        <Avatar name={ada.name} src={ada.src} presence={{ tone: 'warning', label: 'Away' }} />
        <Avatar name="Vera Rubin" shape="square" size="xl" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('AvatarGroup', () => {
  it('is a group named by its size, showing max avatars then "+N"', () => {
    render(<AvatarGroup people={people} max={3} />);
    const group = screen.getByRole('group', { name: '8 people' });
    expect(
      within(group)
        .getAllByRole('img')
        .map((avatar) => avatar.getAttribute('aria-label')),
    ).toEqual(['Ada Lovelace', 'Grace Hopper', 'Katherine Johnson']);
    const more = within(group).getByRole('button', { name: '+5 more people' });
    expect(more.textContent).toBe('+5');
  });

  it('has no "+N" when everyone fits', () => {
    render(<AvatarGroup people={people.slice(0, 2)} />);
    expect(screen.getByRole('group', { name: '2 people' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens a list of the others from "+N" with the keyboard', async () => {
    render(<AvatarGroup people={people} max={5} />);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: '+3 more people' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: '+3 more people' });
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Carl Sagan', 'Mae Jemison', 'Edwin Hubble']);
  });

  it.runIf(hasTouch)('opens the list with a touch tap', async () => {
    render(<AvatarGroup people={people} max={2} />);
    await commands.tap('[aria-label="+6 more people"]');
    expect(await screen.findByRole('dialog', { name: '+6 more people' })).toBeInTheDocument();
  });

  it('calls onOverflowPress instead of opening the list', async () => {
    const onOverflowPress = vi.fn();
    render(<AvatarGroup people={people} max={2} onOverflowPress={onOverflowPress} />);
    await userEvent.click(screen.getByRole('button', { name: '+6 more people' }));
    expect(onOverflowPress).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('takes the app’s strings from UIProvider', () => {
    const overrides: Partial<AvatarMessages> = {
      avatarGroupLabel: ({ count }) => `${String(count)} Personen`,
      avatarGroupMoreLabel: ({ count }) => `+${String(count)} weitere`,
      avatarWithPresence: ({ name, presence }) => `${name} (${presence})`,
    };
    render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <AvatarGroup
          people={[
            { name: 'Ada Lovelace', presence: { tone: 'success', label: 'online' } },
            ...people,
          ]}
          max={1}
        />
      </UIProvider>,
    );
    expect(screen.getByRole('group', { name: '9 Personen' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ada Lovelace (online)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+8 weitere' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="p-2">
        <AvatarGroup people={people} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('UserMenu with Avatar', () => {
  it('looks the same: a 36 px accent circle with initials, named by the account', () => {
    render(<UserMenu name="Ada Lovelace" />);
    const trigger = screen.getByRole('button', { name: 'Account: Ada Lovelace' });
    const { width, height } = trigger.getBoundingClientRect();
    expect([width, height]).toEqual([36, 36]);
    const avatar = trigger.querySelector('[role="img"]');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar?.getBoundingClientRect().width).toBe(36);
    const circle = avatar?.firstElementChild;
    if (!circle) {
      throw new Error('The avatar has no circle');
    }
    expect(circle).toHaveClass('bg-accent-bg', 'text-accent-fg', 'rounded-full');
    const style = getComputedStyle(circle);
    expect([style.fontSize, style.fontWeight]).toEqual(['14px', '600']);
    expect(trigger.querySelector('[data-initials="AL"]')).not.toBeNull();
  });
});
