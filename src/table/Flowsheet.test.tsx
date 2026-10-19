import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { flowsheetObservations, flowsheetTimes, flowsheetValues } from '../../test/flowsheet';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { Flowsheet, type FlowsheetProps } from './Flowsheet';
import type { FlowsheetMessages } from './flowsheetMessages';
import { ReferenceValue } from './ReferenceValue';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = !hasTouch;

function Sheet(props: Partial<FlowsheetProps>) {
  return (
    <div style={{ padding: 8 }}>
      <Flowsheet
        aria-label="Observations"
        observations={flowsheetObservations}
        values={flowsheetValues}
        timeZone="UTC"
        {...props}
      />
    </div>
  );
}

function target(row: string, col: number): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-flow-row="${row}"][data-flow-col="${String(col)}"]`,
  );
  if (!element) {
    throw new Error(`No cell ${row}/${String(col)}`);
  }
  return element;
}

/** The flag letters shown in a row, oldest first ('' for none). */
function flagsOf(row: string): string[] {
  return flowsheetTimes.map((_, index) => {
    const flag = target(row, index + 1).querySelector('[data-flag]');
    return flag?.getAttribute('data-flag') ?? '';
  });
}

function overrides(messages: Partial<FlowsheetMessages>): Partial<Messages> {
  return messages;
}

describe('Flowsheet', () => {
  it('renders a grid of grouped observations by time, newest first, with row and column headers', () => {
    render(<Sheet />);
    const grid = screen.getByRole('grid', { name: 'Observations' });
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers).toHaveLength(11);
    expect(headers[0]?.textContent).toBe('Observation');
    expect(headers[1]?.querySelector('time')?.getAttribute('dateTime')).toBe(
      '2026-10-13T12:00:00.000Z',
    );
    expect(headers[1]?.textContent).toBe('Oct 1312:00 PM');
    expect(headers[10]?.textContent).toBe('Oct 1212:00 AM');
    const groupHeaders = [...grid.querySelectorAll('th[scope="rowgroup"]')].map(
      (header) => header.textContent,
    );
    expect(groupHeaders).toEqual(['Vitals', 'Chemistry', 'Hematology']);
    expect(grid.querySelectorAll('th[scope="row"]')).toHaveLength(18);
    expect(screen.getByRole('button', { name: /^Heart rate/ })).toBeInTheDocument();
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });

  it('flags 6 vitals and 12 labs over 10 times from their ranges, with source flags taking priority', () => {
    render(<Sheet order="oldest-first" />);
    const expected: Record<string, string[]> = {
      hr: ['', '', '', '', 'H', 'H', 'HH', 'H', '', ''],
      sbp: ['', '', '', '', 'L', 'L', 'LL', '', '', ''],
      dbp: ['', '', '', '', 'L', 'L', 'L', '', '', ''],
      rr: ['', '', '', '', 'H', 'H', 'H', 'H', '', ''],
      temp: ['', '', 'H', 'H', 'H', 'H', 'H', 'H', '', ''],
      spo2: ['', '', '', 'L', 'L', 'L', 'LL', 'L', '', ''],
      na: ['', '', '', 'L', 'L', 'L', 'L', 'L', '', ''],
      // 5.3 is above the range, but the source flags it normal.
      k: ['', '', '', '', 'H', 'H', 'HH', 'H', '', ''],
      cl: ['', '', '', '', 'L', 'L', 'L', '', '', ''],
      hco3: ['', '', '', 'L', 'L', 'L', 'L', 'L', '', ''],
      urea: ['', '', '', '', 'H', 'H', 'H', 'H', 'H', ''],
      creat: ['', '', '', '', 'H', 'H', 'H', 'H', 'H', ''],
      glu: ['', '', '', 'H', 'H', 'LL', 'H', 'H', '', ''],
      ca: ['', '', '', '', 'L', 'L', 'L', 'L', '', ''],
      // "<0.3" isn't a number; its flag comes from the source.
      lact: ['L', '', '', '', 'H', 'H', 'HH', 'H', '', ''],
      hgb: ['', '', '', '', 'L', 'L', 'L', 'L', 'L', 'L'],
      wbc: ['', '', '', 'H', 'H', 'H', 'H', 'H', 'H', ''],
      // 226 is in range, but the source flags it abnormal.
      plt: ['', '', 'A', '', '', '', 'L', '', '', ''],
    };
    for (const [row, flags] of Object.entries(expected)) {
      expect({ row, flags: flagsOf(row) }).toEqual({ row, flags });
    }
    // Flags are spelled out for screen readers, with the note; never colour alone.
    expect(target('hr', 7).textContent).toBe('145HHCritically high');
    expect(target('spo2', 7).textContent).toBe('87LLCritically low');
    expect(target('na', 5).textContent).toBe('133LLow');
    expect(target('k', 4).textContent).toBe('5.3*Note: Hemolyzed sample; repeat ordered');
    expect(target('ca', 2).textContent).toBe('—Not set');
    expect(target('temp', 3).textContent).toBe('37.9HHigh');
    expect(target('hr', 7).closest('td')).toHaveAttribute('data-severity', 'critical');
    expect(target('hr', 5).closest('td')).toHaveAttribute('data-severity', 'abnormal');
  });

  it.skipIf(!isDesktop)(
    'moves between cells with the keyboard and shows the cell tooltip',
    async () => {
      const onObservationPress = vi.fn();
      render(
        <>
          <button type="button">Before</button>
          <Sheet onObservationPress={onObservationPress} />
        </>,
      );
      screen.getByRole('button', { name: 'Before' }).focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(target('hr', 0));
      await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
      // Newest first: column 4 holds the critical 145.
      expect(document.activeElement).toBe(target('hr', 4));
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toEqual(expect.stringContaining('Critically high'));
      expect(tooltip.textContent).toEqual(
        expect.stringContaining('Reference range: 60 bpm–100 bpm'),
      );
      await userEvent.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(target('sbp', 4));
      await userEvent.keyboard('{End}');
      expect(document.activeElement).toBe(target('sbp', 10));
      await userEvent.keyboard('{Control>}{End}{/Control}');
      expect(document.activeElement).toBe(target('plt', 10));
      await userEvent.keyboard('{ArrowDown}{PageUp}{Home}');
      expect(document.activeElement).toBe(target('hr', 0));

      await userEvent.keyboard('{Enter}');
      expect(onObservationPress).toHaveBeenCalledWith('hr');
      const dialog = await screen.findByRole('dialog', { name: 'Heart rate trend' });
      expect(dialog.textContent).toEqual(
        expect.stringContaining('Heart rate: 10 values from 72 bpm to 145 bpm, latest 88 bpm.'),
      );
      expect(dialog.textContent).toEqual(
        expect.stringContaining('Critical limits: below 40 bpm, above 140 bpm'),
      );
      expect(dialog.querySelector('[data-band]')).not.toBeNull();
      expect(dialog.querySelectorAll('[data-severity="critical"]')).toHaveLength(1);
      await expectNoAxeViolations(dialog);
    },
  );

  it('opens the trend chart with a tap or click', async () => {
    render(<Sheet />);
    if (hasTouch) {
      await commands.tap('[data-flow-row="k"][data-flow-col="0"]');
    } else {
      await userEvent.click(screen.getByRole('button', { name: /^Potassium/ }));
    }
    const dialog = await screen.findByRole('dialog', { name: 'Potassium trend' });
    expect(dialog.textContent).toEqual(expect.stringContaining('Potassium (mmol/L)'));
    expect(dialog.textContent).toEqual(
      expect.stringContaining('Reference range: 3.5 mmol/L–5.1 mmol/L'),
    );
  });

  it('scrolls inside its own container without widening the page, with no axe violations', async () => {
    const { container } = render(<Sheet maxHeight="24rem" />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await expectNoAxeViolations(container);
  });

  it('reads its strings from UIProvider messages', () => {
    render(
      <UIProvider
        messages={overrides({
          referenceCriticallyHigh: 'Panic high',
          flowsheetObservation: 'Measure',
        })}
      >
        <Sheet order="oldest-first" />
      </UIProvider>,
    );
    expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('Measure');
    expect(target('hr', 7).textContent).toBe('145HHPanic high');
  });
});

describe('ReferenceValue', () => {
  it('shows the value, unit and flag, and the range on request', async () => {
    const { container } = render(
      <div>
        <ReferenceValue
          value={2.6}
          unit="mmol/L"
          referenceRange={{ low: 3.5, high: 5.1 }}
          criticalRange={{ low: 2.8, high: 6.2 }}
          formatOptions={{ minimumFractionDigits: 1 }}
          hasRange
        />
        <ReferenceValue
          value={5.3}
          unit="mmol/L"
          referenceRange={{ low: 3.5, high: 5.1 }}
          flag="N"
        />
        <ReferenceValue value="Positive" flag="A" />
        <ReferenceValue value={null} unit="mmol/L" />
      </div>,
    );
    const [critical, sourceNormal, abnormal, empty] = [
      ...(container.firstElementChild as HTMLElement).children,
    ];
    expect(critical?.textContent).toBe('2.6mmol/LLLCritically low3.5 mmol/L–5.1 mmol/L');
    expect(critical?.querySelector('svg')).not.toBeNull();
    expect(sourceNormal?.textContent).toBe('5.3mmol/L');
    expect(abnormal?.textContent).toBe('PositiveAAbnormal');
    expect(empty?.textContent).toBe('—Not set');
    await expectNoAxeViolations(container);
  });
});
