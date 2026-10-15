import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Chip } from './Chip';

describe('Chip', () => {
  it('shows a label without a remove button by default', () => {
    render(<Chip>Region: North</Chip>);
    expect(screen.getByText('Region: North')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('has its own focusable remove button named with the chip label', async () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Region: North</Chip>);
    const remove = screen.getByRole('button', { name: 'Remove Region: North' });
    await userEvent.keyboard('{Tab}');
    expect(remove).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('disables the remove button', () => {
    render(
      <Chip onRemove={() => undefined} isDisabled>
        Locked
      </Chip>,
    );
    expect(screen.getByRole('button', { name: 'Remove Locked' })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Chip>Plain</Chip>
        <Chip tone="accent" onRemove={() => undefined}>
          Removable
        </Chip>
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
