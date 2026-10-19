import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { demoCommands } from '../../../test/commandPalette';
import type { LinkComponentProps } from '../../provider/link';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { CommandPalette, type CommandItem, type CommandPaletteProps } from './CommandPalette';
import { CommandPaletteTrigger } from './CommandPaletteTrigger';
import type { CommandPaletteMessages } from './messages';
import { isApplePlatform } from './shortcut';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;
const mod = isApplePlatform() ? 'Meta' : 'Control';

/** Records navigation instead of following links. */
function linkRecorder(onNavigate: (href: string) => void) {
  return function RecordingLink({ href, onClick, children, ...props }: LinkComponentProps) {
    return (
      <a
        {...props}
        href={href}
        onClick={(event) => {
          onClick?.(event);
          event.preventDefault();
          onNavigate(href);
        }}
      >
        {children}
      </a>
    );
  };
}

function Palette(props: Partial<CommandPaletteProps> & { onNavigate?: (href: string) => void }) {
  const { onNavigate = () => undefined, ...rest } = props;
  return (
    <UIProvider LinkComponent={linkRecorder(onNavigate)}>
      <input aria-label="Notes" />
      <CommandPalette items={demoCommands} {...rest} />
    </UIProvider>
  );
}

function input(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Search commands and pages' });
}

async function openWithShortcut() {
  await userEvent.keyboard(`{${mod}>}k{/${mod}}`);
  const dialog = await screen.findByRole('dialog', { name: 'Command palette' });
  await expect.poll(() => document.activeElement).toBe(input());
  return dialog;
}

/** A loader whose calls the test resolves by hand. */
function manualLoader() {
  const calls: {
    query: string;
    signal: AbortSignal;
    resolve: (items: CommandItem[]) => void;
  }[] = [];
  const loadItems = vi.fn(
    (query: string, signal: AbortSignal) =>
      new Promise<readonly CommandItem[]>((resolve) => {
        calls.push({ query, signal, resolve });
      }),
  );
  return { calls, loadItems };
}

const readings: CommandItem[] = [
  { id: 'reading-1042', label: 'Lab reading #1042', section: 'Lab readings' },
  { id: 'reading-1043', label: 'Lab reading #1043', section: 'Lab readings' },
];

describe('CommandPalette', () => {
  it('opens with the shortcut, and typing "mars m" then Enter runs "Mars › Moons"', async () => {
    const onNavigate = vi.fn();
    render(<Palette onNavigate={onNavigate} />);
    await openWithShortcut();
    await userEvent.keyboard('mars m');
    await expect
      .poll(() => input().getAttribute('aria-activedescendant'))
      .toBe(screen.getByRole('option', { name: /Mars › Moons/ }).id);
    await userEvent.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('#mars/moons');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it('is a combobox over a listbox, highlighting matched letters and announcing the count', async () => {
    render(<Palette defaultOpen />);
    const field = input();
    expect(field).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(field.getAttribute('aria-controls')).toBe(listbox.id);
    await userEvent.type(field, 'moons');
    const options = within(listbox).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Mars › Moons'),
      expect.stringContaining('Jupiter › Moons'),
    ]);
    const marks = [...(options[0]?.querySelectorAll('mark') ?? [])].map((mark) => mark.textContent);
    expect(marks).toEqual(['Moons']);
    expect(screen.getByText('2 results')).toHaveAttribute('aria-live', 'polite');
    // Arrow keys move the highlighted row.
    await userEvent.keyboard('{ArrowDown}');
    expect(field.getAttribute('aria-activedescendant')).toBe(options[1]?.id);
  });

  it('runs an action, closes with Escape, and returns focus', async () => {
    const onAction = vi.fn();
    const items: CommandItem[] = [
      ...demoCommands,
      { id: 'calibrate', label: 'Calibrate spectrometer', onAction },
    ];
    render(<Palette items={items} />);
    await openWithShortcut();
    await userEvent.keyboard('calib{Enter}');
    expect(onAction).toHaveBeenCalledTimes(1);
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();

    screen.getByRole('textbox', { name: 'Notes' }).focus();
    await openWithShortcut();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('textbox', { name: 'Notes' }));
  });

  it('takes the mod shortcut from text fields, but a plain-key shortcut leaves typing alone', async () => {
    const { unmount } = render(<Palette />);
    screen.getByRole('textbox', { name: 'Notes' }).focus();
    await openWithShortcut();
    unmount();

    render(<Palette shortcut="/" />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Notes' }), 'a/b');
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('a/b');
    expect(screen.queryByRole('dialog')).toBeNull();
    screen.getByRole('textbox', { name: 'Notes' }).blur();
    await userEvent.keyboard('/');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('turns the shortcut off with null', async () => {
    render(<Palette shortcut={null} />);
    await userEvent.keyboard(`{${mod}>}k{/${mod}}`);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps recent items first, up to maxRecent', async () => {
    const onRecentChange = vi.fn();
    function Recent() {
      const [recent, setRecent] = useState<string[]>(['venus']);
      return (
        <Palette
          recentIds={recent}
          maxRecent={2}
          onRecentChange={(ids) => {
            onRecentChange(ids);
            setRecent(ids);
          }}
        />
      );
    }
    render(<Recent />);
    await openWithShortcut();
    await userEvent.keyboard('observ{Enter}');
    expect(onRecentChange).toHaveBeenLastCalledWith(['observatories', 'venus']);
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    await openWithShortcut();
    await userEvent.keyboard('earth{Enter}');
    expect(onRecentChange).toHaveBeenLastCalledWith(['earth', 'observatories']);
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    await openWithShortcut();
    const recentGroup = screen.getByRole('group', { name: 'Recent' });
    expect(
      within(recentGroup)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Earth', 'Observatories']);
  });

  it('loads async results after typing pauses, aborting stale loads, with a spinner row', async () => {
    const { calls, loadItems } = manualLoader();
    // Long enough that keystrokes on a busy test machine land within one pause.
    render(<Palette defaultOpen loadItems={loadItems} loadDelay={600} />);
    await userEvent.type(input(), 'rea');
    await expect.poll(() => calls.length, { timeout: 3000 }).toBe(1);
    expect(calls[0]?.query).toBe('rea');
    expect(screen.getByText('Searching…')).toBeInTheDocument();
    await userEvent.type(input(), 'd');
    // The first load is aborted as soon as the query changes.
    expect(calls[0]?.signal.aborted).toBe(true);
    await expect.poll(() => calls.length, { timeout: 3000 }).toBe(2);
    expect(calls[1]?.query).toBe('read');
    calls[1]?.resolve(readings);
    const group = await screen.findByRole('group', { name: 'Lab readings' });
    expect(within(group).getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByText('Searching…')).toBeNull();
    expect(loadItems).toHaveBeenCalledTimes(2);
  });

  it('keeps the highlighted row when async results arrive', async () => {
    const { calls, loadItems } = manualLoader();
    render(<Palette defaultOpen loadItems={loadItems} loadDelay={600} />);
    await userEvent.type(input(), 'moons');
    await userEvent.keyboard('{ArrowDown}');
    const highlighted = screen.getByRole('option', { name: /Jupiter › Moons/ });
    expect(input().getAttribute('aria-activedescendant')).toBe(highlighted.id);
    await expect.poll(() => calls.length, { timeout: 3000 }).toBe(1);
    calls[0]?.resolve([{ id: 'moon-log', label: 'Moons observing log', section: 'Logs' }]);
    await screen.findByRole('group', { name: 'Logs' });
    expect(input().getAttribute('aria-activedescendant')).toBe(highlighted.id);
    expect(highlighted).toHaveAttribute('data-focused', 'true');
  });

  it('shows an empty state', async () => {
    render(<Palette defaultOpen />);
    await userEvent.type(input(), 'zzz');
    expect(screen.getByText('No results for “zzz”')).toBeInTheDocument();
    expect(screen.getByText('0 results')).toBeInTheDocument();
  });

  it.runIf(isPhone)('is a full-screen sheet with a close button on phones', async () => {
    render(<Palette defaultOpen />);
    const dialog = await screen.findByRole('dialog');
    await expect
      .poll(() => Math.round(dialog.getBoundingClientRect().width))
      .toBe(window.innerWidth);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it('takes its strings from UIProvider', () => {
    const overrides: Partial<CommandPaletteMessages> = {
      commandPaletteSearch: 'Find anything',
      commandPalettePlaceholder: 'Jump to…',
    };
    // Until CommandPaletteMessages joins the Messages union, the overrides need widening.
    render(
      <UIProvider messages={overrides as unknown as Partial<Messages>}>
        <CommandPalette items={demoCommands} defaultOpen />
      </UIProvider>,
    );
    expect(screen.getByRole('combobox', { name: 'Find anything' })).toHaveAttribute(
      'placeholder',
      'Jump to…',
    );
  });

  it('has no accessibility violations', async () => {
    render(<Palette defaultOpen recentIds={['mars']} />);
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(input(), 'mars');
    await expectNoAxeViolations(dialog);
  });
});

describe('CommandPaletteTrigger', () => {
  function WithTrigger() {
    const [isOpen, setOpen] = useState(false);
    return (
      <>
        <CommandPaletteTrigger
          onPress={() => {
            setOpen(true);
          }}
        />
        <CommandPalette items={demoCommands} isOpen={isOpen} onOpenChange={setOpen} />
      </>
    );
  }

  it('names the shortcut and opens the palette', async () => {
    render(<WithTrigger />);
    const trigger = screen.getByRole('button', { name: 'Search' });
    expect(trigger).toHaveAttribute(
      'aria-keyshortcuts',
      isApplePlatform() ? 'Meta+K' : 'Control+K',
    );
    await userEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it.runIf(hasTouch)('opens the palette with a touch tap', async () => {
    render(<WithTrigger />);
    await commands.tap('button[aria-keyshortcuts]');
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<WithTrigger />);
    await expectNoAxeViolations(container);
  });
});
