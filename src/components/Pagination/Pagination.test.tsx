import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { PaginationMessages } from './messages';
import { pageItems, Pagination } from './Pagination';

const hasTouch = navigator.maxTouchPoints > 0;
const isPhone = window.innerWidth < 640;

describe('pageItems', () => {
  it('lists every page when there are seven or fewer', () => {
    expect(pageItems(0, 0)).toEqual([]);
    expect(pageItems(5, 2)).toEqual([0, 1, 2, 3, 4]);
    expect(pageItems(7, 6)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('collapses the gaps with an ellipsis, always in seven slots', () => {
    expect(pageItems(49, 0)).toEqual([0, 1, 2, 3, 4, 'end-ellipsis', 48]);
    expect(pageItems(49, 3)).toEqual([0, 1, 2, 3, 4, 'end-ellipsis', 48]);
    expect(pageItems(49, 4)).toEqual([0, 'start-ellipsis', 3, 4, 5, 'end-ellipsis', 48]);
    expect(pageItems(49, 45)).toEqual([0, 'start-ellipsis', 44, 45, 46, 47, 48]);
    expect(pageItems(49, 48)).toEqual([0, 'start-ellipsis', 44, 45, 46, 47, 48]);
    expect(pageItems(49, 99)).toEqual([0, 'start-ellipsis', 44, 45, 46, 47, 48]);
  });
});

describe('Pagination', () => {
  it('is a navigation landmark with the range and the current page marked', () => {
    render(
      <Pagination
        mode="offset"
        pageIndex={5}
        pageSize={25}
        total={1203}
        onPageIndexChange={() => undefined}
        isCompact={false}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getByText('126–150 of 1,203')).toBeInTheDocument();
    const current = within(nav).getByRole('button', { name: 'Page 6' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(
      within(nav)
        .getAllByRole('button', { name: /^Page / })
        .map((button) => button.textContent),
    ).toEqual(['1', '5', '6', '7', '49']);
    expect(nav.textContent).toContain('…');
  });

  it('pages with previous, next and the page numbers', async () => {
    const onPageIndexChange = vi.fn();
    render(
      <Pagination
        mode="offset"
        pageIndex={0}
        pageSize={10}
        total={42}
        onPageIndexChange={onPageIndexChange}
        isCompact={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageIndexChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    expect(onPageIndexChange).toHaveBeenLastCalledWith(3);
    onPageIndexChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Page 1' }));
    expect(onPageIndexChange).not.toHaveBeenCalled();
  });

  it.runIf(!hasTouch)('works from the keyboard', async () => {
    const onPageIndexChange = vi.fn();
    render(
      <Pagination
        mode="offset"
        pageIndex={1}
        pageSize={10}
        total={42}
        onPageIndexChange={onPageIndexChange}
        isCompact={false}
      />,
    );
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onPageIndexChange).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard('{Tab}{Tab}{Tab} ');
    expect(onPageIndexChange).toHaveBeenLastCalledWith(2);
  });

  it.runIf(hasTouch)('pages with a touch tap', async () => {
    const onPageIndexChange = vi.fn();
    render(
      <Pagination
        mode="offset"
        pageIndex={1}
        pageSize={10}
        total={42}
        onPageIndexChange={onPageIndexChange}
      />,
    );
    await commands.tap('[aria-label="Next page"]');
    expect(onPageIndexChange).toHaveBeenCalledWith(2);
  });

  it('is compact on phones: no page numbers or page-size choice', () => {
    render(
      <Pagination
        mode="offset"
        pageIndex={0}
        pageSize={10}
        total={42}
        onPageIndexChange={() => undefined}
        pageSizeOptions={[10, 25]}
        onPageSizeChange={() => undefined}
      />,
    );
    const pageButtons = screen.queryAllByRole('button', { name: /^Page / });
    expect(pageButtons.length).toBe(isPhone ? 0 : 5);
    expect(screen.queryAllByText('Items per page').length).toBe(isPhone ? 0 : 1);
  });

  it.runIf(!isPhone)('offers a page-size choice', async () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        mode="offset"
        pageIndex={0}
        pageSize={10}
        total={42}
        onPageIndexChange={() => undefined}
        pageSizeOptions={[10, 25]}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Items per page/ }));
    await userEvent.click(await screen.findByRole('option', { name: '25' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('pages by cursor, with an approximate total or the page’s count', async () => {
    const onNext = vi.fn();
    const { rerender } = render(
      <Pagination
        mode="cursor"
        hasPrevious={false}
        hasNext
        onPrevious={() => undefined}
        onNext={onNext}
        approximateTotal={1200}
      />,
    );
    expect(screen.getByText('About 1,200 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Page / })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onNext).toHaveBeenCalledOnce();
    rerender(
      <Pagination
        mode="cursor"
        hasPrevious
        hasNext={false}
        onPrevious={() => undefined}
        onNext={onNext}
        pageItemCount={25}
      />,
    );
    expect(screen.getByText('25 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('disables every control', () => {
    render(
      <Pagination
        mode="offset"
        pageIndex={1}
        pageSize={10}
        total={42}
        onPageIndexChange={() => undefined}
        isCompact={false}
        isDisabled
      />,
    );
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  it('takes the app’s strings from UIProvider and its own label', () => {
    const overrides: Partial<PaginationMessages> = {
      itemRange: ({ start, end, total }) => `${start} bis ${end} von ${total}`,
      pageNumber: ({ page }) => `Seite ${page}`,
      nextPage: 'Weiter',
    };
    render(
      <UIProvider locale="de-DE" messages={overrides as Partial<Messages>}>
        <Pagination
          mode="offset"
          pageIndex={0}
          pageSize={25}
          total={1203}
          onPageIndexChange={() => undefined}
          isCompact={false}
          aria-label="Suchergebnisse"
        />
      </UIProvider>,
    );
    const nav = screen.getByRole('navigation', { name: 'Suchergebnisse' });
    expect(within(nav).getByText('1 bis 25 von 1.203')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Seite 2' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="p-2">
        <Pagination
          mode="offset"
          pageIndex={5}
          pageSize={25}
          total={1203}
          onPageIndexChange={() => undefined}
          pageSizeOptions={[25, 50]}
          onPageSizeChange={() => undefined}
        />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
