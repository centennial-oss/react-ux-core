import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { filledIcons as filled } from '../../../test/rating';
import { Rating } from './Rating';
import { RatingDisplay } from './RatingDisplay';
import { iconFill, ratingAt, steppedRating } from './ratingMath';

const hasTouch = navigator.maxTouchPoints > 0;

function slider(name: string) {
  return screen.getByRole<HTMLInputElement>('slider', { name });
}

/** The row of icons around a rating's input, which takes presses. */
function row(input: HTMLElement) {
  const element = input.parentElement;
  if (!element) {
    throw new Error('row not found');
  }
  return element;
}

/** A point `fraction` of the way along the row, from the left. */
function at(element: HTMLElement, fraction: number) {
  const { width, height } = element.getBoundingClientRect();
  return { position: { x: width * fraction, y: height / 2 } };
}

describe('rating arithmetic', () => {
  it('fills icons by the value', () => {
    const fills = [0, 1, 2, 3, 4].map((index) => Math.round(iconFill(3.7, index) * 10) / 10);
    expect(fills).toEqual([1, 1, 1, 0.7, 0]);
  });

  it('takes the icon, or half icon, under a pointer', () => {
    expect(ratingAt(0, 5, 1)).toBe(1);
    expect(ratingAt(0.41, 5, 1)).toBe(3);
    expect(ratingAt(0.6, 5, 1)).toBe(3);
    expect(ratingAt(0.41, 5, 0.5)).toBe(2.5);
    expect(ratingAt(0.5, 5, 0.5)).toBe(2.5);
    expect(ratingAt(0.51, 5, 0.5)).toBe(3);
    expect(ratingAt(1.2, 5, 1)).toBe(5);
  });

  it('steps within the range, to no rating only when clearable', () => {
    const whole = { maxValue: 5, step: 1, isClearable: false };
    expect(steppedRating(null, 1, whole)).toBe(1);
    expect(steppedRating(null, -1, whole)).toBeNull();
    expect(steppedRating(1, -1, whole)).toBe(1);
    expect(steppedRating(5, 1, whole)).toBe(5);
    expect(steppedRating(3.7, 1, whole)).toBe(4);
    expect(steppedRating(3.7, -1, whole)).toBe(3);
    expect(steppedRating(1, -1, { ...whole, isClearable: true })).toBeNull();
    expect(steppedRating(0.5, -1, { maxValue: 5, step: 0.5, isClearable: true })).toBeNull();
  });
});

describe('Rating', () => {
  it('is a labelled slider announcing "N out of M", with its description', () => {
    render(<Rating label="Overall" defaultValue={3} description="How was your stay?" />);
    const input = slider('Overall');
    expect(input).toHaveAttribute('aria-valuetext', '3 out of 5');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '5');
    expect(input).toHaveAccessibleDescription('How was your stay?');
    expect(filled(row(input))).toBeCloseTo(3);
  });

  it('announces no rating when empty', () => {
    render(<Rating label="Overall" />);
    expect(slider('Overall')).toHaveAttribute('aria-valuetext', 'No rating');
  });

  it('steps with arrows, moves a whole icon with PageUp/PageDown and jumps with Home/End', async () => {
    const onChange = vi.fn();
    render(<Rating label="Overall" step={0.5} defaultValue={3} onChange={onChange} />);
    await userEvent.keyboard('{Tab}');
    const input = slider('Overall');
    expect(input).toHaveFocus();
    expect(getComputedStyle(row(input)).outlineStyle).toBe('solid');

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(3.5);
    expect(input).toHaveAttribute('aria-valuetext', '3.5 out of 5');
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(4);
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    await userEvent.keyboard('{PageUp}');
    expect(onChange).toHaveBeenLastCalledWith(4);
    await userEvent.keyboard('{PageDown}{PageDown}');
    expect(onChange).toHaveBeenLastCalledWith(2);
    await userEvent.keyboard('{End}');
    expect(input).toHaveValue('5');
    await userEvent.keyboard('{Home}');
    // Without isClearable, Home is the lowest rating, and Delete does nothing.
    expect(input).toHaveValue('0.5');
    await userEvent.keyboard('{ArrowLeft}{Delete}');
    expect(input).toHaveValue('0.5');
  });

  it('clears with Delete, Backspace or stepping below the lowest rating when clearable', async () => {
    const onChange = vi.fn();
    render(<Rating label="Overall" isClearable defaultValue={2} onChange={onChange} />);
    await userEvent.keyboard('{Tab}{Delete}');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(slider('Overall')).toHaveAttribute('aria-valuetext', 'No rating');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(null);
    await userEvent.keyboard('{ArrowRight}{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('follows the reading direction for Left and Right', async () => {
    render(
      <UIProvider locale="he-IL">
        <div dir="rtl">
          <Rating aria-label="Overall" defaultValue={3} />
        </div>
      </UIProvider>,
    );
    await userEvent.keyboard('{Tab}{ArrowLeft}');
    expect(slider('Overall')).toHaveValue('4');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(slider('Overall')).toHaveValue('2');
  });

  it('takes the icon under a click, and the half under it with half steps', async () => {
    render(
      <>
        <Rating label="Whole" />
        <Rating label="Halves" step={0.5} />
      </>,
    );
    const whole = slider('Whole');
    await userEvent.click(row(whole), at(row(whole), 0.7));
    await expect.poll(() => whole.value).toBe('4');
    expect(whole).toHaveFocus();

    const halves = slider('Halves');
    await userEvent.click(row(halves), at(row(halves), 0.62));
    await expect.poll(() => halves.value).toBe('3.5');
    await userEvent.click(row(halves), at(row(halves), 0.95));
    await expect.poll(() => halves.value).toBe('5');
  });

  it.runIf(!hasTouch)('previews the rating under a hovering mouse', async () => {
    render(<Rating label="Overall" defaultValue={1} />);
    const input = slider('Overall');
    const icons = row(input);
    await userEvent.hover(icons, at(icons, 0.9));
    await expect.poll(() => icons.dataset.previewing).toBe('true');
    expect(filled(icons)).toBeCloseTo(5);
    // Only a preview: the value is unchanged.
    expect(input).toHaveValue('1');
    await userEvent.unhover(icons);
    await expect.poll(() => icons.dataset.previewing).toBeUndefined();
    expect(filled(icons)).toBeCloseTo(1);
  });

  it('clears when the current value is chosen again, only when clearable', async () => {
    render(
      <>
        <Rating label="Clearable" isClearable defaultValue={3} />
        <Rating label="Fixed" defaultValue={3} />
      </>,
    );
    const clearable = slider('Clearable');
    await userEvent.click(row(clearable), at(row(clearable), 0.5));
    await expect.poll(() => clearable.getAttribute('aria-valuetext')).toBe('No rating');
    // The cleared icon doesn't preview again until the pointer moves to another one.
    expect(filled(row(clearable))).toBe(0);

    const fixed = slider('Fixed');
    await userEvent.click(row(fixed), at(row(fixed), 0.5));
    expect(fixed).toHaveValue('3');
  });

  it.runIf(hasTouch)('takes a tap, with icons wide enough to touch', async () => {
    render(<Rating label="Overall" size="sm" />);
    // A tap lands in the middle of the row: the third of five icons.
    await commands.tap('div:has(> input[type="range"])');
    await expect.poll(() => slider('Overall').value).toBe('3');
    const slots = row(slider('Overall')).querySelectorAll(':scope > span');
    for (const slot of slots) {
      const style = getComputedStyle(slot);
      const width =
        slot.getBoundingClientRect().width +
        parseFloat(style.marginLeft) +
        parseFloat(style.marginRight);
      expect(width).toBeGreaterThanOrEqual(24);
    }
    const icons = row(slider('Overall'));
    const before = getComputedStyle(icons, '::before');
    expect(
      icons.getBoundingClientRect().height - parseFloat(before.top) - parseFloat(before.bottom),
    ).toBeGreaterThanOrEqual(44);
  });

  it('ignores keys and presses while disabled', async () => {
    const onChange = vi.fn();
    render(<Rating label="Overall" isDisabled defaultValue={2} onChange={onChange} />);
    const input = slider('Overall');
    expect(input).toBeDisabled();
    await userEvent.click(row(input), { ...at(row(input), 0.9), force: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('2');
  });

  it('is controlled by value', async () => {
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState<number | null>(2);
      return (
        <Rating
          label="Overall"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(
      <>
        <Controlled />
        <Rating label="Fixed" value={4} />
      </>,
    );
    await userEvent.keyboard('{Tab}{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(slider('Overall')).toHaveValue('3');
    // A controlled value the app doesn't update stays put.
    await userEvent.keyboard('{Tab}{ArrowRight}');
    expect(slider('Fixed')).toHaveValue('4');
  });

  it('shows the error while invalid', () => {
    render(<Rating label="Overall" isInvalid errorMessage="Choose a rating" />);
    const input = slider('Overall');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Choose a rating');
    expect(screen.getByText('Choose a rating')).toBeVisible();
  });

  it('submits its value with a form', () => {
    render(
      <form aria-label="Review">
        <Rating label="Overall" name="overall" defaultValue={4} />
      </form>,
    );
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Review' });
    expect(new FormData(form).get('overall')).toBe('4');
  });

  it('shows keyboard changes and clearing while the mouse is over the icons', async () => {
    render(<Rating label="Overall" isClearable />);
    const input = slider('Overall');
    await userEvent.click(row(input), at(row(input), 0.5));
    await expect.poll(() => input.value).toBe('3');
    // The mouse stays over the third icon.
    await userEvent.keyboard('{ArrowRight}');
    expect(input).toHaveValue('4');
    expect(filled(row(input))).toBeCloseTo(4);
    await userEvent.keyboard('{Delete}');
    expect(input).toHaveAttribute('aria-valuetext', 'No rating');
    expect(filled(row(input))).toBe(0);
  });

  it('follows the page’s layout direction, not the locale’s, for presses and arrows', async () => {
    render(
      <div dir="rtl">
        <Rating aria-label="Overall" />
      </div>,
    );
    const input = slider('Overall');
    // The rightmost icon is the first one right to left.
    await userEvent.click(row(input), at(row(input), 0.95));
    await expect.poll(() => input.value).toBe('1');
    await userEvent.keyboard('{ArrowLeft}');
    expect(input).toHaveValue('2');
  });

  it('keeps a fractional value exact in the input and when submitted', () => {
    render(
      <form aria-label="Review">
        <Rating label="Average" name="average" value={3.7} />
      </form>,
    );
    const input = slider('Average');
    expect(input).toHaveValue('3.7');
    expect(input).toHaveAttribute('aria-valuetext', '3.7 out of 5');
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Review' });
    expect(new FormData(form).get('average')).toBe('3.7');
  });

  it('moves one step when a screen reader adjusts the input', () => {
    const onChange = vi.fn();
    render(<Rating label="Overall" defaultValue={3} onChange={onChange} />);
    const input = slider('Overall');
    // Assistive technology sets the native input's value; with step "any" it may land between steps.
    Reflect.set(HTMLInputElement.prototype, 'value', '3.01', input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  describe('read-only', () => {
    it('stays a focusable slider, announced read-only, that doesn’t change', async () => {
      const onChange = vi.fn();
      render(
        <form aria-label="Review">
          <Rating label="Overall" name="overall" isReadOnly value={3.7} onChange={onChange} />
        </form>,
      );
      const input = slider('Overall');
      expect(input).toHaveAttribute('aria-readonly', 'true');
      expect(input).not.toBeDisabled();
      expect(filled(row(input))).toBeCloseTo(3.7, 1);
      await userEvent.keyboard('{Tab}');
      expect(input).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}{End}{Home}');
      await userEvent.click(row(input), at(row(input), 0.1));
      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('3.7');
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Review' });
      expect(new FormData(form).get('overall')).toBe('3.7');
    });

    it('keeps an uncontrolled value when isReadOnly turns on and off', async () => {
      const { rerender } = render(<Rating label="Overall" defaultValue={null} />);
      await userEvent.keyboard('{Tab}{End}{ArrowLeft}');
      expect(slider('Overall')).toHaveValue('4');
      rerender(<Rating label="Overall" defaultValue={null} isReadOnly />);
      expect(slider('Overall')).toHaveAttribute('aria-valuetext', '4 out of 5');
      rerender(<Rating label="Overall" defaultValue={null} />);
      expect(slider('Overall')).toHaveValue('4');
    });
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          ratingValue: ({ value, max }) => `${value} von ${max}`,
          ratingNone: 'Keine Bewertung',
        }}
      >
        <Rating label="Gesamt" />
        <RatingDisplay value={3} />
      </UIProvider>,
    );
    expect(slider('Gesamt')).toHaveAttribute('aria-valuetext', 'Keine Bewertung');
    expect(screen.getByRole('img', { name: '3 von 5' })).toBeVisible();
  });

  it('never scrolls a phone page sideways', () => {
    render(
      <div className="flex flex-col gap-4">
        <Rating label="Ten" maxValue={10} />
        <Rating label="Ten, read-only" isReadOnly value={7} maxValue={10} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <Rating label="Overall" defaultValue={3} description="Out of five" />
        <Rating label="Invalid" isInvalid errorMessage="Required" />
        <Rating label="Disabled" isDisabled defaultValue={2} />
        <Rating isReadOnly label="Read-only" value={3.7} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
