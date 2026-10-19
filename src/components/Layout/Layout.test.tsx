import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Grid, Inline, Spacer, Stack } from './Layout';

describe('Stack', () => {
  it('stacks children in a column by default, stretched, with the md gap', () => {
    render(<Stack data-testid="stack">A</Stack>);
    expect(screen.getByTestId('stack')).toHaveClass('flex', 'flex-col', 'gap-4', 'items-stretch');
    expect(screen.getByTestId('stack')).not.toHaveClass('flex-wrap');
  });

  it('lays out a row, centred, which wraps only when asked', () => {
    const { rerender } = render(
      <Stack data-testid="row" direction="row" gap="xs" justify="between">
        A
      </Stack>,
    );
    const row = screen.getByTestId('row');
    expect(row).toHaveClass('flex-row', 'gap-1', 'items-center', 'justify-between');
    expect(row).not.toHaveClass('flex-wrap');
    rerender(
      <Stack data-testid="row" direction="row" isWrapping align="baseline" gap="xl">
        A
      </Stack>,
    );
    expect(screen.getByTestId('row')).toHaveClass('flex-wrap', 'items-baseline', 'gap-8');
  });

  it.each([
    ['none', 'gap-0'],
    ['xs', 'gap-1'],
    ['sm', 'gap-2'],
    ['md', 'gap-4'],
    ['lg', 'gap-6'],
    ['xl', 'gap-8'],
  ] as const)('maps gap %s to %s', (gap, className) => {
    render(<Stack data-testid="stack" gap={gap} />);
    expect(screen.getByTestId('stack')).toHaveClass(className);
  });

  it('renders each child of a list in an li, and a labelled section', () => {
    render(
      <>
        <Stack as="ol" aria-label="Steps">
          <span>One</span>
          <span>Two</span>
        </Stack>
        <Stack as="section" aria-label="Summary">
          <span>Text</span>
        </Stack>
      </>,
    );
    const list = screen.getByRole('list', { name: 'Steps' });
    expect(list.tagName).toBe('OL');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['One', 'Two']);
    expect(screen.getByRole('region', { name: 'Summary' }).tagName).toBe('SECTION');
  });

  it('wraps a row with Inline, pushing what follows a Spacer to the end', () => {
    const { container } = render(
      <Inline data-testid="row">
        <span>Start</span>
        <Spacer />
        <span>End</span>
      </Inline>,
    );
    expect(screen.getByTestId('row')).toHaveClass('flex-row', 'flex-wrap', 'gap-2');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('flex-1');
  });
});

describe('Grid', () => {
  it('defaults to one column, two from sm and three from lg, by the container’s width', () => {
    render(<Grid data-testid="grid" />);
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid', 'gap-4', 'grid-cols-1', '@sm:grid-cols-2', '@5xl:grid-cols-3');
    expect(grid.parentElement).toHaveClass('@container');
  });

  it('takes a fixed count, counts by container width, or a minimum item width', () => {
    const { rerender } = render(<Grid data-testid="grid" columns={4} gap="sm" />);
    expect(screen.getByTestId('grid')).toHaveClass('grid-cols-4', 'gap-2');
    rerender(<Grid data-testid="grid" columns={{ base: 2, md: 3, xl: 6 }} />);
    expect(screen.getByTestId('grid')).toHaveClass(
      'grid-cols-2',
      '@2xl:grid-cols-3',
      '@7xl:grid-cols-6',
    );
    rerender(<Grid data-testid="grid" minItemWidth="16rem" />);
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))]');
    expect(grid).not.toHaveClass('grid-cols-1');
  });

  it('renders each child of a list in an li', () => {
    render(
      <Grid as="ul" aria-label="Tiles">
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </Grid>,
    );
    expect(
      within(screen.getByRole('list', { name: 'Tiles' })).getAllByRole('listitem'),
    ).toHaveLength(3);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Stack>
        <Inline>
          <span>A</span>
          <Spacer />
          <span>B</span>
        </Inline>
        <Grid as="ul" aria-label="Tiles">
          <span>C</span>
          <span>D</span>
        </Grid>
      </Stack>,
    );
    await expectNoAxeViolations(container);
  });
});
