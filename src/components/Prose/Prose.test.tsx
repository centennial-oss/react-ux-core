import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Code } from '../Code';
import { Prose } from './Prose';

describe('Prose', () => {
  it('styles its children at a readable width, which can be turned off', () => {
    const { container, rerender } = render(
      <Prose>
        <p>Paragraph</p>
      </Prose>,
    );
    expect(container.firstElementChild).toHaveClass('max-w-[70ch]', 'text-base');
    rerender(
      <Prose size="sm" isFullWidth>
        <p>Paragraph</p>
      </Prose>,
    );
    expect(container.firstElementChild).not.toHaveClass('max-w-[70ch]');
    expect(container.firstElementChild).toHaveClass('text-sm');
  });

  it('gives lists and inline code real styles', () => {
    render(
      <Prose>
        <ul>
          <li>One</li>
        </ul>
        <p>
          Newton's second law: <code>F = ma</code>
        </p>
      </Prose>,
    );
    expect(getComputedStyle(screen.getByRole('list')).listStyleType).toBe('disc');
    expect(getComputedStyle(screen.getByText('F = ma')).fontFamily).toMatch(/mono/i);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Prose>
        <h2>Heading</h2>
        <p>
          Text with a <a href="/docs">link</a> and <Code>code</Code>.
        </p>
      </Prose>,
    );
    await expectNoAxeViolations(container);
  });
});
