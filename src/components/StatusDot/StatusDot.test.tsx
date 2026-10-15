import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { StatusDot } from './StatusDot';

const TONES = ['neutral', 'accent', 'success', 'warning', 'danger'] as const;

describe('StatusDot', () => {
  it('always has a text label, visible by default', () => {
    render(<StatusDot tone="success" label="Online" />);
    expect(screen.getByText('Online')).not.toHaveClass('sr-only');
  });

  it('keeps a hidden label available to assistive technology', () => {
    render(<StatusDot tone="danger" label="Offline" isLabelHidden />);
    expect(screen.getByText('Offline')).toHaveClass('sr-only');
  });

  it('uses a different shape for every tone, so colour is never the only signal', () => {
    const { container } = render(
      <>
        {TONES.map((tone) => (
          <StatusDot key={tone} tone={tone} label={tone} />
        ))}
      </>,
    );
    const shapes = [...container.querySelectorAll('svg')].map((svg) => svg.innerHTML);
    expect(new Set(shapes).size).toBe(TONES.length);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        {TONES.map((tone) => (
          <StatusDot key={tone} tone={tone} label={tone} />
        ))}
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
