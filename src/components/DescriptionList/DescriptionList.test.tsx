import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { DescriptionList, type DescriptionItem } from './DescriptionList';

const items: DescriptionItem[] = [
  { id: 'name', label: 'Name', value: 'Acme Corporation' },
  { id: 'account', label: 'Account ID', value: 'ACC-10422', copyValue: 'ACC-10422' },
  {
    id: 'tariff',
    label: 'Tariff',
    value: 'Commercial',
    infoTip: 'The rate plan the customer is billed on.',
  },
  { id: 'phone', label: 'Phone', value: undefined },
  { id: 'created', label: 'Created', value: 'March 2024', isSecondary: true },
];

describe('DescriptionList', () => {
  it('renders label/value pairs as a description list', () => {
    render(<DescriptionList items={items} />);
    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');
    expect(terms).toHaveLength(4);
    expect(definitions).toHaveLength(4);
    expect(terms[0]?.closest('dl')).not.toBeNull();
    expect(definitions[0]?.textContent).toBe('Acme Corporation');
  });

  it('shows an em dash for missing values and reads them as "Not set"', () => {
    render(<DescriptionList items={items} />);
    const phone = screen.getByText('Phone').closest('div');
    expect(phone?.querySelector('dd')?.textContent).toContain('—');
    expect(within(phone as HTMLElement).getByText('Not set')).toHaveClass('sr-only');
  });

  it('explains a label with an InfoTip', () => {
    render(<DescriptionList items={items} />);
    expect(screen.getByRole('button', { name: 'More information' })).toBeInTheDocument();
  });

  it('copies a value to the clipboard and confirms it', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<DescriptionList items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('ACC-10422');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    writeText.mockRestore();
  });

  it('hides secondary rows behind "Show more"', async () => {
    render(<DescriptionList items={items} />);
    expect(screen.queryByText('March 2024')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Show more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByText('March 2024')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('uses one column in narrow containers and several in wide ones', () => {
    render(
      <>
        {}
        <div style={{ width: 300 }} data-testid="narrow">
          <DescriptionList items={items} />
        </div>
        {}
        <div style={{ width: 900 }} data-testid="wide">
          <DescriptionList items={items} />
        </div>
      </>,
    );
    const top = (testId: string, label: string) =>
      within(screen.getByTestId(testId)).getByText(label).getBoundingClientRect().top;
    expect(top('narrow', 'Account ID')).toBeGreaterThan(top('narrow', 'Name'));
    expect(top('wide', 'Account ID')).toBe(top('wide', 'Name'));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DescriptionList items={items} columns={3} />);
    await expectNoAxeViolations(container);
  });
});
