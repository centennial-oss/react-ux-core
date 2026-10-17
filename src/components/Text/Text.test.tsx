import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Heading, Text } from './Text';

describe('Text', () => {
  it('renders a body paragraph by default', () => {
    render(<Text>Body copy</Text>);
    const text = screen.getByText('Body copy');
    expect(text.tagName).toBe('P');
    expect(text).toHaveClass('text-sm', 'text-fg');
  });

  it.each([
    ['muted', ['text-sm', 'text-fg-muted']],
    ['small', ['text-xs', 'text-fg-muted']],
    ['lead', ['text-base', 'text-fg']],
  ] as const)('styles the %s variant', (variant, classes) => {
    render(<Text variant={variant}>Copy</Text>);
    expect(screen.getByText('Copy')).toHaveClass(...classes);
  });

  it('clamps lines visually, keeping the full text', () => {
    const long = 'word '.repeat(200).trim();
    render(
      <Text as="span" lines={2}>
        {long}
      </Text>,
    );
    const text = screen.getByText(long);
    expect(text.tagName).toBe('SPAN');
    expect(text).toHaveClass('line-clamp-2');
    expect(text.textContent).toBe(long);
  });
});

describe('Heading', () => {
  it('renders the level’s element, sized by level unless told otherwise', () => {
    render(
      <>
        <Heading level={2}>Section</Heading>
        <Heading level={3} size="xl">
          Subsection
        </Heading>
      </>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toHaveClass('text-lg');
    expect(screen.getByRole('heading', { level: 3, name: 'Subsection' })).toHaveClass('text-xl');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Heading level={2}>Section</Heading>
        <Text variant="muted">Muted copy</Text>
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
