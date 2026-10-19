import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { questions, type Question } from '../../test/questions';
import { TwoLineCell } from './cells';
import { columnsFor } from './columns';
import { DataTable } from './DataTable';

const col = columnsFor<Question>();

function Questions({ titleLines = 1 }: { titleLines?: 1 | 2 }) {
  return (
    <div style={{ width: 900 }} data-testid="container">
      <DataTable<Question>
        aria-label="Questions"
        rows={questions}
        getRowId={(row) => row.id}
        columns={[
          col.field('question', {
            header: 'Question',
            isRowHeader: true,
            isFlexible: true,
            cell: ({ row }) => (
              <TwoLineCell
                title={row.question}
                subtitle={row.domain}
                titleLines={titleLines}
                href={`/questions/${row.id}`}
              />
            ),
          }),
          col.field('domain', { header: 'Domain', maxWidth: '10rem' }),
          col.field('difficulty', { header: 'Difficulty' }),
          col.field('attempts', { header: 'Attempts', align: 'end' }),
        ]}
      />
    </div>
  );
}

describe('DataTable truncation', () => {
  it('clamps long titles in the flexible column instead of widening the table', () => {
    render(<Questions />);
    const container = screen.getByTestId('container');
    const scroller = container.querySelector('table')?.parentElement;
    expect(scroller?.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    expect(screen.getAllByRole('columnheader')[0]).toHaveClass('w-full', 'max-w-0');
  });

  it('keeps the full text as the row link’s name', () => {
    render(<Questions titleLines={2} />);
    const question = questions[1]?.question ?? '';
    expect(screen.getByRole('link', { name: question })).toBeInTheDocument();
    expect(screen.getByText(question)).toHaveClass('line-clamp-2');
  });

  it('shows the full title in a tooltip on keyboard focus, only while it’s clamped', async () => {
    const short: Question = {
      id: 's',
      question: 'Short question',
      domain: 'Gravity and orbits',
      difficulty: 'Easy',
      attempts: 1,
    };
    render(
      <div style={{ width: 900 }}>
        <DataTable<Question>
          aria-label="Questions"
          rows={[...questions.slice(0, 1), short]}
          getRowId={(row) => row.id}
          columns={[
            col.field('question', {
              header: 'Question',
              isRowHeader: true,
              isFlexible: true,
              cell: ({ row }) => <TwoLineCell title={row.question} href={`/questions/${row.id}`} />,
            }),
            col.field('difficulty', { header: 'Difficulty' }),
          ]}
        />
      </div>,
    );
    const long = questions[0]?.question ?? '';
    await expect.poll(() => document.activeElement === document.body).toBe(true);
    const link = screen.getByRole('link', { name: long });
    // Tab past the table's scroll area (focusable so it can be scrolled) to the first row's link.
    for (let step = 0; step < 3 && document.activeElement !== link; step++) {
      await userEvent.keyboard('{Tab}');
    }
    expect(link).toHaveFocus();
    expect((await screen.findByRole('tooltip')).textContent).toBe(long);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('link', { name: 'Short question' })).toHaveFocus();
    await expect.poll(() => screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps the other columns at their content’s width', () => {
    render(<Questions />);
    const difficulty = screen.getAllByRole('cell').find((cell) => cell.textContent === 'Medium');
    expect(difficulty?.firstElementChild).toHaveClass('w-max');
  });

  it('lays a table without a flexible column out as usual', () => {
    render(
      <div style={{ width: 900 }}>
        <DataTable<Question>
          aria-label="Questions"
          rows={questions}
          getRowId={(row) => row.id}
          columns={[
            col.field('question', { header: 'Question', isRowHeader: true }),
            col.field('difficulty', { header: 'Difficulty' }),
          ]}
        />
      </div>,
    );
    expect(screen.getAllByRole('columnheader')[0]).not.toHaveClass('w-full');
    expect(screen.getAllByRole('cell')[0]?.querySelector('.w-max')).toBeNull();
  });

  it('holds a column within its maximum width', () => {
    render(<Questions />);
    const domain = screen
      .getAllByRole('cell')
      .find((cell) => cell.textContent === questions[0]?.domain);
    expect(domain?.firstElementChild).toHaveStyle({ maxWidth: '10rem' });
  });
});
