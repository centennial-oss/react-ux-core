import { render, screen, within } from '@testing-library/react';
import { LayoutGrid, List, Map as MapIcon } from 'lucide-react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Pillbox } from './Pillbox';

const hasTouch = navigator.maxTouchPoints > 0;

const VIEWS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'map', label: 'Map', icon: MapIcon },
] as const;

/** The radio input (for checked and focus state). */
function radio(name: string) {
  return screen.getByRole('radio', { name });
}

/** The visible, clickable pill: the radio's label. */
function pill(name: string): HTMLElement {
  const label = radio(name).closest('label');
  if (!label) {
    throw new Error(`No label for ${name}`);
  }
  return label;
}

/** Every pill's field (label plus divider border), for width checks. */
function pillFields(): HTMLElement[] {
  return screen
    .getAllByRole('radio')
    .map((input) => input.closest('label')?.parentElement ?? input);
}

describe('Pillbox', () => {
  it('is a labelled radio group with one radio per option', () => {
    render(<Pillbox aria-label="View" options={VIEWS} />);
    const group = screen.getByRole('radiogroup', { name: 'View' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((item) => item.closest('label')?.textContent)).toEqual([
      'List',
      'Grid',
      'Map',
    ]);
    // Without a value, the first enabled option is chosen.
    expect(radio('List')).toBeChecked();
    expect(radio('Grid')).not.toBeChecked();
  });

  it('chooses with the pointer and reports the option id', async () => {
    const onChange = vi.fn();
    render(<Pillbox aria-label="View" options={VIEWS} defaultValue="grid" onChange={onChange} />);
    expect(radio('Grid')).toBeChecked();
    await userEvent.click(pill('Map'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('map');
    expect(radio('Map')).toBeChecked();
    expect(radio('Grid')).not.toBeChecked();
  });

  it('keeps one option chosen: pressing the chosen option does nothing', async () => {
    const onChange = vi.fn();
    render(<Pillbox aria-label="View" options={VIEWS} defaultValue="grid" onChange={onChange} />);
    await userEvent.click(pill('Grid'));
    expect(radio('Grid')).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the radio keyboard pattern: Tab to the chosen option, arrows choose', async () => {
    const onChange = vi.fn();
    render(
      <>
        <Pillbox aria-label="View" options={VIEWS} onChange={onChange} />
        <button type="button">After</button>
      </>,
    );
    await userEvent.keyboard('{Tab}');
    expect(radio('List')).toHaveFocus();
    expect(radio('List').closest('label')).toHaveAttribute('data-focus-visible', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(radio('Grid')).toHaveFocus();
    expect(radio('Grid')).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith('grid');
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('map');
    await userEvent.keyboard('{ArrowLeft}');
    expect(radio('Grid')).toBeChecked();
    // Tab leaves the group in one step, and Shift+Tab returns to the chosen option.
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(radio('Grid')).toHaveFocus();
  });

  it.runIf(hasTouch)('chooses when tapped, with touch-sized targets', async () => {
    const onChange = vi.fn();
    render(<Pillbox aria-label="View" options={VIEWS} size="sm" isIconOnly onChange={onChange} />);
    await commands.tap('label:has(input[aria-label="Map"])');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('map');
    const hitSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hit-size'),
    );
    expect(hitSize).toBe(44);
    for (const item of screen
      .getAllByRole('radio')
      .map((input) => input.closest('label') ?? input)) {
      const rect = item.getBoundingClientRect();
      const before = getComputedStyle(item, '::before');
      const hitHeight = rect.height - parseFloat(before.top) - parseFloat(before.bottom);
      expect(rect.width).toBeGreaterThanOrEqual(hitSize);
      expect(hitHeight).toBeGreaterThanOrEqual(hitSize);
    }
  });

  it('follows a controlled value', async () => {
    function Controlled() {
      const [view, setView] = useState<'list' | 'grid' | 'map'>('map');
      return (
        <>
          <Pillbox aria-label="View" options={VIEWS} value={view} onChange={setView} />
          <output>{view}</output>
          <button
            type="button"
            onClick={() => {
              setView('list');
            }}
          >
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(radio('Map')).toBeChecked();
    await userEvent.click(pill('Grid'));
    expect(screen.getByRole('status').textContent).toBe('grid');
    expect(radio('Grid')).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(radio('List')).toBeChecked();
  });

  it('stays put when a controlled value is not updated', async () => {
    const onChange = vi.fn();
    render(<Pillbox aria-label="View" options={VIEWS} value="list" onChange={onChange} />);
    await userEvent.click(pill('Grid'));
    expect(onChange).toHaveBeenCalledWith('grid');
    expect(radio('List')).toBeChecked();
    expect(radio('Grid')).not.toBeChecked();
  });

  it('labels icon-only options with aria-label and hides the icons', () => {
    render(<Pillbox aria-label="View" options={VIEWS} isIconOnly />);
    for (const name of ['List', 'Grid', 'Map']) {
      expect(radio(name)).toHaveAccessibleName(name);
      expect(pill(name).textContent).toBe('');
      expect(pill(name).querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('skips disabled options and disables the whole group', async () => {
    const onChange = vi.fn();
    const options = [
      { id: 'day', label: 'Day' },
      { id: 'week', label: 'Week', isDisabled: true },
      { id: 'month', label: 'Month' },
    ];
    const { unmount } = render(
      <Pillbox aria-label="Period" options={options} onChange={onChange} />,
    );
    expect(radio('Week')).toBeDisabled();
    await userEvent.keyboard('{Tab}{ArrowRight}');
    expect(radio('Month')).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('month');
    await userEvent.click(pill('Week'), { force: true });
    expect(onChange).toHaveBeenCalledTimes(1);
    unmount();

    render(<Pillbox aria-label="Period" options={options} isDisabled />);
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
    for (const item of screen.getAllByRole('radio')) {
      expect(item).toBeDisabled();
    }
  });

  it('defaults to the first enabled option', () => {
    render(
      <Pillbox
        aria-label="Period"
        options={[
          { id: 'day', label: 'Day', isDisabled: true },
          { id: 'week', label: 'Week' },
        ]}
      />,
    );
    expect(radio('Week')).toBeChecked();
  });

  it('takes aria-labelledby, a ref, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <>
        <span id="view-label">Layout</span>
        <Pillbox
          ref={ref}
          aria-labelledby="view-label"
          options={VIEWS}
          className="w-full"
          data-testid="pillbox"
        />
      </>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Layout' });
    expect(ref.current).toBe(group);
    expect(screen.getByTestId('pillbox')).toBe(group);
    expect(group.className).toContain('w-full');
  });

  it('sizes pills by size and fills a full-width group', () => {
    const { unmount } = render(<Pillbox aria-label="View" options={VIEWS} size="sm" />);
    expect(pill('List').getBoundingClientRect().height).toBe(32);
    unmount();
    render(
      <div style={{ width: 300 }}>
        <Pillbox aria-label="View" options={VIEWS} className="w-full" />
      </div>,
    );
    expect(pill('List').getBoundingClientRect().height).toBe(40);
    const widths = pillFields().map((item) => item.getBoundingClientRect().width);
    // The pills share the group's width (300 px less its 1 px border on each side) equally.
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(298, 0);
    for (const width of widths) {
      expect(width).toBeCloseTo(298 / 3, 0);
    }
  });

  it('makes every pill as wide as the widest', () => {
    render(
      <Pillbox
        aria-label="Period"
        options={[
          { id: 'day', label: 'Day' },
          { id: 'quarter', label: 'Quarter to date' },
        ]}
      />,
    );
    const [day, quarter] = pillFields();
    expect(day?.getBoundingClientRect().width).toBeCloseTo(
      quarter?.getBoundingClientRect().width ?? 0,
      0,
    );
    // The long label isn't truncated.
    const label = pill('Quarter to date').querySelector('span.truncate');
    expect(label?.scrollWidth).toBeLessThanOrEqual(label?.clientWidth ?? 0);
  });

  it('fits a narrow container without overflowing the page', () => {
    render(
      <div style={{ width: 240 }} data-testid="column">
        <Pillbox
          aria-label="Period"
          options={[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'This month' },
            { id: 'year', label: 'This year' },
          ]}
        />
      </div>,
    );
    const column = screen.getByTestId('column');
    expect(screen.getByRole('radiogroup').getBoundingClientRect().width).toBeLessThanOrEqual(240);
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Pillbox aria-label="View" options={VIEWS} />
        <Pillbox aria-label="Icon view" options={VIEWS} isIconOnly size="sm" />
        <Pillbox aria-label="Disabled view" options={VIEWS} isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
