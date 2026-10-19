import { render, screen } from '@testing-library/react';
import { Check } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its text with tone and variant classes', () => {
    render(
      <Badge variant="solid" tone="danger">
        3 failed
      </Badge>,
    );
    const badge = screen.getByText('3 failed');
    expect(badge.className).toContain('bg-danger-solid');
    expect(badge.className).toContain('text-danger-on-solid');
  });

  it('hides its icon from assistive technology and passes through attributes', () => {
    render(
      <Badge icon={Check} data-testid="badge" aria-label="Verified account">
        Verified
      </Badge>,
    );
    const badge = screen.getByTestId('badge');
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(badge).toHaveAttribute('aria-label', 'Verified account');
  });

  it('has no accessibility violations in any variant', async () => {
    const { container } = render(
      <>
        {(['solid', 'soft', 'outline'] as const).map((variant) =>
          (['neutral', 'accent', 'success', 'warning', 'danger'] as const).map((tone) => (
            <Badge key={`${variant}-${tone}`} variant={variant} tone={tone}>
              {tone}
            </Badge>
          )),
        )}
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
