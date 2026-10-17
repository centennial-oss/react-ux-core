import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { drumPattern, drumRows } from '../../test/music';
import { UIProvider } from '../provider/UIProvider';
import { MusicTransport } from './MusicTransport';
import { StepSequencer, type StepPattern, type StepSequencerProps } from './StepSequencer';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = window.innerWidth >= 1024;

function cell(row: string, step: number): HTMLElement {
  return screen.getByRole('button', { name: `${row}, step ${String(step)}` });
}

function Controlled({
  onChange,
  initial = {},
  ...props
}: Partial<StepSequencerProps> & { initial?: StepPattern }) {
  const [value, setValue] = useState<StepPattern>(initial);
  return (
    <StepSequencer
      rows={drumRows}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      {...props}
    />
  );
}

describe('StepSequencer', () => {
  it('is a grid of named toggle cells that show their velocity', async () => {
    const { container } = render(
      <StepSequencer
        rows={drumRows}
        defaultValue={drumPattern}
        currentStep={4}
        onAudition={() => undefined}
      />,
    );
    const grid = screen.getByRole('grid', { name: 'Step sequencer' });
    expect(within(grid).getAllByRole('row')).toHaveLength(5);
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(17);
    expect(cell('Kick', 1)).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Kick', 1)).toHaveAccessibleDescription('velocity 120');
    expect(cell('Kick', 2)).toHaveAttribute('aria-pressed', 'false');
    expect(cell('Snare', 5)).toHaveAttribute('data-current', 'true');
    expect(screen.getByRole('button', { name: 'Play Kick' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('toggles steps with a press and auditions rows', async () => {
    const onChange = vi.fn();
    const onAudition = vi.fn();
    render(<Controlled onChange={onChange} onAudition={onAudition} />);
    await userEvent.click(cell('Snare', 5));
    expect((onChange.mock.lastCall?.[0] as StepPattern).snare?.[4]).toBe(100);
    expect(onAudition).toHaveBeenLastCalledWith('snare');
    expect(cell('Snare', 5)).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(cell('Snare', 5));
    expect((onChange.mock.lastCall?.[0] as StepPattern).snare?.[4]).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Play Open hat' }));
    expect(onAudition).toHaveBeenLastCalledWith('open');
  });

  it.runIf(hasTouch)('toggles a step with a real touch tap', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await commands.tap('[data-cell="0:0"]');
    expect((onChange.mock.lastCall?.[0] as StepPattern).kick?.[0]).toBe(100);
    expect(cell('Kick', 1)).toHaveAttribute('aria-pressed', 'true');
  });

  it.runIf(isDesktop)('paints across steps with a mouse drag', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const first = cell('Closed hat', 1);
    const rect = (element: HTMLElement) => element.getBoundingClientRect();
    const at = (element: HTMLElement) => ({
      clientX: rect(element).left + 4,
      clientY: rect(element).top + 4,
    });
    const init = { bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };
    first.dispatchEvent(new PointerEvent('pointerdown', { ...init, ...at(first) }));
    for (const step of [2, 3, 4]) {
      cell('Closed hat', step).dispatchEvent(
        new PointerEvent('pointermove', { ...init, button: -1, ...at(cell('Closed hat', step)) }),
      );
    }
    first.dispatchEvent(
      new PointerEvent('pointerup', { ...init, buttons: 0, ...at(cell('Closed hat', 4)) }),
    );
    await expect
      .poll(() => (onChange.mock.lastCall?.[0] as StepPattern | undefined)?.hat?.slice(0, 5))
      .toEqual([100, 100, 100, 100, 0]);
  });

  it.runIf(isDesktop)('writes a 16-step pattern from the keyboard', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} onAudition={() => undefined} />);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(cell('Kick', 1));
    // Kick on 1, 5, 9 and 13.
    await userEvent.keyboard(' {ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight} ');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight} ');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}');
    // Snare on 5 and 13, the second one softer.
    await userEvent.keyboard('{ArrowDown}{Enter}{-}');
    await userEvent.keyboard(
      '{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft} ',
    );
    const pattern = onChange.mock.lastCall?.[0] as StepPattern;
    expect(pattern.kick?.map((velocity) => (velocity > 0 ? 1 : 0)).join('')).toBe(
      '1000100010001000',
    );
    expect(pattern.snare?.[12]).toBe(84);
    expect(pattern.snare?.[4]).toBe(100);
    expect(cell('Snare', 13)).toHaveAccessibleDescription('velocity 84');
    // Left of the first step is the row's name; Control+End is the last cell.
    await userEvent.keyboard('{Home}{ArrowLeft}');
    expect(document.activeElement).toHaveAccessibleName('Play Snare');
    await userEvent.keyboard('{Control>}{End}{/Control}');
    expect(document.activeElement).toBe(cell('Open hat', 16));
  });

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          stepSequencerLabel: 'Séquenceur',
          stepSequencerCell: ({ row, step }: { row: string; step: number }) =>
            `${row}, pas ${String(step)}`,
        }}
      >
        <StepSequencer rows={drumRows} steps={8} />
      </UIProvider>,
    );
    expect(screen.getByRole('grid', { name: 'Séquenceur' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kick, pas 8' })).toBeInTheDocument();
  });
});

describe('MusicTransport', () => {
  it('plays, stops, shows bars and beats, and edits the tempo and loop', async () => {
    const onPlayingChange = vi.fn();
    const onStop = vi.fn();
    const onBpmChange = vi.fn();
    const onLoopingChange = vi.fn();
    const { container, rerender } = render(
      <MusicTransport
        isPlaying={false}
        onPlayingChange={onPlayingChange}
        onStop={onStop}
        position={6.5}
        bpm={96}
        onBpmChange={onBpmChange}
        isLooping={false}
        onLoopingChange={onLoopingChange}
      />,
    );
    const group = screen.getByRole('group', { name: 'Transport' });
    expect(within(group).getByText('Bar 2, beat 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onPlayingChange).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Loop' }));
    expect(onLoopingChange).toHaveBeenCalledWith(true);
    const bpm = screen.getByRole('textbox', { name: 'BPM' });
    await userEvent.tripleClick(bpm);
    await userEvent.keyboard('120{Enter}');
    expect(onBpmChange).toHaveBeenLastCalledWith(120);
    rerender(
      <MusicTransport
        isPlaying
        onPlayingChange={onPlayingChange}
        position={3}
        bpm={120}
        timeSignature={{ beats: 3, unit: 4 }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(within(group).getByText('Bar 2, beat 1')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
