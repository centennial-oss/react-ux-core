import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { ScrollRegion } from './ScrollRegion';

const longText = Array.from({ length: 30 }, (_, i) => <p key={i}>Paragraph {i + 1}</p>);

describe('ScrollRegion', () => {
  it('is a named region that scrolls within its maximum height', () => {
    render(
      <ScrollRegion aria-label="Terms of service" maxHeight="8rem">
        {longText}
      </ScrollRegion>,
    );
    const region = screen.getByRole('region', { name: 'Terms of service' });
    expect(region.style.maxHeight).toBe('8rem');
    expect(region.scrollHeight).toBeGreaterThan(region.clientHeight);
  });

  it('takes keyboard focus so it can be scrolled without a mouse', async () => {
    render(<ScrollRegion aria-label="Log">{longText}</ScrollRegion>);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('region', { name: 'Log' })).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ScrollRegion aria-label="Terms">{longText}</ScrollRegion>);
    await expectNoAxeViolations(container);
  });
});
