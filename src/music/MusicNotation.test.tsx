import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { bassLine, odeToJoyLeadSheet, odeToJoyMusicXml, odeToJoyOpening } from '../../test/music';
import { UIProvider } from '../provider/UIProvider';
import { MusicNotation } from './MusicNotation';

const isDesktop = window.innerWidth >= 1024;

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected a value');
  }
  return value;
}

async function ready(container: HTMLElement): Promise<HTMLElement> {
  const root = container.querySelector<HTMLElement>('[data-notation-status]');
  if (!root) {
    throw new Error('No notation root');
  }
  await expect.poll(() => root.dataset.notationStatus, { timeout: 15000 }).toBe('ready');
  return root;
}

/** The number of systems: distinct top edges among the measures. */
function systemCount(root: HTMLElement): number {
  const tops = [...root.querySelectorAll<HTMLElement>('[data-measure]')].map(
    (measure) => measure.style.top,
  );
  return new Set(tops).size;
}

describe('MusicNotation', () => {
  it('draws the score as SVG with a text alternative per measure', async () => {
    const { container } = render(<MusicNotation score={odeToJoyOpening} />);
    const root = await ready(container);
    expect(root).toHaveAccessibleName('Ode to Joy');
    const svg = root.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    // Clef, key signature, time signature, notes and chord symbols are drawn in the theme's colour.
    expect(svg?.querySelectorAll('.vf-stavenote')).toHaveLength(15);
    expect(svg?.innerHTML).not.toMatch(/fill="(black|#000)"/);
    const measures = within(root)
      .getAllByRole('group')
      .filter((group) => group.dataset.measure);
    expect(measures.map((measure) => measure.ariaLabel)).toEqual([
      'Measure 1: chord G, B4 quarter, B4 quarter, C5 quarter, D5 quarter',
      'Measure 2: chord D, D5 quarter, C5 quarter, B4 quarter, A4 quarter',
      'Measure 3: chord G, G4 quarter, G4 quarter, A4 quarter, B4 quarter',
      'Measure 4: chord D, B4 dotted quarter, A4 eighth, A4 half',
    ]);
    expect(
      within(must(measures[3]))
        .getAllByRole('button')
        .map((note) => note.ariaLabel),
    ).toEqual(['chord D, B4 dotted quarter', 'A4 eighth', 'A4 half']);
    await expectNoAxeViolations(container);
  });

  it('moves by note and by measure with the arrow keys, and reports pressed notes', async () => {
    const onNotePress = vi.fn();
    const { container } = render(
      <MusicNotation score={odeToJoyOpening} onNotePress={onNotePress} />,
    );
    await ready(container);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toHaveAccessibleName('chord G, B4 quarter');
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveAttribute('data-note-id', 'm1-n1');
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAttribute('data-note-id', 'm2-n0');
    await userEvent.keyboard('{ArrowDown}{ArrowLeft}');
    expect(document.activeElement).toHaveAttribute('data-note-id', 'm2-n3');
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toHaveAttribute('data-note-id', 'm1-n0');
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toHaveAttribute('data-note-id', 'm4-n2');
    await userEvent.keyboard('{Enter}');
    expect(onNotePress).toHaveBeenCalledWith('m4-n2');
    // Tab leaves the score in one step.
    await userEvent.keyboard('{Tab}');
    expect(container.contains(document.activeElement)).toBe(false);
  });

  it('highlights the measure and note at the playhead', async () => {
    const { container, rerender } = render(
      <MusicNotation score={odeToJoyOpening} playhead={{ measure: 2, beat: 3.5 }} />,
    );
    const root = await ready(container);
    expect(root.querySelector('[data-measure="2"]')).toHaveAttribute('data-current', 'true');
    expect(root.querySelector('#vf-m2-n2')).toHaveAttribute('data-current');
    expect(root.querySelector('[data-note-id="m2-n2"]')).toHaveAttribute('aria-current', 'true');
    rerender(<MusicNotation score={odeToJoyOpening} playhead={{ measure: 4, beat: 1 }} />);
    expect(root.querySelector('#vf-m2-n2')).not.toHaveAttribute('data-current');
    expect(root.querySelector('#vf-m4-n0')).toHaveAttribute('data-current');
    expect(root.querySelector('[data-measure="4"]')).toHaveAttribute('data-current', 'true');
  });

  it('wraps a 32-bar lead sheet to its container and follows a playhead', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <div data-testid="narrow" className="w-[360px]">
          <MusicNotation score={odeToJoyLeadSheet} playhead={{ measure: 30, beat: 1 }} />
        </div>
        {isDesktop && (
          <div data-testid="wide" className="w-[1280px]">
            <MusicNotation score={odeToJoyLeadSheet} />
          </div>
        )}
      </div>,
    );
    const narrow = await ready(screen.getByTestId('narrow'));
    expect(narrow.querySelectorAll('[data-measure]')).toHaveLength(32);
    const narrowSvg = narrow.querySelector('svg');
    expect(narrowSvg?.getBoundingClientRect().width).toBeLessThanOrEqual(360);
    expect(narrow.scrollWidth).toBeLessThanOrEqual(360);
    const narrowSystems = systemCount(narrow);
    expect(narrowSystems).toBeGreaterThanOrEqual(10);
    // The playhead's measure was scrolled into view.
    const current = narrow.querySelector('[data-measure="30"]');
    expect(current).toHaveAttribute('data-current', 'true');
    const box = must(current).getBoundingClientRect();
    expect(box.bottom).toBeGreaterThan(0);
    expect(box.top).toBeLessThan(window.innerHeight);
    if (isDesktop) {
      const wide = await ready(screen.getByTestId('wide'));
      expect(wide.querySelector('svg')?.getBoundingClientRect().width).toBeLessThanOrEqual(1280);
      const wideSystems = systemCount(wide);
      expect(wideSystems).toBeLessThan(narrowSystems);
      expect(wideSystems).toBeLessThanOrEqual(8);
    }
    expect(container).toBeInTheDocument();
  });

  it('reads MusicXML, zooms, and lays out four measures a line when not responsive', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <div data-testid="xml">
          <MusicNotation score={odeToJoyMusicXml} />
        </div>
        <div data-testid="fixed">
          <MusicNotation score={odeToJoyLeadSheet} isResponsive={false} zoom={0.75} />
        </div>
        <div data-testid="bass">
          <MusicNotation score={bassLine} zoom={1.5} />
        </div>
      </div>,
    );
    const xml = await ready(screen.getByTestId('xml'));
    expect(xml.querySelectorAll('[data-measure]')).toHaveLength(4);
    expect(xml.querySelector('[data-measure="2"]')?.ariaLabel).toBe(
      'Measure 2: chord D7, D5 dotted quarter, C5 eighth, F sharp 4 quarter, tied, F sharp 4 quarter',
    );
    const fixed = await ready(screen.getByTestId('fixed'));
    expect(systemCount(fixed)).toBe(8);
    const bass = await ready(screen.getByTestId('bass'));
    expect(bass).toHaveAccessibleName('Walking bass');
    // One tie, drawn in two halves when it crosses a line break (on narrow screens at this zoom).
    expect(bass.querySelectorAll('.vf-stavetie').length).toBeGreaterThanOrEqual(1);
    await expectNoAxeViolations(container);
  });

  it('shows an error for a score it can’t read', async () => {
    render(<MusicNotation score="<not-music/>" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t show this score.');
    expect(screen.getByRole('group')).toHaveAttribute('data-notation-status', 'error');
  });

  it('takes its strings from UIProvider', async () => {
    const { container } = render(
      <UIProvider
        messages={{
          notationLabel: 'Partition',
          notationMeasure: ({ number, notes }: { number: number; notes: string }) =>
            `Mesure ${String(number)} : ${notes}`,
        }}
      >
        <MusicNotation score={{ ...odeToJoyOpening, title: undefined }} />
      </UIProvider>,
    );
    const root = await ready(container);
    expect(root).toHaveAccessibleName('Partition');
    expect(root.querySelector('[data-measure="1"]')?.ariaLabel).toMatch(/^Mesure 1 : /);
  });
});
