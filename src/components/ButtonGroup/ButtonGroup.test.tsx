import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { ButtonGroup } from './ButtonGroup';

function Footer({ width }: { width: number }) {
  return (
    <div style={{ width }}>
      <ButtonGroup aria-label="Dialog actions">
        <Button variant="outline">Cancel</Button>
        <Button tone="accent">Save</Button>
      </ButtonGroup>
    </div>
  );
}

describe('ButtonGroup', () => {
  it('lays buttons out in a row in wide containers', () => {
    render(<Footer width={600} />);
    const group = screen.getByRole('group', { name: 'Dialog actions' });
    expect(getComputedStyle(group).flexDirection).toBe('row');
  });

  it('stacks full width in narrow containers, primary (last) on top', () => {
    render(<Footer width={300} />);
    const group = screen.getByRole('group', { name: 'Dialog actions' });
    expect(getComputedStyle(group).flexDirection).toBe('column-reverse');
    const save = screen.getByRole('button', { name: 'Save' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(save.getBoundingClientRect().top).toBeLessThan(cancel.getBoundingClientRect().top);
    expect(save.getBoundingClientRect().width).toBeCloseTo(300, 0);
  });
});
