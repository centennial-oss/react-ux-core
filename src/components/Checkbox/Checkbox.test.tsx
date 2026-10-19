import { render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Checkbox } from './Checkbox';

const hasTouch = navigator.maxTouchPoints > 0;

describe('Checkbox', () => {
  it('is a labelled, described checkbox that toggles with the pointer', async () => {
    const onChange = vi.fn();
    render(
      <Checkbox description="We'll never share it" onChange={onChange}>
        Subscribe
      </Checkbox>,
    );
    const box = screen.getByRole('checkbox', { name: 'Subscribe' });
    expect(box).toHaveAccessibleDescription("We'll never share it");
    await userEvent.click(screen.getByText('Subscribe'));
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(box).toBeChecked();
    expect(box.closest('label')?.querySelector('svg')).not.toBeNull();
    await userEvent.click(screen.getByText('Subscribe'));
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(box).not.toBeChecked();
  });

  it('toggles with Space and shows a focus ring for keyboard focus', async () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange}>Remember me</Checkbox>);
    await userEvent.keyboard('{Tab}');
    const box = screen.getByRole('checkbox', { name: 'Remember me' });
    expect(box).toHaveFocus();
    const indicator = box.closest('label')?.querySelector('[aria-hidden="true"]');
    expect(indicator && getComputedStyle(indicator).outlineStyle).toBe('solid');
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('starts from defaultSelected when uncontrolled', () => {
    render(<Checkbox defaultSelected>Agree</Checkbox>);
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeChecked();
  });

  it('follows a controlled value and stays put when the parent does not update it', async () => {
    function Controlled() {
      const [isChecked, setChecked] = useState(false);
      return (
        <>
          <Checkbox isSelected={isChecked} onChange={setChecked}>
            Terms
          </Checkbox>
          <button
            type="button"
            onClick={() => {
              setChecked(true);
            }}
          >
            Check
          </button>
        </>
      );
    }
    const { unmount } = render(<Controlled />);
    const box = screen.getByRole('checkbox', { name: 'Terms' });
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(box).toBeChecked();
    await userEvent.click(screen.getByText('Terms'));
    expect(box).not.toBeChecked();
    unmount();

    const onChange = vi.fn();
    render(
      <Checkbox isSelected onChange={onChange}>
        Fixed
      </Checkbox>,
    );
    await userEvent.click(screen.getByText('Fixed'));
    expect(onChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('checkbox', { name: 'Fixed' })).toBeChecked();
  });

  it('shows a dash and reports mixed when indeterminate', () => {
    render(<Checkbox isIndeterminate>Select all</Checkbox>);
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all' });
    expect(box.indeterminate).toBe(true);
    expect(box.closest('label')).toHaveAttribute('data-indeterminate', 'true');
    expect(box.closest('label')?.querySelector('svg')).not.toBeNull();
  });

  it('shows an error message and marks the checkbox invalid', () => {
    render(
      <Checkbox isInvalid errorMessage="You must accept the terms">
        I accept
      </Checkbox>,
    );
    const box = screen.getByRole('checkbox', { name: 'I accept' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription(/You must accept the terms/);
    expect(screen.getByText('You must accept the terms')).toBeInTheDocument();
  });

  it('does not toggle when disabled', async () => {
    const onChange = vi.fn();
    render(
      <Checkbox isDisabled onChange={onChange}>
        Disabled
      </Checkbox>,
    );
    expect(screen.getByRole('checkbox', { name: 'Disabled' })).toBeDisabled();
    await userEvent.click(screen.getByText('Disabled'), { force: true });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes a ref, className, aria-label and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Checkbox ref={ref} aria-label="Select row" className="mt-2" data-testid="cb" />);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument();
    expect(ref.current).toBe(screen.getByTestId('cb'));
    expect(ref.current?.className).toContain('mt-2');
  });

  it.runIf(hasTouch)('toggles when tapped, with a touch-sized target', async () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange} aria-label="Select row" />);
    await commands.tap('label');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    const rect = screen.getByRole('checkbox').closest('label')?.getBoundingClientRect();
    expect(rect?.height).toBeGreaterThanOrEqual(44);
    expect(rect?.width).toBeGreaterThanOrEqual(44);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Checkbox description="Help">Labelled</Checkbox>
        <Checkbox defaultSelected>Checked</Checkbox>
        <Checkbox isIndeterminate>Mixed</Checkbox>
        <Checkbox isDisabled>Disabled</Checkbox>
        <Checkbox isInvalid errorMessage="Required">
          Invalid
        </Checkbox>
        <Checkbox aria-label="Unlabelled visually" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
