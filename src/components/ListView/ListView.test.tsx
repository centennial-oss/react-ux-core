import { render, screen, within } from '@testing-library/react';
import { Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { listPeople, teams } from '../../../test/listItems';
import { enableVirtualizer } from '../../../test/virtualizer';
import { UIProvider } from '../../provider/UIProvider';
import { itemText } from '../../utils/text';
import { Badge } from '../Badge/Badge';
import { IconButton } from '../IconButton/IconButton';
import { MenuItem } from '../Menu/Menu';
import { ListView, moveListItems, type ListViewItem } from './ListView';

enableVirtualizer();

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = window.innerWidth >= 1024;

const planets: ListViewItem[] = [
  { id: 'mercury', label: 'Mercury', description: 'The smallest planet', meta: '0 moons' },
  { id: 'venus', label: 'Venus', description: 'The hottest planet', icon: Star },
  { id: 'earth', label: 'Earth', avatar: { name: 'Earth' }, meta: <Badge>Home</Badge> },
];

function rows(name = 'Planets') {
  return within(screen.getByRole('grid', { name })).queryAllByRole('row');
}

function row(label: string) {
  const found = rows().find((candidate) => candidate.textContent.includes(label));
  if (!found) {
    throw new Error(`No row for ${label}`);
  }
  return found;
}

function Selectable({ mode }: { mode: 'single' | 'multiple' }) {
  const [keys, setKeys] = useState<Set<string>>(new Set(['venus']));
  return (
    <>
      <ListView
        aria-label="Planets"
        items={planets}
        selectionMode={mode}
        selectedKeys={keys}
        onSelectionChange={setKeys}
      />
      <output data-testid="keys">{[...keys].sort().join(',')}</output>
    </>
  );
}

/** A row's checkbox, by its visible box (the input itself is visually hidden). */
function checkbox(label: string) {
  const box = within(row(label)).getByRole('checkbox').closest('label');
  if (!box) {
    throw new Error(`No checkbox for ${label}`);
  }
  return box;
}

function keys() {
  return screen.getByTestId('keys').textContent;
}

describe('ListView rows', () => {
  it('shows each row’s label, description, picture and metadata', () => {
    render(<ListView aria-label="Planets" items={planets} />);
    expect(rows().map((candidate) => candidate.textContent)).toEqual([
      'MercuryThe smallest planet0 moons',
      'VenusThe hottest planet',
      expect.stringContaining('Earth'),
    ]);
    // React Aria names a row by its label and description together.
    expect(row('Mercury')).toHaveAccessibleName('Mercury The smallest planet');
    expect(within(row('Earth')).getByRole('img', { name: 'Earth' })).toBeInTheDocument();
    expect(within(row('Earth')).getByText('Home')).toBeInTheDocument();
  });

  it('shows an empty state, the app’s own, and loading rows', () => {
    const { rerender } = render(<ListView aria-label="Planets" items={[]} />);
    expect(screen.getByRole('heading', { name: 'No items' })).toBeInTheDocument();
    rerender(<ListView aria-label="Planets" items={[]} emptyState="Nothing to see" />);
    expect(screen.getByText('Nothing to see')).toBeInTheDocument();
    rerender(<ListView aria-label="Planets" items={[]} isLoading />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('uses the app’s strings from UIProvider', async () => {
    render(
      <UIProvider
        messages={{
          listEmpty: 'Keine Einträge',
          listItemActions: ({ item }) => `Aktionen für ${item}`,
        }}
      >
        <ListView aria-label="Leer" items={[]} />
        <ListView
          aria-label="Planets"
          items={planets}
          rowActions={() => <MenuItem id="open">Öffnen</MenuItem>}
        />
      </UIProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Keine Einträge' })).toBeInTheDocument();
    await expect
      .element(screen.getByRole('button', { name: 'Aktionen für Venus' }))
      .toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ListView
        aria-label="Planets"
        items={planets}
        selectionMode="multiple"
        rowActions={() => <MenuItem id="open">Open</MenuItem>}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('keeps a phone-width page from scrolling sideways', () => {
    render(
      <div className="w-[360px] max-w-full">
        <ListView
          aria-label="Planets"
          items={[
            ...planets,
            {
              id: 'long',
              label: 'A planet with a remarkably long name that has to wrap onto another line',
              description:
                'And a description that is longer than the row is wide, clamped to two lines',
              meta: <Badge>Dwarf planet</Badge>,
            },
          ]}
          selectionMode="multiple"
          isReorderable
          rowActions={() => <MenuItem id="open">Open</MenuItem>}
        />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });
});

describe('ListView selection and actions', () => {
  it('chooses many rows with their checkboxes, controlled', async () => {
    render(<Selectable mode="multiple" />);
    expect(row('Venus')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(checkbox('Earth'));
    expect(keys()).toBe('earth,venus');
    await userEvent.click(checkbox('Venus'));
    expect(keys()).toBe('earth');
    expect(row('Venus')).toHaveAttribute('aria-selected', 'false');
  });

  it('chooses one row at a time in single mode', async () => {
    render(<Selectable mode="single" />);
    await userEvent.click(row('Mercury'));
    expect(keys()).toBe('mercury');
    await userEvent.click(row('Earth'));
    expect(keys()).toBe('earth');
  });

  it('starts from defaultSelectedKeys and reports changes, uncontrolled', async () => {
    const onSelectionChange = vi.fn();
    render(
      <ListView
        aria-label="Planets"
        items={planets}
        selectionMode="multiple"
        defaultSelectedKeys={new Set(['earth'])}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(row('Earth')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(checkbox('Mercury'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['earth', 'mercury']));
    expect(row('Mercury')).toHaveAttribute('aria-selected', 'true');
  });

  it.runIf(isDesktop)('moves with arrow keys and toggles with Space', async () => {
    const onSelectionChange = vi.fn();
    render(
      <ListView
        aria-label="Planets"
        items={planets}
        selectionMode="multiple"
        onSelectionChange={onSelectionChange}
      />,
    );
    await userEvent.keyboard('{Tab}');
    expect(row('Mercury')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(row('Venus')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['venus']));
    // Typeahead.
    await userEvent.keyboard('e');
    expect(row('Earth')).toHaveFocus();
  });

  it('activates a row by press, and by Enter on the desktop', async () => {
    const onAction = vi.fn();
    render(<ListView aria-label="Planets" items={planets} onAction={onAction} />);
    await userEvent.click(row('Venus'));
    expect(onAction).toHaveBeenLastCalledWith('venus');
    if (isDesktop) {
      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(onAction).toHaveBeenLastCalledWith('earth');
    }
  });

  it('activates with a press while nothing is chosen, and toggles once something is', async () => {
    const onAction = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <ListView
        aria-label="Planets"
        items={planets}
        selectionMode="multiple"
        onAction={onAction}
        onSelectionChange={onSelectionChange}
      />,
    );
    await userEvent.click(row('Mercury'));
    expect(onAction).toHaveBeenLastCalledWith('mercury');
    expect(onSelectionChange).not.toHaveBeenCalled();
    await userEvent.click(checkbox('Venus'));
    await userEvent.click(row('Earth'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['venus', 'earth']));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it.runIf(hasTouch)('chooses a row with a touch tap on its checkbox', async () => {
    render(<Selectable mode="multiple" />);
    await commands.tap('[role="row"][data-key="mercury"] label');
    expect(keys()).toBe('mercury,venus');
  });

  it('runs row actions from the menu and from the app’s own controls', async () => {
    const onRowAction = vi.fn();
    const onStar = vi.fn();
    render(
      <ListView
        aria-label="Planets"
        items={planets}
        rowActions={(item) => (
          <>
            <MenuItem id="rename">Rename {itemText(item)}</MenuItem>
            <MenuItem id="delete">Delete</MenuItem>
          </>
        )}
        onRowAction={onRowAction}
        renderActions={(item) => (
          <IconButton
            icon={Star}
            size="sm"
            aria-label={`Star ${itemText(item)}`}
            onPress={() => {
              onStar(item.id);
            }}
          />
        )}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Star Earth' }));
    expect(onStar).toHaveBeenCalledWith('earth');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Venus' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename Venus' }));
    expect(onRowAction).toHaveBeenCalledWith('rename', expect.objectContaining({ id: 'venus' }));
  });

  it.runIf(isDesktop)('reaches a row’s controls with the arrow keys', async () => {
    render(
      <ListView
        aria-label="Planets"
        items={planets}
        rowActions={() => <MenuItem id="open">Open</MenuItem>}
      />,
    );
    await userEvent.keyboard('{Tab}');
    expect(row('Mercury')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Actions for Mercury' })).toHaveFocus();
  });

  it('disables every row with isDisabled, and single rows with their item', async () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <ListView
        aria-label="Planets"
        items={[...planets, { id: 'pluto', label: 'Pluto', isDisabled: true }]}
        onAction={onAction}
      />,
    );
    expect(row('Pluto')).toHaveAttribute('aria-disabled', 'true');
    expect(row('Earth')).not.toHaveAttribute('aria-disabled');
    rerender(<ListView aria-label="Planets" items={planets} onAction={onAction} isDisabled />);
    for (const candidate of rows()) {
      expect(candidate).toHaveAttribute('aria-disabled', 'true');
    }
    await userEvent.click(row('Venus'), { force: true });
    expect(onAction).not.toHaveBeenCalled();
  });
});

const people = listPeople(200);
const sections = teams.map((team) => ({
  id: team,
  title: team,
  items: people.filter((person) => person.team === team),
}));

describe('ListView sections', () => {
  it('groups rows under headings, each group named by its heading', () => {
    render(<ListView aria-label="People" sections={sections.slice(0, 2)} />);
    const grid = screen.getByRole('grid', { name: 'People' });
    const groups = within(grid).getAllByRole('rowgroup');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAccessibleName('Observatory');
    expect(within(grid).getByRole('rowheader', { name: 'Archive' })).toBeInTheDocument();
  });

  it.each([false, true])(
    'keeps the current group’s heading at the top while its rows scroll (virtualized: %s)',
    async (isVirtualized) => {
      render(
        <ListView
          aria-label="People"
          sections={sections}
          isVirtualized={isVirtualized}
          maxHeight="16rem"
        />,
      );
      const grid = screen.getByRole('grid', { name: 'People' });
      await expect.poll(() => within(grid).queryAllByRole('row').length).toBeGreaterThan(3);
      /** How far a heading's row sits from the top of the scroll area, in whole pixels (null when not drawn). */
      const offsetOf = (name: string) => {
        // The rowheader itself has no box (`display: contents`); its row does.
        const heading = within(grid).queryByRole('rowheader', { name })?.closest('[role="row"]');
        return heading
          ? Math.round(heading.getBoundingClientRect().top - grid.getBoundingClientRect().top)
          : null;
      };
      const scrollTo = (top: number) => {
        grid.scrollTop = top;
        grid.dispatchEvent(new Event('scroll'));
      };
      scrollTo(600);
      await expect.poll(() => Math.abs(offsetOf('Observatory') ?? 99)).toBeLessThanOrEqual(1);
      // The next group is further down (and, when virtualized, not drawn yet).
      expect(offsetOf('Archive') ?? Infinity).toBeGreaterThan(100);
      // The next heading takes over once its own group reaches the top (the first group is 50 rows of 55–61px).
      scrollTo(32 + 50 * 61 + 400);
      await expect.poll(() => Math.abs(offsetOf('Archive') ?? 99)).toBeLessThanOrEqual(1);
      expect(offsetOf('Observatory') ?? -99).toBeLessThan(-10);
    },
  );
});

describe('ListView sections in the page and in a sized list', () => {
  afterEach(() => {
    window.scrollTo(0, 0);
  });

  it.each([false, true])(
    'keeps the current heading at the top of a page-scrolled list (virtualized: %s)',
    async (isVirtualized) => {
      render(<ListView aria-label="People" sections={sections} isVirtualized={isVirtualized} />);
      const grid = screen.getByRole('grid', { name: 'People' });
      await expect.poll(() => within(grid).queryAllByRole('row').length).toBeGreaterThan(3);
      window.scrollTo(0, grid.getBoundingClientRect().top + window.scrollY + 600);
      await expect
        .poll(() => {
          const heading = within(grid)
            .queryByRole('rowheader', { name: 'Observatory' })
            ?.closest('[role="row"]');
          return heading ? Math.abs(Math.round(heading.getBoundingClientRect().top)) : null;
        })
        .toBeLessThanOrEqual(1);
    },
  );

  it('sizes each group to its own rows in a list given a height', () => {
    render(
      <ListView
        aria-label="Planets"
        className="h-96"
        maxHeight="100%"
        sections={[
          { id: 'inner', title: 'Inner', items: planets.slice(0, 2) },
          { id: 'outer', title: 'Outer', items: planets.slice(2) },
        ]}
      />,
    );
    const [inner, outer] = within(screen.getByRole('grid', { name: 'Planets' })).getAllByRole(
      'rowgroup',
    );
    expect(inner?.getBoundingClientRect().height).toBeLessThan(200);
    expect(outer?.getBoundingClientRect().height).toBeLessThan(120);
  });
});

describe('ListView virtualization', () => {
  it('renders only the rows in view of 10,000, and the last ones after scrolling', async () => {
    const many = listPeople(10_000);
    render(<ListView aria-label="People" items={many} isVirtualized maxHeight="20rem" />);
    const grid = screen.getByRole('grid', { name: 'People' });
    expect(grid).toHaveAttribute('aria-rowcount', '10000');
    await expect.poll(() => within(grid).queryAllByRole('row').length).toBeGreaterThan(3);
    expect(within(grid).getAllByRole('row').length).toBeLessThan(30);
    grid.scrollTop = grid.scrollHeight;
    grid.dispatchEvent(new Event('scroll'));
    await expect.poll(() => within(grid).queryByText('Edwin Hubble 1250')).not.toBeNull();
    expect(within(grid).getAllByRole('row').length).toBeLessThan(30);
  });

  it.runIf(isDesktop)(
    'moves focus to the end with the keyboard, rendering it on the way',
    async () => {
      const many = listPeople(5_000);
      render(<ListView aria-label="People" items={many} isVirtualized maxHeight="20rem" />);
      await userEvent.keyboard('{Tab}');
      await userEvent.keyboard('{End}');
      await expect.poll(() => document.activeElement?.textContent).toContain('Edwin Hubble 625');
    },
  );

  it('follows the page’s scroll without a height of its own', async () => {
    const many = listPeople(2_000);
    render(<ListView aria-label="People" items={many} isVirtualized />);
    const grid = screen.getByRole('grid', { name: 'People' });
    await expect.poll(() => within(grid).queryAllByRole('row').length).toBeGreaterThan(3);
    expect(within(grid).getAllByRole('row').length).toBeLessThan(60);
  });
});

const twenty = listPeople(20);
const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 300);
  });

/** Scrolls the grid (or, with `page`, the page) to its end and tells listeners. */
function scrollToEnd(grid: HTMLElement, page = false) {
  if (page) {
    window.scrollTo(0, document.documentElement.scrollHeight);
    return;
  }
  grid.scrollTop = grid.scrollHeight;
  grid.dispatchEvent(new Event('scroll'));
}

describe('ListView loading more', () => {
  function Paged({
    shouldLoadOnScroll = true,
    isVirtualized = true,
    isPageScrolled = false,
  }: {
    shouldLoadOnScroll?: boolean;
    isVirtualized?: boolean;
    /** No height of its own: the list scrolls with the page. */
    isPageScrolled?: boolean;
  }) {
    const [count, setCount] = useState(20);
    const [isLoadingMore, setLoadingMore] = useState(false);
    const items = useMemo(() => listPeople(count), [count]);
    return (
      <ListView
        aria-label="People"
        items={items}
        isVirtualized={isVirtualized}
        maxHeight={isPageScrolled ? undefined : '16rem'}
        hasMore={count < 60}
        isLoadingMore={isLoadingMore}
        shouldLoadOnScroll={shouldLoadOnScroll}
        onLoadMore={() => {
          setLoadingMore(true);
          setTimeout(() => {
            setCount((current) => current + 20);
            setLoadingMore(false);
          }, 50);
        }}
      />
    );
  }

  afterEach(() => {
    window.scrollTo(0, 0);
  });

  it('asks for more as the end scrolls into view, showing a spinner meanwhile', async () => {
    render(<Paged />);
    const grid = screen.getByRole('grid', { name: 'People' });
    expect(grid).toHaveAttribute('aria-rowcount', '20');
    scrollToEnd(grid);
    await expect.poll(() => grid.getAttribute('aria-rowcount')).toBe('40');
  });

  it.each([false, true])(
    'asks only once the end of a page-scrolled list comes into view (virtualized: %s)',
    async (isVirtualized) => {
      const onLoadMore = vi.fn();
      render(
        <>
          <div className="h-[3000px]" />
          <ListView
            aria-label="People"
            items={twenty}
            isVirtualized={isVirtualized}
            hasMore
            onLoadMore={onLoadMore}
          />
        </>,
      );
      await settle();
      expect(onLoadMore).not.toHaveBeenCalled();
      scrollToEnd(screen.getByRole('grid', { name: 'People' }), true);
      await expect.poll(() => onLoadMore.mock.calls.length).toBe(1);
      await settle();
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    },
  );

  it('doesn’t load page after page by itself in a page-scrolled feed', async () => {
    render(
      <>
        <div className="h-[3000px]" />
        <Paged isVirtualized={false} isPageScrolled />
      </>,
    );
    await settle();
    expect(within(screen.getByRole('grid', { name: 'People' })).getAllByRole('row')).toHaveLength(
      20,
    );
  });

  it('never asks while the first page or the next one is loading', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <ListView aria-label="People" items={[]} isLoading hasMore onLoadMore={onLoadMore} />,
    );
    await settle();
    rerender(
      <ListView aria-label="People" items={twenty} isLoadingMore hasMore onLoadMore={onLoadMore} />,
    );
    await settle();
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('asks again for a new first page, even one of the same length', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <ListView
        aria-label="People"
        items={twenty}
        maxHeight="16rem"
        hasMore
        onLoadMore={onLoadMore}
      />,
    );
    scrollToEnd(screen.getByRole('grid', { name: 'People' }));
    await expect.poll(() => onLoadMore.mock.calls.length).toBe(1);
    // A search brings a new first page with as many rows.
    rerender(
      <ListView
        aria-label="People"
        items={listPeople(20).map((person) => ({ ...person, id: `match-${person.id}` }))}
        maxHeight="16rem"
        hasMore
        onLoadMore={onLoadMore}
      />,
    );
    scrollToEnd(screen.getByRole('grid', { name: 'People' }));
    await expect.poll(() => onLoadMore.mock.calls.length).toBe(2);
  });

  it('keeps a Load more button, the retry after a failed load, as well as loading on scroll', async () => {
    const onLoadMore = vi.fn();
    render(
      <ListView
        aria-label="People"
        items={twenty}
        maxHeight="16rem"
        hasMore
        onLoadMore={onLoadMore}
      />,
    );
    const grid = screen.getByRole('grid', { name: 'People' });
    scrollToEnd(grid);
    await expect.poll(() => onLoadMore.mock.calls.length).toBe(1);
    // The load failed: the rows didn't change, so scrolling doesn't ask again, but the button does.
    grid.scrollTop = 0;
    grid.dispatchEvent(new Event('scroll'));
    scrollToEnd(grid);
    await settle();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('asks only from the Load more button with shouldLoadOnScroll off', async () => {
    render(<Paged shouldLoadOnScroll={false} />);
    const grid = screen.getByRole('grid', { name: 'People' });
    scrollToEnd(grid);
    await settle();
    expect(grid).toHaveAttribute('aria-rowcount', '20');
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await expect.poll(() => grid.getAttribute('aria-rowcount')).toBe('40');
  });

  it('shows a spinner row while more rows load', () => {
    render(
      <ListView
        aria-label="People"
        items={listPeople(3)}
        hasMore
        isLoadingMore
        onLoadMore={() => undefined}
      />,
    );
    expect(screen.getAllByRole('progressbar', { name: 'Loading' }).length).toBeGreaterThan(0);
  });
});

describe('ListView reordering', () => {
  function Ordered() {
    const [items, setItems] = useState(planets);
    return (
      <>
        <ListView
          aria-label="Planets"
          items={items}
          isReorderable
          onMove={(move) => {
            setItems((current) => moveListItems(current, move));
          }}
        />
        <output data-testid="order">{items.map((item) => item.id).join(',')}</output>
      </>
    );
  }

  it('reorders by keyboard drag and drop from a handle', async () => {
    render(<Ordered />);
    screen.getByRole('button', { name: 'Drag Mercury' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => screen.getByTestId('order').textContent).toBe('venus,mercury,earth');
  });

  it('has no handles unless reorderable', () => {
    render(<ListView aria-label="Planets" items={planets} />);
    expect(screen.queryByRole('button', { name: /^Drag / })).toBeNull();
  });

  it('applies moves to a flat list with moveListItems', () => {
    expect(
      moveListItems(planets, { ids: ['earth'], targetId: 'mercury', position: 'before' }).map(
        (item) => item.id,
      ),
    ).toEqual(['earth', 'mercury', 'venus']);
  });
});

describe('ListView cards and custom rows', () => {
  it('draws a row’s content with renderItem, keeping its handle, checkbox and actions', () => {
    render(
      <ListView
        aria-label="Planets"
        items={planets}
        isReorderable
        selectionMode="multiple"
        rowActions={() => <MenuItem id="open">Open</MenuItem>}
        renderItem={(item) => <em>Custom {itemText(item)}</em>}
      />,
    );
    const mercury = row('Mercury');
    expect(within(mercury).getByText('Custom Mercury').tagName).toBe('EM');
    // The default content (description, metadata) isn't drawn.
    expect(within(mercury).queryByText('The smallest planet')).toBeNull();
    expect(within(mercury).getByRole('button', { name: 'Drag Mercury' })).toBeInTheDocument();
    expect(within(mercury).getByRole('checkbox')).toBeInTheDocument();
    expect(
      within(mercury).getByRole('button', { name: 'Actions for Mercury' }),
    ).toBeInTheDocument();
  });

  it('draws rows as cards spaced apart with variant="cards"', async () => {
    const { container } = render(<ListView aria-label="Planets" items={planets} variant="cards" />);
    const grid = screen.getByRole('grid', { name: 'Planets' });
    expect(grid).toHaveAttribute('data-list-variant', 'cards');
    const [first, second] = rows();
    const gap =
      (second?.getBoundingClientRect().top ?? 0) - (first?.getBoundingClientRect().bottom ?? 0);
    expect(gap).toBe(8);
    expect(first && getComputedStyle(first).borderTopLeftRadius).not.toBe('0px');
    await expectNoAxeViolations(container);
  });

  it('spaces virtualized cards the same way', async () => {
    render(
      <ListView
        aria-label="People"
        items={listPeople(500)}
        variant="cards"
        isVirtualized
        maxHeight="20rem"
      />,
    );
    const grid = screen.getByRole('grid', { name: 'People' });
    await expect.poll(() => within(grid).queryAllByRole('row').length).toBeGreaterThan(2);
    const [first, second] = within(grid).getAllByRole('row');
    await expect
      .poll(
        () =>
          (second?.getBoundingClientRect().top ?? 0) - (first?.getBoundingClientRect().bottom ?? 0),
      )
      .toBe(8);
    expect(within(grid).getAllByRole('row').length).toBeLessThan(30);
  });

  it.runIf(isDesktop)('moves no card while showing the drop line between cards', async () => {
    function Ordered() {
      const [items, setItems] = useState(planets);
      return (
        <ListView
          aria-label="Planets"
          items={items}
          variant="cards"
          isReorderable
          onMove={(move) => {
            setItems((current) => moveListItems(current, move));
          }}
        />
      );
    }
    render(<Ordered />);
    const grid = screen.getByRole('grid', { name: 'Planets' });
    const top = (element: Element) =>
      element.getBoundingClientRect().top - grid.getBoundingClientRect().top;
    const cardTops = () =>
      rows()
        .filter((candidate) => candidate.hasAttribute('data-key'))
        .map(top);
    const before = cardTops();
    screen.getByRole('button', { name: 'Drag Mercury' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');
    // Every drop line is pulled into the gap beside it, so the cards stay where they were.
    expect(cardTops()).toEqual(before);
    // The lines before the first card and after the last sit inside the list's padding.
    const lines = rows().filter((candidate) => !candidate.hasAttribute('data-key'));
    expect(lines.length).toBe(4);
    expect(top(lines[0] as Element)).toBeGreaterThanOrEqual(0);
    expect(
      (lines.at(-1)?.getBoundingClientRect().bottom ?? 0) - grid.getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(0);
    await userEvent.keyboard('{Escape}');
  });
});
