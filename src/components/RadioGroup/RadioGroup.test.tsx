import { render, screen, within } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Radio, RadioGroup, type RadioGroupProps } from './RadioGroup';

const hasTouch = navigator.maxTouchPoints > 0;

type Plan = 'free' | 'pro' | 'team';

function Plans(props: Partial<RadioGroupProps<Plan>>) {
  return (
    <RadioGroup<Plan> label="Plan" {...props}>
      <Radio value="free">Free</Radio>
      <Radio value="pro" description="For growing teams">
        Pro
      </Radio>
      <Radio value="team">Team</Radio>
    </RadioGroup>
  );
}

function radio(name: string) {
  return screen.getByRole('radio', { name });
}

/** The box around an element's text itself, without its padding. */
function textRect(element: HTMLElement): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect();
}

describe('RadioGroup', () => {
  it('is a labelled, described radio group with described options', () => {
    render(<Plans description="Billed monthly" />);
    const group = screen.getByRole('radiogroup', { name: 'Plan' });
    expect(group).toHaveAccessibleDescription('Billed monthly');
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(radio('Pro')).toHaveAccessibleDescription(/For growing teams/);
    expect(group).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('chooses with the pointer and reports the value, uncontrolled', async () => {
    const onChange = vi.fn();
    render(<Plans defaultValue="free" onChange={onChange} />);
    expect(radio('Free')).toBeChecked();
    await userEvent.click(screen.getByText('Team'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('team');
    expect(radio('Team')).toBeChecked();
    expect(radio('Free')).not.toBeChecked();
  });

  it('moves the choice with arrow keys and leaves with one Tab', async () => {
    const onChange = vi.fn();
    render(
      <>
        <Plans defaultValue="free" onChange={onChange} />
        <button type="button">After</button>
      </>,
    );
    await userEvent.keyboard('{Tab}');
    expect(radio('Free')).toHaveFocus();
    expect(radio('Free').closest('label')).toHaveAttribute('data-focus-visible', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(radio('Pro')).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('pro');
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('team');
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('pro');
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('follows a controlled value, including null for no choice', async () => {
    function Controlled() {
      const [plan, setPlan] = useState<Plan | null>(null);
      return (
        <>
          <Plans value={plan} onChange={setPlan} />
          <output>{plan ?? 'none'}</output>
          <button
            type="button"
            onClick={() => {
              setPlan(null);
            }}
          >
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    for (const item of screen.getAllByRole('radio')) {
      expect(item).not.toBeChecked();
    }
    await userEvent.click(screen.getByText('Pro'));
    expect(screen.getByRole('status').textContent).toBe('pro');
    expect(radio('Pro')).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(radio('Pro')).not.toBeChecked();
  });

  it('stays put when a controlled value is not updated', async () => {
    const onChange = vi.fn();
    render(<Plans value="free" onChange={onChange} />);
    await userEvent.click(screen.getByText('Team'));
    expect(onChange).toHaveBeenCalledWith('team');
    expect(radio('Free')).toBeChecked();
  });

  it('shows the error message and marks the options invalid', () => {
    render(<Plans isInvalid errorMessage="Choose a plan" />);
    const group = screen.getByRole('radiogroup', { name: 'Plan' });
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(group).toHaveAccessibleDescription(/Choose a plan/);
    expect(screen.getByText('Choose a plan')).toBeInTheDocument();
    expect(radio('Free').closest('label')).toHaveAttribute('data-invalid', 'true');
  });

  it('skips disabled options and disables the whole group', async () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <RadioGroup label="Size" defaultValue="s" onChange={onChange}>
        <Radio value="s">Small</Radio>
        <Radio value="m" isDisabled>
          Medium
        </Radio>
        <Radio value="l">Large</Radio>
      </RadioGroup>,
    );
    expect(radio('Medium')).toBeDisabled();
    await userEvent.keyboard('{Tab}{ArrowDown}');
    expect(radio('Large')).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('l');
    unmount();

    render(<Plans isDisabled isRequired />);
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    for (const item of screen.getAllByRole('radio')) {
      expect(item).toBeDisabled();
    }
  });

  it('lays out horizontally in a wrapping row', () => {
    render(<Plans orientation="horizontal" />);
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-orientation', 'horizontal');
    const [free, pro] = ['Free', 'Pro'].map((name) =>
      screen.getByText(name).getBoundingClientRect(),
    );
    expect(pro?.top).toBeCloseTo(free?.top ?? 0, 0);
    expect(pro?.left).toBeGreaterThan(free?.right ?? 0);
  });

  it('wraps in a narrow container without overflowing the page', () => {
    render(
      <div style={{ width: 150 }} data-testid="column">
        <Plans orientation="horizontal" />
      </div>,
    );
    const column = screen.getByTestId('column');
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('lines up a side label with the first option in wide containers', () => {
    render(
      <div style={{ width: 600 }}>
        <Plans labelPosition="side" />
      </div>,
    );
    const label = textRect(screen.getByText('Plan'));
    const first = textRect(screen.getByText('Free'));
    expect(label.right).toBeLessThanOrEqual(first.left);
    const centre = (rect: DOMRect) => rect.top + rect.height / 2;
    expect(Math.abs(centre(label) - centre(first))).toBeLessThanOrEqual(3);
  });

  it('takes a ref, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Plans ref={ref} className="mt-3" data-testid="plans" />);
    expect(ref.current).toBe(screen.getByRole('radiogroup', { name: 'Plan' }));
    expect(screen.getByTestId('plans')).toBe(ref.current);
    expect(ref.current?.className).toContain('mt-3');
  });

  it.runIf(hasTouch)('chooses when tapped, with touch-sized targets', async () => {
    const onChange = vi.fn();
    render(<Plans onChange={onChange} />);
    await commands.tap('label:has(input[value="team"])');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('team');
    for (const item of screen.getAllByRole('radio')) {
      expect(item.closest('label')?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Plans description="Help" isRequired defaultValue="pro" />
        <Plans orientation="horizontal" />
        <Plans isInvalid errorMessage="Choose one" />
        <Plans isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
