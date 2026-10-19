import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('reports its value and shows a label and value text', () => {
    render(<ProgressBar label="Uploading" value={45} />);
    const bar = screen.getByRole('progressbar', { name: 'Uploading' });
    expect(bar).toHaveAttribute('aria-valuenow', '45');
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('can hide the value text', () => {
    render(<ProgressBar label="Uploading" value={45} isValueHidden />);
    expect(screen.queryByText('45%')).toBeNull();
  });

  it('has no value when indeterminate', () => {
    render(<ProgressBar aria-label="Importing" isIndeterminate />);
    expect(screen.getByRole('progressbar', { name: 'Importing' })).not.toHaveAttribute(
      'aria-valuenow',
    );
  });

  it('formats the value with formatOptions', () => {
    render(
      <ProgressBar
        label="Storage"
        value={7.5}
        maxValue={10}
        formatOptions={{ style: 'unit', unit: 'gigabyte' }}
      />,
    );
    expect(screen.getByRole('progressbar', { name: 'Storage' })).toHaveAttribute(
      'aria-valuetext',
      '7.5 GB',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <ProgressBar label="Uploading" value={45} />
        <ProgressBar aria-label="Importing" isIndeterminate tone="success" size="sm" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
