import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows a heading, hint and action', () => {
    render(
      <EmptyState
        icon={Users}
        title="No customers yet"
        hint="Customers appear here once they sign up."
        action={<Button>Invite a customer</Button>}
        headingLevel={2}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'No customers yet' })).toBeInTheDocument();
    expect(screen.getByText('Customers appear here once they sign up.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite a customer' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<EmptyState icon={Users} title="No customers yet" hint="Hint" />);
    await expectNoAxeViolations(container);
  });
});
