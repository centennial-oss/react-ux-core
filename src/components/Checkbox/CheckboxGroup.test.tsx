import { render, screen, within } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Checkbox } from './Checkbox';
import { CheckboxGroup } from './CheckboxGroup';

const hasTouch = navigator.maxTouchPoints > 0;

function Channels(props: Partial<Parameters<typeof CheckboxGroup>[0]>) {
  return (
    <CheckboxGroup label="Channels" {...props}>
      <Checkbox value="email">Email</Checkbox>
      <Checkbox value="sms">SMS</Checkbox>
      <Checkbox value="push">Push</Checkbox>
    </CheckboxGroup>
  );
}

function box(name: string) {
  return screen.getByRole('checkbox', { name });
}

/** The box around an element's text itself, without its padding. */
function textRect(element: HTMLElement): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect();
}

describe('CheckboxGroup', () => {
  it('is a labelled, described group of checkboxes', () => {
    render(<Channels description="Where we send alerts" />);
    const group = screen.getByRole('group', { name: 'Channels' });
    expect(group).toHaveAccessibleDescription('Where we send alerts');
    expect(within(group).getAllByRole('checkbox')).toHaveLength(3);
  });

  it('reports the array of checked values, uncontrolled from defaultValue', async () => {
    const onChange = vi.fn();
    render(<Channels defaultValue={['sms']} onChange={onChange} />);
    expect(box('SMS')).toBeChecked();
    await userEvent.click(screen.getByText('Push'));
    expect(onChange).toHaveBeenLastCalledWith(['sms', 'push']);
    await userEvent.click(screen.getByText('SMS'));
    expect(onChange).toHaveBeenLastCalledWith(['push']);
    expect(box('SMS')).not.toBeChecked();
  });

  it('moves with Tab and toggles with Space', async () => {
    const onChange = vi.fn();
    render(<Channels onChange={onChange} />);
    await userEvent.keyboard('{Tab}');
    expect(box('Email')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(['email']);
    await userEvent.keyboard('{Tab} ');
    expect(box('SMS')).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith(['email', 'sms']);
  });

  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState<string[]>(['email']);
      return (
        <>
          <Channels value={value} onChange={setValue} />
          <output>{value.join(',')}</output>
          <button
            type="button"
            onClick={() => {
              setValue([]);
            }}
          >
            Clear
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(box('Email')).toBeChecked();
    await userEvent.click(screen.getByText('Push'));
    expect(screen.getByRole('status').textContent).toBe('email,push');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(box('Email')).not.toBeChecked();
    expect(box('Push')).not.toBeChecked();
  });

  it('shows the error message and marks every option invalid', () => {
    render(<Channels isInvalid errorMessage="Choose at least one channel" />);
    const group = screen.getByRole('group', { name: 'Channels' });
    expect(group).toHaveAccessibleDescription(/Choose at least one channel/);
    expect(screen.getByText('Choose at least one channel')).toBeInTheDocument();
    for (const item of screen.getAllByRole('checkbox')) {
      expect(item).toHaveAttribute('aria-invalid', 'true');
    }
  });

  it('marks a required group and disables every option', () => {
    const { unmount } = render(<Channels isRequired />);
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    unmount();
    render(<Channels isDisabled />);
    for (const item of screen.getAllByRole('checkbox')) {
      expect(item).toBeDisabled();
    }
  });

  it('stacks options vertically by default and lays them out in a wrapping row when horizontal', () => {
    const { unmount } = render(<Channels />);
    const [email, sms] = ['Email', 'SMS'].map((name) =>
      screen.getByText(name).getBoundingClientRect(),
    );
    expect(sms?.top).toBeGreaterThanOrEqual(email?.bottom ?? 0);
    unmount();

    render(<Channels orientation="horizontal" />);
    const [emailRow, smsRow] = ['Email', 'SMS'].map((name) =>
      screen.getByText(name).getBoundingClientRect(),
    );
    expect(smsRow?.top).toBeCloseTo(emailRow?.top ?? 0, 0);
    expect(smsRow?.left).toBeGreaterThan(emailRow?.right ?? 0);
  });

  it('wraps a horizontal group in a narrow container without overflowing', () => {
    render(
      <div style={{ width: 160 }} data-testid="column">
        <CheckboxGroup label="Days" orientation="horizontal">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
            <Checkbox key={day} value={day}>
              {day}
            </Checkbox>
          ))}
        </CheckboxGroup>
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
        <Channels labelPosition="side" />
      </div>,
    );
    const label = textRect(screen.getByText('Channels'));
    const first = textRect(screen.getByText('Email'));
    expect(label.right).toBeLessThanOrEqual(first.left);
    const centre = (rect: DOMRect) => rect.top + rect.height / 2;
    expect(Math.abs(centre(label) - centre(first))).toBeLessThanOrEqual(3);
  });

  it('takes a ref, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Channels ref={ref} className="mt-3" data-testid="group" />);
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Channels' }));
    expect(screen.getByTestId('group')).toBe(ref.current);
    expect(ref.current?.className).toContain('mt-3');
  });

  it.runIf(hasTouch)('toggles options when tapped', async () => {
    const onChange = vi.fn();
    render(<Channels onChange={onChange} />);
    await commands.tap('label:has(input[value="sms"])');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['sms']);
    for (const item of screen.getAllByRole('checkbox')) {
      expect(item.closest('label')?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Channels description="Help" isRequired />
        <Channels orientation="horizontal" defaultValue={['email']} />
        <Channels isInvalid errorMessage="Choose one" />
        <Channels isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
