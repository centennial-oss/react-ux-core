import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { Card } from './Card';

describe('Card', () => {
  it('is a region labelled by its title, at the given heading level', () => {
    render(
      <Card title="Customers" headingLevel={2}>
        Body
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Customers' })).toBeInTheDocument();
  });

  it('renders description, actions, body and footer', () => {
    render(
      <Card
        title="Customers"
        description="Active this month"
        icon={Users}
        actions={<Button size="sm">Add</Button>}
        footer="Updated just now"
      >
        123 customers
      </Card>,
    );
    expect(screen.getByText('Active this month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByText('123 customers')).toBeInTheDocument();
    expect(screen.getByText('Updated just now')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Card title="Customers" description="Active this month" footer="Footer">
        Body
      </Card>,
    );
    await expectNoAxeViolations(container);
  });
});
