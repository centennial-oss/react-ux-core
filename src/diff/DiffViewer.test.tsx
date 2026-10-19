import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import {
  longLineAfter,
  longLineBefore,
  observatoryLive,
  observatoryProposed,
  observatoryReordered,
  telescopeYamlAfter,
  telescopeYamlBefore,
} from '../../test/diff';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { DiffViewer } from './DiffViewer';
import type { DiffMessages } from './messages';

const isDesktop = window.innerWidth >= 1024;
const isPhone = window.innerWidth < 640;
const hasTouch = navigator.maxTouchPoints > 0;

const textOf = (element: Element | null | undefined) => element?.textContent ?? '';

function LargeConfig(props: { layout?: 'split' | 'unified'; maxHeight?: string }) {
  return (
    <DiffViewer
      before={observatoryLive}
      after={observatoryProposed}
      language="json"
      beforeLabel="Live"
      afterLabel="Proposed"
      {...props}
    />
  );
}

describe('DiffViewer', () => {
  it('is a figure named by its sides, with the summary in a status', () => {
    render(<LargeConfig />);
    const figure = screen.getByRole('figure', { name: 'Changes from Live to Proposed' });
    const status = within(figure).getByRole('status');
    expect(textOf(status)).toEqual(expect.stringContaining('+4 −4 in 3 hunks'));
    expect(textOf(status)).toEqual(
      expect.stringContaining('4 lines added and 4 removed, in 3 hunks'),
    );
  });

  it('renders a 400-line config with three changes as three hunks with collapsed context', () => {
    const { container } = render(<LargeConfig layout="unified" />);
    expect(container.querySelectorAll('[data-hunk]')).toHaveLength(3);
    const toggles = screen.getAllByRole('button', { name: /^Show \d+ unchanged lines$/ });
    expect(toggles).toHaveLength(4);
    // Only the changed lines and three lines of context either side are shown.
    expect(textOf(container)).toContain('"exposureSeconds": 120');
    expect(textOf(container)).not.toContain('"id": "cam-12"');
  });

  it('marks additions and removals with symbols and hidden words, not colour alone', () => {
    const { container } = render(<LargeConfig layout="unified" />);
    const added = [...container.querySelectorAll('.bg-success-bg')];
    const removed = [...container.querySelectorAll('.bg-danger-bg')];
    expect(added).toHaveLength(4);
    expect(removed).toHaveLength(4);
    expect(textOf(added[0]?.querySelector('.sr-only'))).toBe('added ');
    expect(textOf(removed[0]?.querySelector('.sr-only'))).toBe('removed ');
    const [sign] = removed[0]?.querySelectorAll('[aria-hidden="true"]') ?? [];
    expect(removed[0]?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    expect(sign).toBeDefined();
    expect(textOf(removed[0]).includes('−')).toBe(true);
  });

  it('shows line numbers from both sides, hidden from screen readers', () => {
    const { container } = render(<LargeConfig layout="unified" />);
    const added = container.querySelector('.bg-success-bg');
    const numbers = added?.querySelectorAll('[aria-hidden="true"]');
    // Removed and added lines carry only their own side's number.
    expect(textOf(numbers?.[0])).toBe('');
    expect(Number(textOf(numbers?.[1]))).toBeGreaterThan(20);
  });

  it('highlights changed words, with syntax colours', () => {
    const { container, unmount } = render(<LargeConfig layout="unified" />);
    const changed = [...container.querySelectorAll('.bg-success-bg .underline')].map(textOf);
    expect(changed).toContain('120');
    expect(container.querySelector('.text-code-property')).not.toBeNull();
    unmount();
    const plain = render(
      <DiffViewer before={observatoryLive} after={observatoryProposed} hasWordDiff={false} />,
    );
    expect(plain.container.querySelector('.underline')).toBeNull();
  });

  it('expands and collapses unchanged lines', async () => {
    const { container } = render(<LargeConfig layout="unified" />);
    const [first] = screen.getAllByRole('button', { name: /^Show \d+ unchanged lines$/ });
    if (!first) {
      throw new Error('No collapsed lines');
    }
    expect(first).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(textOf(first)).toMatch(/^Hide \d+ unchanged lines$/);
    expect(textOf(container)).toContain('"name": "Ridge Observatory"');
    await userEvent.click(first);
    expect(textOf(container)).not.toContain('"name": "Ridge Observatory"');
  });

  it.runIf(hasTouch)('expands unchanged lines with a tap', async () => {
    render(<LargeConfig layout="unified" />);
    await commands.tap('button[data-gap="0"]');
    await expect.poll(() => document.querySelector('button[aria-expanded="true"]')).not.toBeNull();
  });

  it.runIf(isDesktop)('moves between hunks by keyboard and announces each', async () => {
    const { container } = render(<LargeConfig maxHeight="16rem" />);
    const previous = screen.getByRole('button', { name: 'Previous hunk' });
    const next = screen.getByRole('button', { name: 'Next hunk' });
    expect(previous).toBeDisabled();
    next.focus();
    await userEvent.keyboard('{Enter}');
    expect(container.querySelector('[data-current]')?.getAttribute('data-hunk')).toBe('0');
    await userEvent.keyboard('{Enter}');
    expect(container.querySelector('[data-current]')?.getAttribute('data-hunk')).toBe('1');
    await expect
      .poll(() => textOf(container.querySelector('[aria-live="polite"]')))
      .toMatch(/^Hunk 2 of 3, from line \d+$/);
    // The hunk scrolls into view inside the diff.
    const area = container.querySelector('[data-hunk="1"]')?.closest('.overflow-auto');
    expect(area?.scrollTop).toBeGreaterThan(0);
    await userEvent.keyboard('{Enter}');
    expect(next).toBeDisabled();
    previous.focus();
    await userEvent.keyboard('{Enter}');
    expect(container.querySelector('[data-current]')?.getAttribute('data-hunk')).toBe('1');
  });

  it.runIf(isDesktop)('splits on wide containers and unifies on narrow ones', async () => {
    const { container, rerender } = render(
      <div className="w-[60rem]">
        <DiffViewer before={telescopeYamlBefore} after={telescopeYamlAfter} />
      </div>,
    );
    await expect.poll(() => container.querySelector('.grid-cols-2')).not.toBeNull();
    rerender(
      <div className="w-80">
        <DiffViewer before={telescopeYamlBefore} after={telescopeYamlAfter} />
      </div>,
    );
    await expect.poll(() => container.querySelector('.grid-cols-2')).toBeNull();
  });

  it('pairs removed and added lines side by side in the split layout', () => {
    const { container } = render(
      <DiffViewer before={telescopeYamlBefore} after={telescopeYamlAfter} layout="split" />,
    );
    const row = [...container.querySelectorAll('.grid-cols-2')].find((element) =>
      textOf(element).includes('focal_ratio: 8'),
    );
    expect(textOf(row)).toContain('focal_ratio: 6.5');
  });

  it('ignores reordered keys in structural mode', () => {
    const { container, unmount } = render(
      <DiffViewer before={observatoryLive} after={observatoryReordered} isStructural />,
    );
    expect(container.querySelectorAll('[data-hunk]')).toHaveLength(3);
    expect(textOf(screen.getByRole('status'))).toEqual(expect.stringContaining('+4 −4'));
    unmount();
    render(<DiffViewer before={observatoryLive} after={observatoryReordered} />);
    expect(textOf(screen.getByRole('status'))).not.toEqual(expect.stringContaining('+4 −4'));
  });

  it('falls back to a text diff, with a note, when structural parsing fails', () => {
    render(<DiffViewer before={'{ "a": 1 }'} after={'{ "a": 2, }'} isStructural />);
    expect(screen.getByText(/compared as text/)).toBeInTheDocument();
  });

  it('says when there are no differences', () => {
    render(<DiffViewer before={telescopeYamlBefore} after={telescopeYamlBefore} />);
    expect(textOf(screen.getByRole('status'))).toEqual(expect.stringContaining('No differences'));
    expect(screen.queryByRole('button', { name: 'Next hunk' })).toBeNull();
    expect(screen.getByRole('button', { name: /^Show 13 unchanged lines$/ })).toBeInTheDocument();
  });

  it('scrolls inside past maxHeight, focusable when it scrolls', async () => {
    const { container } = render(<LargeConfig maxHeight="10rem" />);
    const area = container.querySelector('.overflow-auto');
    await expect.poll(() => area?.getAttribute('tabindex')).toBe('0');
  });

  it.runIf(isPhone)('stays readable at 360 px: unified, without page scroll', () => {
    const { container } = render(<LargeConfig />);
    expect(container.querySelector('.grid-cols-2')).toBeNull();
    render(<DiffViewer before={longLineBefore} after={longLineAfter} language="bash" />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes the app’s strings from UIProvider', () => {
    const messages: Partial<Messages & DiffMessages> = {
      diffSummary: ({ added, removed }) => `${added} new, ${removed} gone`,
      showUnchangedLines: ({ count }) => `Reveal ${count}`,
    };
    render(
      <UIProvider messages={messages}>
        <LargeConfig />
      </UIProvider>,
    );
    expect(textOf(screen.getByRole('status'))).toEqual(expect.stringContaining('4 new, 4 gone'));
    expect(screen.getAllByRole('button', { name: /^Reveal \d+$/ })).toHaveLength(4);
  });

  it('has no accessibility violations, unified or split', async () => {
    const { container, unmount } = render(<LargeConfig layout="unified" />);
    await expectNoAxeViolations(container);
    unmount();
    const split = render(
      <DiffViewer
        before={telescopeYamlBefore}
        after={telescopeYamlAfter}
        language="yaml"
        layout="split"
      />,
    );
    await expectNoAxeViolations(split.container);
  });
});
