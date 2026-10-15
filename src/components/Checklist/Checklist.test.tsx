import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { Button } from '../Button';
import { Checklist, type ChecklistStep } from './Checklist';

const steps: ChecklistStep[] = [
  { id: 'users', title: 'Add users', status: 'done' },
  {
    id: 'settings',
    title: 'Confirm site settings',
    status: 'current',
    description: 'Time zone and currency.',
    action: <Button size="sm">Confirm</Button>,
  },
  { id: 'driver', title: 'Register a driver', status: 'todo' },
  {
    id: 'tariff',
    title: 'Create a tariff',
    status: 'blocked',
    description: 'Waiting for settings.',
  },
];

describe('Checklist', () => {
  it('lists the steps in order, each with its status in words', () => {
    render(<Checklist label="Site setup" steps={steps} />);
    const list = screen.getByRole('list', { name: 'Site setup' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Done'),
      expect.stringContaining('Up next'),
      expect.stringContaining('To do'),
      expect.stringContaining('Blocked'),
    ]);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { level: 3, name: 'Confirm site settings' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('summarises progress, which can be hidden', () => {
    const { rerender } = render(<Checklist label="Site setup" steps={steps} />);
    const progress = screen.getByRole('progressbar', { name: 'Site setup' });
    expect(progress).toHaveAttribute('aria-valuetext', '1 of 4 done');
    rerender(<Checklist label="Site setup" steps={steps} isProgressHidden />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          checklistStatus: ({ status }) => status.toUpperCase(),
          checklistProgress: ({ done, total }) => `${done}/${total}`,
        }}
      >
        <Checklist label="Setup" steps={steps} headingLevel={2} />
      </UIProvider>,
    );
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Setup' })).toHaveAttribute(
      'aria-valuetext',
      '1/4',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Add users' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Checklist label="Site setup" steps={steps} />);
    await expectNoAxeViolations(container);
  });
});
