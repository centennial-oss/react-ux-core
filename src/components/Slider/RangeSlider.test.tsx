import { render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { RangeSlider } from './Slider';

const hasTouch = navigator.maxTouchPoints > 0;

function slider(name: string) {
  return screen.getByRole<HTMLInputElement>('slider', { name });
}

function thumbOf(input: HTMLElement) {
  const thumb = input.parentElement?.parentElement;
  if (!thumb) {
    throw new Error('thumb not found');
  }
  return thumb;
}

describe('RangeSlider', () => {
  it('has a labelled thumb for each end and shows the range', () => {
    // Each thumb's name is its own label followed by the slider's ("From Price").
    render(
      <RangeSlider
        label="Price"
        description="Per night"
        defaultValue={[20, 80]}
        formatOptions={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      />,
    );
    expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument();
    const start = slider('From Price');
    const end = slider('To Price');
    expect(start).toHaveValue('20');
    expect(end).toHaveValue('80');
    expect(start).toHaveAttribute('aria-valuetext', '$20');
    expect(start).toHaveAccessibleDescription('Per night');
    expect(end).toHaveAccessibleDescription('Per night');
    expect(screen.getByRole('status').textContent).toBe('$20 – $80');
  });

  it('defaults to the full scale and takes custom thumb labels', () => {
    render(
      <UIProvider messages={{ from: 'Von', to: 'Bis' }}>
        <RangeSlider label="Hours" minValue={6} maxValue={22} />
        <RangeSlider label="Size" startLabel="Smallest" endLabel="Largest" />
      </UIProvider>,
    );
    expect(slider('Von Hours')).toHaveValue('6');
    expect(slider('Bis Hours')).toHaveValue('22');
    expect(slider('Smallest Size')).toBeInTheDocument();
    expect(slider('Largest Size')).toBeInTheDocument();
  });

  it('moves each thumb with the keyboard and reports [start, end]', async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    render(
      <RangeSlider
        label="Range"
        defaultValue={[20, 80]}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />,
    );
    await userEvent.keyboard('{Tab}');
    expect(slider('From Range')).toHaveFocus();
    expect(thumbOf(slider('From Range'))).toHaveAttribute('data-focus-visible', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith([21, 80]);
    expect(onChangeEnd).toHaveBeenLastCalledWith([21, 80]);
    await userEvent.keyboard('{Tab}');
    expect(slider('To Range')).toHaveFocus();
    await userEvent.keyboard('{PageDown}');
    expect(onChange).toHaveBeenLastCalledWith([21, 70]);
  });

  it('keeps the thumbs from crossing', async () => {
    const onChange = vi.fn();
    render(<RangeSlider label="Range" defaultValue={[40, 60]} onChange={onChange} />);
    await userEvent.keyboard('{Tab}{End}');
    // The start thumb stops at the end thumb.
    expect(slider('From Range')).toHaveValue('60');
    expect(slider('From Range')).toHaveAttribute('max', '60');
    await userEvent.keyboard('{ArrowRight}');
    expect(slider('From Range')).toHaveValue('60');
    await userEvent.keyboard('{Tab}{Home}');
    expect(slider('To Range')).toHaveValue('60');
    expect(onChange).toHaveBeenLastCalledWith([60, 60]);
  });

  it('moves the nearest thumb to a clicked point on the track', async () => {
    const onChange = vi.fn();
    render(
      <div style={{ width: 300 }}>
        <RangeSlider label="Range" defaultValue={[20, 80]} onChange={onChange} />
      </div>,
    );
    const track = thumbOf(slider('From Range')).parentElement;
    if (!track) {
      throw new Error('track not found');
    }
    const { width, height } = track.getBoundingClientRect();
    await userEvent.click(track, { position: { x: width * 0.9, y: height / 2 } });
    await expect.poll(() => Number(slider('To Range').value)).toBeCloseTo(90, -1);
    expect(slider('From Range')).toHaveValue('20');
  });

  it.runIf(hasTouch)('moves the nearest thumb when the track is tapped', async () => {
    const onChange = vi.fn();
    render(<RangeSlider label="Range" defaultValue={[0, 30]} onChange={onChange} />);
    // A tap lands in the middle of the track, nearer the end thumb.
    await commands.tap('div:has(> div > div > input[type="range"])');
    await expect.poll(() => Number(slider('To Range').value)).toBeCloseTo(50, -1);
    expect(slider('From Range')).toHaveValue('0');
  });

  it('follows a controlled value', async () => {
    function Controlled() {
      const [range, setRange] = useState<[number, number]>([10, 20]);
      return (
        <>
          <RangeSlider label="Range" value={range} onChange={setRange} isValueHidden />
          <output>{range.join('-')}</output>
          <button
            type="button"
            onClick={() => {
              setRange([0, 100]);
            }}
          >
            All
          </button>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.keyboard('{Tab}{ArrowLeft}');
    expect(screen.getByRole('status').textContent).toBe('9-20');
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(slider('From Range')).toHaveValue('0');
    expect(slider('To Range')).toHaveValue('100');
  });

  it('shows the error message when invalid and marks both thumbs invalid', () => {
    render(
      <RangeSlider
        label="Window"
        defaultValue={[50, 52]}
        isInvalid
        errorMessage="Choose a window of at least 5 hours"
      />,
    );
    for (const name of ['From Window', 'To Window']) {
      expect(slider(name)).toHaveAttribute('aria-invalid', 'true');
      expect(slider(name)).toHaveAccessibleDescription('Choose a window of at least 5 hours');
    }
  });

  it('takes a ref, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(<RangeSlider label="Range" ref={ref} className="mt-2" data-testid="range" />);
    expect(ref.current).toBe(screen.getByTestId('range'));
    expect(ref.current?.className).toContain('mt-2');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <RangeSlider label="Price" description="Help" defaultValue={[20, 80]} />
        <RangeSlider
          label="Hours"
          minValue={0}
          maxValue={24}
          step={1}
          ticks={[
            { value: 0, label: '00:00' },
            { value: 12, label: '12:00' },
            { value: 24, label: '24:00' },
          ]}
        />
        <RangeSlider label="Invalid" isInvalid errorMessage="Too narrow" />
        <RangeSlider label="Disabled" isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
