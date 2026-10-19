import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Mixer } from '../../../test/mixer';
import { RangeSlider, Slider } from './Slider';

const hasTouch = navigator.maxTouchPoints > 0;
const isPhone = window.innerWidth < 640;

function slider(name: string) {
  return screen.getByRole<HTMLInputElement>('slider', { name });
}

/** The thumb around a slider's input, and the track around the thumb. */
function parts(input: HTMLElement) {
  const thumb = input.parentElement?.parentElement;
  const track = thumb?.parentElement;
  if (!thumb || !track) {
    throw new Error('slider structure not found');
  }
  return { thumb, track };
}

describe('vertical Slider (fader)', () => {
  it('is a vertical slider that ArrowUp raises', async () => {
    const onChange = vi.fn();
    render(<Slider label="Master" orientation="vertical" defaultValue={50} onChange={onChange} />);
    const input = slider('Master');
    expect(input).toHaveAttribute('aria-orientation', 'vertical');
    await userEvent.keyboard('{Tab}{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(51);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(49);
    expect(getComputedStyle(parts(input).thumb).outlineStyle).toBe('solid');
  });

  it('runs from the minimum at the bottom to the maximum at the top', async () => {
    render(<Slider label="Level" orientation="vertical" defaultValue={50} />);
    const input = slider('Level');
    const { thumb, track } = parts(input);
    const rect = track.getBoundingClientRect();
    expect(rect.height).toBeGreaterThan(rect.width);
    await userEvent.click(track, { position: { x: rect.width / 2, y: rect.height * 0.1 } });
    await expect.poll(() => Number(input.value)).toBeGreaterThan(80);
    const thumbRect = thumb.getBoundingClientRect();
    expect(thumbRect.top).toBeLessThan(rect.top + rect.height / 2);
  });

  it('draws tick labels beside the track', () => {
    render(
      <Slider
        label="Gain"
        orientation="vertical"
        minValue={-60}
        maxValue={6}
        defaultValue={0}
        ticks={[
          { value: 6, label: '+6' },
          { value: -60, label: '-60' },
        ]}
      />,
    );
    const top = screen.getAllByText('+6').find((label) => label.checkVisibility());
    const bottom = screen.getAllByText('-60').find((label) => label.checkVisibility());
    const track = parts(slider('Gain')).track.getBoundingClientRect();
    expect(top?.getBoundingClientRect().left).toBeGreaterThanOrEqual(track.right - 1);
    expect(top?.getBoundingClientRect().top).toBeLessThan(bottom?.getBoundingClientRect().top ?? 0);
  });

  it('works as a vertical range', async () => {
    const onChange = vi.fn();
    render(
      <RangeSlider
        label="Band"
        orientation="vertical"
        defaultValue={[20, 60]}
        onChange={onChange}
      />,
    );
    const start = slider('From Band');
    expect(start).toHaveAttribute('aria-orientation', 'vertical');
    await userEvent.keyboard('{Tab}{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith([21, 60]);
  });

  it.runIf(hasTouch)('has a touch-sized thumb and track', () => {
    render(<Slider label="Level" orientation="vertical" />);
    const { thumb, track } = parts(slider('Level'));
    expect(track.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    const rect = thumb.getBoundingClientRect();
    const before = getComputedStyle(thumb, '::before');
    expect(rect.height - parseFloat(before.top) - parseFloat(before.bottom)).toBeGreaterThanOrEqual(
      44,
    );
    expect(rect.width - parseFloat(before.left) - parseFloat(before.right)).toBeGreaterThanOrEqual(
      44,
    );
  });
});

describe('Mixer of faders and pan knobs', () => {
  it('has 16 channels, each with a fader and a pan knob, operable by keyboard', async () => {
    render(<Mixer />);
    expect(screen.getAllByRole('group', { name: /^Ch \d+$/ })).toHaveLength(16);
    const level = slider('Level Ch 3');
    expect(level).toHaveAttribute('aria-valuetext', '0');
    level.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(level).toHaveAttribute('aria-valuetext', '-1');
    const pan = slider('Pan Ch 2');
    expect(pan).toHaveAttribute('aria-valuetext', '-30');
    pan.focus();
    await userEvent.keyboard('{Enter}');
    expect(pan).toHaveAttribute('aria-valuetext', '0');
  });

  it.runIf(isPhone)('scrolls sideways inside its region at 360 px, not the page', () => {
    render(<Mixer />);
    const region = screen.getByRole('region', { name: 'Mixer' });
    expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Mixer channels={4} />);
    await expectNoAxeViolations(container);
  });
});
