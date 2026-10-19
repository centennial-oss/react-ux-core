import { render, screen } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { generateOrg, observatoryOrg } from '../../../test/org';
import { UIProvider } from '../../provider/UIProvider';
import { OrgChart, type OrgChartProps } from './OrgChart';

const hasTouch = navigator.maxTouchPoints > 0;
const isPhone = window.innerWidth < 640;
const isDesktop = window.innerWidth >= 1024;

function Observatory(props: Partial<OrgChartProps>) {
  return <OrgChart title="Observatory staff" people={observatoryOrg} {...props} />;
}

function person(name: string): HTMLElement {
  return screen.getByRole('treeitem', { name: new RegExp(`^${name}`) });
}
const queryPerson = (name: string) =>
  screen.queryByRole('treeitem', { name: new RegExp(`^${name}`) });
const toggleOf = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`(people|person) under ${name}$`) });
const centreOf = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};
/** The result position shown beside the search field (the live region repeats it). */
const shownPosition = () =>
  screen
    .getAllByText(/ of \d+$|^No matches$/)
    .filter((element) => !element.closest('[aria-live]'))
    .map((element) => element.textContent);
const settle = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

describe('OrgChart', () => {
  it('is a tree of people named by their cards and described by their place', async () => {
    const { container } = render(<Observatory />);
    const tree = screen.getByRole('tree', { name: 'Observatory staff' });
    expect(tree).toHaveAccessibleDescription(/Down Arrow shows a person’s reports/);
    expect(screen.getByRole('region', { name: 'Observatory staff' })).toHaveAccessibleDescription(
      /26 people\./,
    );
    const ines = person('Ines Okafor');
    expect(ines).toHaveAccessibleName('Ines Okafor Observatory Director');
    expect(ines).toHaveAccessibleDescription('5 direct reports, 25 people in all.');
    expect(ines).toHaveAttribute('aria-level', '1');
    expect(ines).toHaveAttribute('aria-expanded', 'true');
    const kenji = person('Kenji Watanabe');
    expect(kenji).toHaveAttribute('aria-level', '2');
    expect(kenji).toHaveAttribute('aria-posinset', '3');
    expect(kenji).toHaveAttribute('aria-setsize', '5');
    expect(kenji).toHaveAccessibleDescription(
      'Reports to Ines Okafor. 3 direct reports, 8 people in all.',
    );
    // Two levels start expanded: Dev's reports are hidden, and his button says how many there are.
    const dev = person('Dev Malhotra');
    expect(dev).toHaveAttribute('aria-expanded', 'false');
    expect(queryPerson('Rita Costa')).toBeNull();
    expect(toggleOf('Dev Malhotra')).toHaveAccessibleName('Show the 2 people under Dev Malhotra');
    expect(person('Luis Herrera')).toHaveAccessibleName('Luis Herrera Astronomer Remote');
    // One tab stop.
    expect(
      screen
        .getAllByRole('treeitem')
        .filter((item) => item.tabIndex === 0)
        .map((item) => item.dataset.orgNode),
    ).toEqual(['0']);
    await expectNoAxeViolations(container);
  });

  it('hangs assistants beside the line and stacks a team without reports in pairs', () => {
    render(<Observatory />);
    const ines = person('Ines Okafor').getBoundingClientRect();
    const tom = person('Tom Reyes').getBoundingClientRect();
    const mara = person('Mara Lindqvist').getBoundingClientRect();
    expect(tom.top).toBeGreaterThan(ines.bottom);
    expect(tom.bottom).toBeLessThan(mara.top);
    expect(tom.right).toBeLessThan(ines.left + ines.width / 2);
    // Mara's five astronomers: two per row, down her line.
    const aiko = person('Aiko Tanaka').getBoundingClientRect();
    const luis = person('Luis Herrera').getBoundingClientRect();
    const noor = person('Noor Haddad').getBoundingClientRect();
    expect(Math.abs(aiko.top - luis.top)).toBeLessThan(1);
    expect(aiko.right).toBeLessThan(luis.left);
    expect(noor.top).toBeGreaterThan(aiko.bottom);
    expect(Math.abs(noor.left - aiko.left)).toBeLessThan(1);
  });

  it('shows and hides reports with the button on a card, keeping the person in place', async () => {
    const onExpandedChange = vi.fn<(ids: Set<string>) => void>();
    render(<Observatory onExpandedChange={onExpandedChange} />);
    // Keyboard focus brings Dev into view on a narrow screen.
    person('Dev Malhotra').focus();
    await settle();
    const before = centreOf(person('Dev Malhotra'));
    await userEvent.click(toggleOf('Dev Malhotra'));
    await expect.poll(() => queryPerson('Rita Costa')).not.toBeNull();
    expect(onExpandedChange.mock.lastCall?.[0].has('dev')).toBe(true);
    expect(person('Dev Malhotra')).toHaveAttribute('aria-expanded', 'true');
    await settle();
    const after = centreOf(person('Dev Malhotra'));
    expect(Math.abs(after.x - before.x)).toBeLessThan(1.5);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1.5);
    await userEvent.click(toggleOf('Dev Malhotra'));
    await expect.poll(() => queryPerson('Rita Costa')).toBeNull();
  });

  it.runIf(hasTouch)('shows reports and selects people with taps', async () => {
    const onSelectionChange = vi.fn();
    render(<Observatory onSelectionChange={onSelectionChange} />);
    person('Dev Malhotra').focus();
    await settle();
    await commands.tap('[data-org-toggle="11"]');
    await expect.poll(() => queryPerson('Rita Costa')).not.toBeNull();
    await commands.tap('[data-org-node="11"]');
    expect(onSelectionChange).toHaveBeenLastCalledWith('dev');
  });

  it('selects with a click and runs the action on a double click', async () => {
    const onSelectionChange = vi.fn();
    const onAction = vi.fn();
    render(<Observatory onSelectionChange={onSelectionChange} onAction={onAction} />);
    await userEvent.click(person('Hana Kim'));
    expect(onSelectionChange).toHaveBeenLastCalledWith('hana');
    expect(person('Hana Kim')).toHaveAttribute('aria-selected', 'true');
    expect(person('Hana Kim')).toHaveFocus();
    expect(onAction).not.toHaveBeenCalled();
    await userEvent.dblClick(person('Sam Adeyemi'));
    expect(onAction).toHaveBeenLastCalledWith('sam');
  });

  it.runIf(isDesktop)('moves like a tree with the arrow keys', async () => {
    const onAction = vi.fn();
    const onSelectionChange = vi.fn();
    render(<Observatory onAction={onAction} onSelectionChange={onSelectionChange} />);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    // Past the search buttons and the canvas, to the tree's tab stop.
    person('Ines Okafor').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(person('Tom Reyes')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(person('Kenji Watanabe')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(person('Dev Malhotra')).toHaveFocus();
    // Down on a closed person shows their reports first, then moves to them.
    await userEvent.keyboard('{ArrowDown}');
    expect(person('Dev Malhotra')).toHaveAttribute('aria-expanded', 'true');
    expect(person('Dev Malhotra')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(person('Rita Costa')).toHaveFocus();
    // Along the level, and no further than the last person shown there.
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(person('Yusuf Demir')).toHaveFocus();
    // Up goes to the manager; on an open person it hides their reports first.
    await userEvent.keyboard('{ArrowUp}');
    expect(person('Dev Malhotra')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(person('Dev Malhotra')).toHaveAttribute('aria-expanded', 'false');
    expect(queryPerson('Rita Costa')).toBeNull();
    await userEvent.keyboard('{ArrowUp}');
    expect(person('Kenji Watanabe')).toHaveFocus();
    // Along the level across managers: from Kenji's last report to Priya's first.
    await userEvent.keyboard('{ArrowDown}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(person('Lena Novak')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(person('Sofía Ruiz')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(person('Ines Okafor')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onAction).toHaveBeenLastCalledWith('ines');
    await userEvent.keyboard(' ');
    expect(onSelectionChange).toHaveBeenLastCalledWith('ines');
    // * shows the reports of everyone on the focused person's level.
    person('Dev Malhotra').focus();
    await userEvent.keyboard('*');
    expect(person('Dev Malhotra')).toHaveAttribute('aria-expanded', 'true');
    expect(person('Hana Kim')).toHaveAttribute('aria-expanded', 'true');
    expect(person('Mei Chen')).toBeInTheDocument();
  });

  it.runIf(isDesktop)('mirrors the keys and the layout right to left', async () => {
    render(
      <UIProvider locale="he-IL">
        <div dir="rtl">
          <Observatory layout="left-to-right" />
        </div>
      </UIProvider>,
    );
    const ines = person('Ines Okafor').getBoundingClientRect();
    expect(person('Mara Lindqvist').getBoundingClientRect().right).toBeLessThan(ines.left);
    person('Ines Okafor').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(person('Tom Reyes')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(person('Mara Lindqvist')).toHaveFocus();
    // Right hides Mara's reports, then goes back to Ines.
    await userEvent.keyboard('{ArrowRight}');
    expect(person('Mara Lindqvist')).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowRight}');
    expect(person('Ines Okafor')).toHaveFocus();
  });

  it('opens the path to a search result and centres it, then goes through the rest', async () => {
    render(<Observatory height="360px" />);
    const field = screen.getByRole('searchbox', { name: 'Search people' });
    await userEvent.type(field, 'rita');
    await expect.poll(() => queryPerson('Rita Costa'), { timeout: 3000 }).not.toBeNull();
    expect(shownPosition()).toEqual(['1 of 1']);
    expect(person('Rita Costa')).toHaveAttribute('data-match');
    await settle();
    const canvas = screen
      .getByRole('region', { name: 'Observatory staff' })
      .getBoundingClientRect();
    const rita = centreOf(person('Rita Costa'));
    expect(Math.abs(rita.x - (canvas.left + canvas.width / 2))).toBeLessThan(2);
    expect(Math.abs(rita.y - (canvas.top + canvas.height / 2))).toBeLessThan(2);
    await userEvent.clear(field);
    await userEvent.type(field, 'engineer{Enter}');
    expect(shownPosition()).toEqual(['1 of 6']);
    await userEvent.keyboard('{Enter}');
    expect(shownPosition()).toEqual(['2 of 6']);
    expect(person('Rita Costa')).toHaveAttribute('data-match');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(shownPosition()).toEqual(['1 of 6']);
    await userEvent.click(screen.getByRole('button', { name: 'Previous match' }));
    expect(shownPosition()).toEqual(['6 of 6']);
    expect(person('Oscar Nilsson')).toHaveAttribute('data-match');
  });

  it('is controlled or uncontrolled for what is expanded, selected and searched', async () => {
    function Controlled() {
      const [expanded, setExpanded] = useState<Iterable<string>>(['ines']);
      return (
        <>
          <Observatory expandedIds={expanded} selectedId="sam" search="" />
          <button
            type="button"
            onClick={() => {
              setExpanded(['ines', 'sam']);
            }}
          >
            Open outreach
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(person('Sam Adeyemi')).toHaveAttribute('aria-selected', 'true');
    expect(queryPerson('Felix Braun')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Open outreach' }));
    expect(person('Felix Braun')).toBeInTheDocument();
    // Pressing the controlled chart reports changes without making them.
    await userEvent.click(toggleOf('Mara Lindqvist'));
    expect(queryPerson('Aiko Tanaka')).toBeNull();
  });

  it('starts with the people it is given expanded', () => {
    render(<Observatory defaultExpandedIds={['ines', 'priya', 'ravi']} />);
    expect(person('Jonas Weber')).toBeInTheDocument();
    expect(queryPerson('Aiko Tanaka')).toBeNull();
  });

  it('starts with the selected person shown', () => {
    render(<Observatory defaultSelectedId="mei" />);
    expect(person('Mei Chen')).toHaveAttribute('aria-selected', 'true');
    expect(person('Mei Chen')).toHaveAttribute('tabindex', '0');
  });

  it('draws only the people near the view of a 5,000-person org, and finds anyone', async () => {
    const people = generateOrg(5000);
    const managers = new Set(people.map((one) => one.managerId).filter((id) => id != null));
    render(<OrgChart aria-label="Company" people={people} expandedIds={managers} height="480px" />);
    const shown = screen.getAllByRole('treeitem').length;
    expect(shown).toBeGreaterThan(2);
    expect(shown).toBeLessThan(120);
    // Zoomed far out, people are boxes in the drawing; only the tab stop stays a card.
    await userEvent.click(screen.getByRole('button', { name: 'Zoom to fit' }));
    await expect.poll(() => screen.getAllByRole('treeitem').length).toBeLessThanOrEqual(2);
    const last = people[people.length - 1];
    await userEvent.type(screen.getByRole('searchbox'), `${last?.name ?? ''}{Enter}`);
    await expect.poll(() => queryPerson(last?.name ?? '')).not.toBeNull();
    expect(person(last?.name ?? '')).toHaveAttribute('data-match');
  });

  it('collapses past two levels by default, so a large org starts small', () => {
    render(<OrgChart aria-label="Company" people={generateOrg(5000)} />);
    expect(screen.getAllByRole('treeitem').length).toBeLessThan(60);
  });

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider messages={{ orgChartSearch: 'Personen suchen' }}>
        <Observatory />
      </UIProvider>,
    );
    expect(screen.getByRole('searchbox', { name: 'Personen suchen' })).toBeInTheDocument();
  });

  it.runIf(isPhone)('fits a phone without sideways page scroll', () => {
    render(<Observatory defaultExpandedDepth={Infinity} />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    // It starts at the top, readable, rather than fitting the whole chart into the phone.
    const zoom = screen.getByRole('button', { name: /reset to 100%/ }).textContent;
    expect(Number.parseInt(zoom, 10)).toBeGreaterThanOrEqual(60);
  });

  it('stops rendering once it has settled', async () => {
    // Observers or effects that set new state on every render would keep the chart rendering every frame.
    let commits = 0;
    render(
      <Profiler
        id="chart"
        onRender={() => {
          commits += 1;
        }}
      >
        <Observatory />
      </Profiler>,
    );
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return commits - before;
    };
    await expect.poll(settled, { timeout: 5000 }).toBe(0);
  });
});
