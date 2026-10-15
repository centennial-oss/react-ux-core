import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { SecretReveal } from './SecretReveal';

const items = [
  { id: 'key', label: 'Key', value: 'tco_7hq2kx4m', isSecret: false },
  { id: 'secret', label: 'Secret', value: 'q8Wn3vT1zLp6Rk2YbH9sDf4Gc7Jm5Ae0' },
];

describe('SecretReveal', () => {
  it('warns that the values won’t be shown again, and masks secrets until revealed', async () => {
    render(<SecretReveal items={items} />);
    expect(screen.getByText('Copy these now')).toBeInTheDocument();
    expect(screen.getByText('tco_7hq2kx4m')).toBeInTheDocument();
    expect(screen.queryByText(items[1]?.value ?? '')).toBeNull();
    // Only secrets have a show button.
    expect(screen.queryByRole('button', { name: 'Show Key' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Show Secret' }));
    expect(screen.getByText(items[1]?.value ?? '')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide Secret' }));
    expect(screen.queryByText(items[1]?.value ?? '')).toBeNull();
  });

  it('copies a value, even while it’s masked', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<SecretReveal items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy Secret' }));
    expect(writeText).toHaveBeenCalledWith(items[1]?.value);
    writeText.mockRestore();
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{ secretsTitle: 'Save these', showSecret: ({ label }) => `Reveal ${label}` }}
      >
        <SecretReveal items={items} warning="Shown once." />
      </UIProvider>,
    );
    expect(screen.getByText('Save these')).toBeInTheDocument();
    expect(screen.getByText('Shown once.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal Secret' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SecretReveal items={items} />);
    await expectNoAxeViolations(container);
  });
});
