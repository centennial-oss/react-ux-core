import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { FinanceMessages } from './messages';
import { ProbabilityBar } from './ProbabilityBar';

describe('ProbabilityBar', () => {
  it('labels both sides with their percentages, which add up to 100', () => {
    render(<ProbabilityBar yes={0.625} />);
    expect(screen.getByText('Yes 63%')).toBeVisible();
    expect(screen.getByText('No 37%')).toBeVisible();
  });

  it('takes custom labels and names the group', () => {
    render(
      <ProbabilityBar
        yes={0.4}
        labels={{ yes: 'Visible', no: 'Not visible' }}
        aria-label="Comet visibility"
      />,
    );
    const group = screen.getByRole('group', { name: 'Comet visibility' });
    expect(group.textContent).toEqual(expect.stringContaining('Visible 40%'));
    expect(group.textContent).toEqual(expect.stringContaining('Not visible 60%'));
  });

  it('clamps out-of-range values and draws a single part at the extremes', () => {
    const { container, rerender } = render(<ProbabilityBar yes={1.4} />);
    expect(screen.getByText('Yes 100%')).toBeInTheDocument();
    expect(screen.getByText('No 0%')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')?.children).toHaveLength(1);
    rerender(<ProbabilityBar yes={Number.NaN} />);
    expect(screen.getByText('Yes 0%')).toBeInTheDocument();
  });

  it('puts the labels beside the bar when small', () => {
    const { container } = render(<ProbabilityBar yes={0.62} size="sm" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.size).toBe('sm');
    expect(getComputedStyle(root).flexDirection).toBe('row');
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={
          {
            yes: 'Oui',
            probabilityValue: ({ label, percent }) => `${percent} ${label}`,
          } satisfies Partial<FinanceMessages & Messages> as Partial<Messages>
        }
      >
        <ProbabilityBar yes={0.62} />
      </UIProvider>,
    );
    expect(screen.getByText('62% Oui')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <ProbabilityBar yes={0.62} />
        <ProbabilityBar yes={0.62} size="sm" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
