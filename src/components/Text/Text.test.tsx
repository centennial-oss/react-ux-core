import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Heading, Text } from './Text';

describe('Text', () => {
  it('renders a paragraph in the body size by default', () => {
    render(<Text>Body copy</Text>);
    const text = screen.getByText('Body copy');
    expect(text.tagName).toBe('P');
    expect(text).toHaveClass('text-sm', 'text-fg');
  });

  it('takes an element, size, tone, weight and figure styles', () => {
    render(
      <Text as="span" size="lg" tone="muted" weight="semibold" isMono isNumeric isTruncated>
        1,234.50
      </Text>,
    );
    const text = screen.getByText('1,234.50');
    expect(text.tagName).toBe('SPAN');
    expect(text).toHaveClass(
      'text-lg',
      'text-fg-muted',
      'font-semibold',
      'font-mono',
      'tabular-nums',
      'truncate',
    );
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
        <Text tone="muted">Muted copy</Text>
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
