import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('is an indeterminate progressbar labelled "Loading" by default', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('progressbar', { name: 'Loading' });
    expect(spinner).not.toHaveAttribute('aria-valuenow');
  });

  it('uses a custom label, or the translated default', () => {
    render(
      <>
        <Spinner label="Saving" />
        <UIProvider messages={{ loading: 'Chargement' }}>
          <Spinner />
        </UIProvider>
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'Saving' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Chargement' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Spinner />);
    await expectNoAxeViolations(container);
  });
});
