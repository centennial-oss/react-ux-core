import { render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { Slider } from './Slider';

const hasTouch = navigator.maxTouchPoints > 0;

function slider(name: string) {
  return screen.getByRole<HTMLInputElement>('slider', { name });
}

/** The thumb element around a slider's input, and the track around the thumb. */
function parts(input: HTMLElement) {
  const thumb = input.parentElement?.parentElement;
  const track = thumb?.parentElement;
  if (!thumb || !track) {
    throw new Error('slider structure not found');
  }
  return { thumb, track };
}

describe('Slider', () => {
  it('is a labelled, described slider showing its formatted value', () => {
    render(
      <Slider
        label="Brightness"
        description="Applies to every screen"
        defaultValue={0.4}
        formatOptions={{ style: 'percent' }}
        minValue={0}
        maxValue={1}
        step={0.01}
      />,
    );
    const input = slider('Brightness');
    expect(input).toHaveValue('0.4');
    expect(input).toHaveAttribute('aria-valuetext', '40%');
    expect(input).toHaveAccessibleDescription('Applies to every screen');
    expect(screen.getByText('40%').tagName).toBe('OUTPUT');
  });

  it('starts at minValue without a value', () => {
    render(<Slider label="Volume" minValue={10} maxValue={20} />);
    expect(slider('Volume')).toHaveValue('10');
  });

  it('moves with arrow keys, PageUp/PageDown and Home/End, and reports onChangeEnd per key', async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    render(
      <Slider label="Volume" defaultValue={50} onChange={onChange} onChangeEnd={onChangeEnd} />,
    );
    await userEvent.keyboard('{Tab}');
    const input = slider('Volume');
    expect(input).toHaveFocus();
    const { thumb } = parts(input);
    expect(thumb).toHaveAttribute('data-focus-visible', 'true');
    expect(getComputedStyle(thumb).outlineStyle).toBe('solid');

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(51);
    expect(onChangeEnd).toHaveBeenLastCalledWith(51);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(49);
    await userEvent.keyboard('{PageUp}');
    expect(onChange).toHaveBeenLastCalledWith(59);
    await userEvent.keyboard('{PageDown}{PageDown}');
    expect(onChange).toHaveBeenLastCalledWith(39);
    await userEvent.keyboard('{End}');
    expect(input).toHaveValue('100');
    await userEvent.keyboard('{Home}');
    expect(input).toHaveValue('0');
    expect(onChangeEnd).toHaveBeenLastCalledWith(0);
  });

  it('snaps to step for discrete values', async () => {
    const onChange = vi.fn();
    render(<Slider label="Rating" maxValue={10} step={2} defaultValue={4} onChange={onChange} />);
    await userEvent.keyboard('{Tab}{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(6);
  });

  it('jumps to a clicked point on the track and follows a drag', async () => {
    const onChange = vi.fn();
    render(
      <div style={{ width: 300 }}>
        <Slider label="Volume" defaultValue={50} onChange={onChange} />
      </div>,
    );
    const input = slider('Volume');
    const { thumb, track } = parts(input);
    const { width, height } = track.getBoundingClientRect();
    await userEvent.click(track, { position: { x: width * 0.75, y: height / 2 } });
    await expect.poll(() => Number(input.value)).toBeCloseTo(75, -1);

    await userEvent.dragAndDrop(thumb, track, {
      targetPosition: { x: width * 0.25, y: height / 2 },
    });
    await expect.poll(() => Number(input.value)).toBeLessThan(35);
    expect(Number(input.value)).toBeGreaterThan(15);
  });

  it.runIf(hasTouch)('jumps to a tapped point, with a touch-sized thumb', async () => {
    const onChange = vi.fn();
    render(<Slider label="Volume" defaultValue={0} onChange={onChange} />);
    // A tap lands in the middle of the track.
    await commands.tap('div:has(> div > div > input[type="range"])');
    await expect.poll(() => Number(slider('Volume').value)).toBeCloseTo(50, -1);
    const { thumb, track } = parts(slider('Volume'));
    const rect = thumb.getBoundingClientRect();
    const before = getComputedStyle(thumb, '::before');
    expect(rect.height - parseFloat(before.top) - parseFloat(before.bottom)).toBeGreaterThanOrEqual(
      44,
    );
    expect(rect.width - parseFloat(before.left) - parseFloat(before.right)).toBeGreaterThanOrEqual(
      44,
    );
    expect(track.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it('formats the value with formatOptions and the provider locale', () => {
    render(
      <UIProvider locale="de-DE">
        <Slider
          label="Budget"
          minValue={0}
          maxValue={5000}
          defaultValue={1250}
          formatOptions={{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }}
        />
      </UIProvider>,
    );
    // Intl puts a no-break space before the euro sign.
    expect(slider('Budget').getAttribute('aria-valuetext')).toMatch(/^1\.250\s€$/);
    expect(screen.getByRole('status').textContent).toMatch(/^1\.250\s€$/);
  });

  it('hides the value with isValueHidden', () => {
    render(<Slider label="Volume" defaultValue={30} isValueHidden />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(slider('Volume')).toHaveAttribute('aria-valuetext', '30');
  });

  it('draws ticks and their labels under the matching points', () => {
    render(
      <div style={{ width: 320 }}>
        <Slider
          label="Speed"
          defaultValue={50}
          ticks={[
            { value: 0, label: 'Slow' },
            { value: 50, label: 'Normal' },
            { value: 100, label: 'Fast' },
          ]}
        />
      </div>,
    );
    const { track } = parts(slider('Speed'));
    const trackRect = track.getBoundingClientRect();
    const slow = screen.getByText('Slow').getBoundingClientRect();
    const normal = screen.getByText('Normal').getBoundingClientRect();
    const fast = screen.getByText('Fast').getBoundingClientRect();
    // End labels align with the track's ends; middle labels centre under their tick.
    expect(slow.left).toBeCloseTo(trackRect.left, 0);
    expect(fast.right).toBeCloseTo(trackRect.right, 0);
    expect((normal.left + normal.right) / 2).toBeCloseTo((trackRect.left + trackRect.right) / 2, 0);
    expect(slow.top).toBeGreaterThanOrEqual(trackRect.bottom - 1);
  });

  it('fits a narrow container without overflowing the page, even at its ends', () => {
    render(
      <div style={{ width: 200 }} data-testid="column">
        <Slider
          label="Level"
          defaultValue={100}
          ticks={[
            { value: 0, label: 'Minimum' },
            { value: 100, label: 'Maximum' },
          ]}
        />
      </div>,
    );
    const column = screen.getByTestId('column');
    const columnRect = column.getBoundingClientRect();
    const thumbRect = parts(slider('Level')).thumb.getBoundingClientRect();
    expect(thumbRect.right).toBeLessThanOrEqual(columnRect.right);
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState(20);
      return (
        <>
          <Slider label="Volume" value={value} onChange={setValue} isValueHidden />
          <output>{value}</output>
          <button
            type="button"
            onClick={() => {
              setValue(90);
            }}
          >
            Loud
          </button>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.keyboard('{Tab}{ArrowRight}');
    expect(screen.getByRole('status').textContent).toBe('21');
    await userEvent.click(screen.getByRole('button', { name: 'Loud' }));
    expect(slider('Volume')).toHaveValue('90');
  });

  it('stays put when a controlled value is not updated', async () => {
    const onChange = vi.fn();
    render(<Slider label="Volume" value={20} onChange={onChange} />);
    await userEvent.keyboard('{Tab}{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(21);
    expect(slider('Volume')).toHaveValue('20');
  });

  it('shows the error message when invalid and marks the thumb invalid', () => {
    render(<Slider label="Threshold" isInvalid errorMessage="Too low for this site" />);
    const input = slider('Threshold');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Too low for this site');
    // The error shows only while invalid.
    render(<Slider label="Valid" errorMessage="Hidden" />);
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('cannot be moved when disabled', async () => {
    const onChange = vi.fn();
    render(<Slider label="Volume" isDisabled defaultValue={10} onChange={onChange} />);
    const input = slider('Volume');
    expect(input).toBeDisabled();
    await userEvent.keyboard('{Tab}');
    expect(input).not.toHaveFocus();
    const { track } = parts(input);
    await userEvent.click(track, { force: true });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes aria-label, a ref, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Slider aria-label="Zoom" ref={ref} className="mt-2" data-testid="zoom" defaultValue={5} />,
    );
    expect(slider('Zoom')).toBeInTheDocument();
    expect(ref.current).toBe(screen.getByTestId('zoom'));
    expect(ref.current?.className).toContain('mt-2');
    expect(screen.getByRole('group', { name: 'Zoom' })).toBe(ref.current);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Slider label="Volume" description="Help" defaultValue={30} />
        <Slider
          label="Speed"
          step={50}
          ticks={[{ value: 0, label: 'Slow' }, { value: 50 }, { value: 100, label: 'Fast' }]}
        />
        <Slider label="Invalid" isInvalid errorMessage="Too low" />
        <Slider label="Disabled" isDisabled defaultValue={60} />
        <Slider aria-label="Unlabelled visually" isValueHidden />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
