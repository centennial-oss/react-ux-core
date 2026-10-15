import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Grid, Inline, Spacer, Stack } from './Layout';

describe('Layout', () => {
  it('stacks children in a column, as the element asked for', () => {
    render(
      <Stack as="ul" gap="lg" align="center" aria-label="Steps">
        <li>One</li>
        <li>Two</li>
      </Stack>,
    );
    const list = screen.getByRole('list', { name: 'Steps' });
    expect(list).toHaveClass('flex-col', 'gap-6', 'items-center');
  });

  it('lays out a wrapping row, which can stay on one line', () => {
    const { rerender } = render(<Inline data-testid="row">A</Inline>);
    expect(screen.getByTestId('row')).toHaveClass('flex', 'flex-wrap', 'items-center', 'gap-2');
    rerender(
      <Inline data-testid="row" allowsWrapping={false} justify="between">
        A
      </Inline>,
    );
    expect(screen.getByTestId('row')).not.toHaveClass('flex-wrap');
    expect(screen.getByTestId('row')).toHaveClass('justify-between');
  });

  it('sets columns by the container’s width, or fills it with items of a minimum width', () => {
    const { rerender } = render(
      <Grid data-testid="grid" columns={{ base: 1, sm: 2, lg: 4 }}>
        <span>A</span>
      </Grid>,
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid-cols-1', '@sm:grid-cols-2', '@5xl:grid-cols-4');
    expect(grid.parentElement).toHaveClass('@container');
    rerender(
      <Grid data-testid="grid" minItemWidth="16rem">
        <span>A</span>
      </Grid>,
    );
    expect(screen.getByTestId('grid').style.gridTemplateColumns).toContain('16rem');
    expect(screen.getByTestId('grid')).not.toHaveClass('grid-cols-1');
  });

  it('pushes what follows a Spacer to the end, hidden from assistive technology', () => {
    const { container } = render(
      <Inline>
        <span>Start</span>
        <Spacer />
        <span>End</span>
      </Inline>,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('flex-1');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Stack>
        <Inline>
          <span>A</span>
          <Spacer />
          <span>B</span>
        </Inline>
        <Grid>
          <span>C</span>
          <span>D</span>
        </Grid>
      </Stack>,
    );
    await expectNoAxeViolations(container);
  });
});
