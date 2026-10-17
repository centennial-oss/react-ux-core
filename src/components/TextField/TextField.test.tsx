import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { TextField } from './TextField';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

describe('TextField', () => {
  it('is labelled and described, and calls onChange with the string value', async () => {
    const onChange = vi.fn();
    render(
      <TextField label="Company name" description="As shown on invoices" onChange={onChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Company name' });
    expect(input).toHaveAccessibleDescription('As shown on invoices');
    await userEvent.type(input, 'Acme');
    expect(onChange).toHaveBeenLastCalledWith('Acme');
  });

  it('shows the error message when invalid and marks the input invalid', () => {
    render(
      <TextField
        label="Email"
        isInvalid
        errorMessage="Enter a valid email address"
        defaultValue="nope"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription(/Enter a valid email address/);
  });

  it('marks required fields with aria-required and a hidden asterisk', () => {
    render(<TextField label="Name" isRequired />);
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState('Acme');
      return (
        <>
          <TextField
            label="Name"
            value={value}
            onChange={(next) => {
              setValue(next.toUpperCase());
            }}
          />
          <span data-testid="value">{value}</span>
        </>
      );
    }
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.type(input, 'x');
    expect(input).toHaveValue('ACMEX');
  });

  it('sets keyboard and autofill hints by type', () => {
    render(
      <>
        <TextField label="Email" type="email" />
        <TextField label="Phone" type="tel" />
        <TextField label="Search" type="search" />
      </>,
    );
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveAttribute('inputmode', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(email).toHaveAttribute('autocapitalize', 'none');
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveAttribute('inputmode', 'tel');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveAttribute(
      'enterkeyhint',
      'search',
    );
  });

  it('shows and hides a password', async () => {
    render(<TextField label="Password" type="password" defaultValue="secret" />);
    const input = screen.getByLabelText('Password', { selector: 'input' });
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('clears its value with the clear button and keeps focus in the input', async () => {
    const onChange = vi.fn();
    render(<TextField label="Name" isClearable defaultValue="Acme" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('renders prefix and suffix adornments', () => {
    render(<TextField label="Rate" prefix="USD" suffix="/ kWh" />);
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('/ kWh')).toBeInTheDocument();
  });

  it('puts side labels beside the input in wide containers and on top in narrow ones', () => {
    render(
      <>
        {}
        <div style={{ width: 600 }}>
          <TextField label="Wide" labelPosition="side" />
        </div>
        {}
        <div style={{ width: 300 }}>
          <TextField label="Narrow" labelPosition="side" />
        </div>
      </>,
    );
    const wideInput = screen.getByRole('textbox', { name: 'Wide' }).getBoundingClientRect();
    const wideLabel = screen.getByText('Wide').getBoundingClientRect();
    expect(wideLabel.right).toBeLessThanOrEqual(wideInput.left);
    const narrowInput = screen.getByRole('textbox', { name: 'Narrow' }).getBoundingClientRect();
    const narrowLabel = screen.getByText('Narrow').getBoundingClientRect();
    expect(narrowLabel.bottom).toBeLessThanOrEqual(narrowInput.top);
  });

  it.runIf(isPhone)('uses at least 16px text on phones so iOS does not zoom', () => {
    render(<TextField label="Name" />);
    expect(
      parseFloat(getComputedStyle(screen.getByRole('textbox', { name: 'Name' })).fontSize),
    ).toBeGreaterThanOrEqual(16);
  });

  it.runIf(hasTouch)('is at least the minimum touch target tall on touch screens', () => {
    render(<TextField label="Name" size="sm" />);
    const box = screen
      .getByRole('textbox', { name: 'Name' })
      .parentElement?.getBoundingClientRect();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  it('shows a character count under the field, linked to the input', async () => {
    render(
      <TextField
        label="Title"
        description="Shown in search results"
        maxLength={10}
        hasCharacterCount
        defaultValue="Moon"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Title' });
    expect(screen.getByText('4 / 10')).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription('Shown in search results 4 / 10');
    await userEvent.type(input, 's of Mars');
    expect(input).toHaveValue('Moons of M');
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
  });

  it('warns past the recommended length without making the field invalid, and announces it once', async () => {
    render(
      <TextField
        label="SEO title"
        recommendedLength={10}
        hasCharacterCount
        defaultValue="Saturn"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'SEO title' });
    const counter = screen.getByText('6 / 10 recommended');
    expect(counter).not.toHaveAttribute('data-over-recommended');
    await userEvent.type(input, ' rings');
    const over = screen.getByText('12 / 10, longer than recommended');
    expect(over).toHaveAttribute('data-over-recommended', 'true');
    expect(over.className).toContain('text-warning-fg');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('12 / 10, longer than recommended');
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('Longer than the recommended 10 characters');
  });

  it('shows the recommended-length warning even without hasCharacterCount, and with a maximum', () => {
    render(
      <>
        <TextField label="Plain" recommendedLength={3} defaultValue="Ab" />
        <TextField label="Over" recommendedLength={3} defaultValue="Abcd" />
        <TextField label="Max" recommendedLength={3} maxLength={8} defaultValue="Abcde" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Plain' })).not.toHaveAttribute('aria-describedby');
    expect(screen.getByText('4 / 3, longer than recommended')).toBeInTheDocument();
    expect(screen.getByText('5 / 8, longer than the recommended 3')).toBeInTheDocument();
  });

  it('takes the counter strings from the messages', () => {
    render(
      <UIProvider
        messages={{
          recommendedCharacterCount: ({
            count,
            recommended,
          }: {
            count: number;
            recommended: number;
          }) => `${count} von ${recommended}`,
        }}
      >
        <TextField label="Title" recommendedLength={60} hasCharacterCount defaultValue="abc" />
      </UIProvider>,
    );
    expect(screen.getByText('3 von 60')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <TextField label="Title" recommendedLength={5} hasCharacterCount defaultValue="Jupiter" />
        <TextField label="Code" maxLength={8} hasCharacterCount defaultValue="M31" />
        <TextField label="Name" description="Help" isRequired />
        <TextField label="Email" type="email" isInvalid errorMessage="Required" />
        <TextField label="Password" type="password" />
        <TextField label="Rate" prefix="USD" isClearable defaultValue="12" />
        <TextField aria-label="Unlabelled visually" placeholder="Search" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
