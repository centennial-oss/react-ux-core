import { act, render, screen, within } from '@testing-library/react';
import { Profiler, createRef, useRef, type ReactNode, type RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Markdown } from '../../markdown/Markdown';
import { UIProvider } from '../../provider/UIProvider';
import { REDUCED_MOTION_QUERY } from '../../utils/useMediaQuery';
import { Prose } from '../Prose';
import { AnchorNav, type AnchorNavItem, type AnchorNavProps } from './AnchorNav';

const isPhone = window.innerWidth < 640;
const isTouch = navigator.maxTouchPoints > 0;

const ITEMS: AnchorNavItem[] = [
  { id: 'intro', label: 'Introduction' },
  {
    id: 'setup',
    label: 'Setup',
    children: [
      { id: 'setup-linux', label: 'Linux' },
      { id: 'setup-mac', label: 'Mac' },
    ],
  },
  { id: 'usage', label: 'Usage' },
  { id: 'faq', label: 'FAQ' },
];

const SECTIONS = ['intro', 'setup', 'setup-linux', 'setup-mac', 'usage', 'faq'];

/** One heading per section, each followed by `height` pixels of content (the last by `lastHeight`). */
function Sections({ height = 900, lastHeight = height }: { height?: number; lastHeight?: number }) {
  return (
    <div>
      {SECTIONS.map((id, index) => (
        <section key={id}>
          <h2 id={id} className="m-0 h-8">
            {id}
          </h2>
          <div style={{ height: index === SECTIONS.length - 1 ? lastHeight : height }} />
        </section>
      ))}
    </div>
  );
}

function Page({ lastHeight, ...props }: Partial<AnchorNavProps> & { lastHeight?: number }) {
  return (
    <>
      <AnchorNav items={ITEMS} {...props} />
      <Sections lastHeight={lastHeight} />
    </>
  );
}

function heading(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No heading ${id}`);
  }
  return element;
}

/** Scrolls the page (or `box`) at once so the top of `id`'s heading is `y` pixels from the top. */
function scrollHeadingTo(id: string, y: number, box?: HTMLElement) {
  act(() => {
    if (box) {
      const top = heading(id).getBoundingClientRect().top - box.getBoundingClientRect().top;
      box.scrollTo({ top: box.scrollTop + top - y, behavior: 'instant' });
    } else {
      window.scrollTo({
        top: window.scrollY + heading(id).getBoundingClientRect().top - y,
        behavior: 'instant',
      });
    }
  });
}

function nav(name = 'On this page'): HTMLElement {
  return screen.getByRole('navigation', { name });
}

/** The section shown as current: the link marked `aria-current`, or on phones, what the menu button says. */
function currentLabel(): string | null {
  if (isPhone) {
    return screen.getByRole('button', { name: /On this page/ }).textContent;
  }
  const current = within(nav()).queryAllByRole('link', { current: 'location' });
  return current.map((link) => link.textContent).join() || null;
}

async function expectCurrent(label: string) {
  await expect.poll(currentLabel).toBe(isPhone ? `On this page${label}` : label);
}

function preferReducedMotion() {
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
    const list = matchMedia(query);
    if (query === REDUCED_MOTION_QUERY) {
      Object.defineProperty(list, 'matches', { value: true });
    }
    return list;
  });
}

/** Waits until `element` stops moving and is on screen, as a phone sheet's items are once it has slid up. */
async function settled(element: HTMLElement) {
  let lastTop = Number.NaN;
  await expect
    .poll(() => {
      const { top, bottom } = element.getBoundingClientRect();
      const isSettled = top === lastTop && bottom < window.innerHeight;
      lastTop = top;
      return isSettled;
    })
    .toBe(true);
}

/** Chooses a section: its link, or on phones the item in the menu. */
async function choose(label: string) {
  if (isPhone) {
    await userEvent.click(screen.getByRole('button', { name: /On this page/ }));
    const menu = await screen.findByRole('menu');
    // The sheet slides up; choose once it has settled (scrolling a sheet mid-slide would dismiss it).
    const item = within(menu).getByRole('menuitemradio', { name: label });
    await settled(item);
    await userEvent.click(item);
  } else {
    await userEvent.click(within(nav()).getByRole('link', { name: label }));
  }
}

const startUrl = window.location.href;

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(window.history.state, '', startUrl);
  window.scrollTo({ top: 0, behavior: 'instant' });
});

describe('AnchorNav', () => {
  it.runIf(!isPhone)('lists the sections as nested links in a navigation landmark', () => {
    render(<Page />);
    const landmark = nav();
    const links = within(landmark).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Introduction',
      'Setup',
      'Linux',
      'Mac',
      'Usage',
      'FAQ',
    ]);
    expect(links[2]).toHaveAttribute('href', '#setup-linux');
    // Subsections are a list inside their section's item.
    const setup = links[1]?.closest('li');
    expect(setup && within(setup).getAllByRole('link')).toHaveLength(3);
    expect(screen.getByText('On this page')).toBeVisible();
  });

  it.runIf(!isPhone)('limits the levels to maxDepth', () => {
    render(<Page maxDepth={1} />);
    expect(
      within(nav())
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Introduction', 'Setup', 'Usage', 'FAQ']);
  });

  it('marks the section being read as the page scrolls, reporting each change once', async () => {
    const onCurrentIdChange = vi.fn();
    render(<Page onCurrentIdChange={onCurrentIdChange} />);
    await expectCurrent('Introduction');
    scrollHeadingTo('usage', 120);
    await expectCurrent('Usage');
    // Scrolling within the section changes nothing.
    scrollHeadingTo('usage', 60);
    scrollHeadingTo('setup', 120);
    await expectCurrent('Setup');
    expect(onCurrentIdChange.mock.calls).toEqual([['intro'], ['usage'], ['setup']]);
  });

  it('keeps a section current while its content fills the view', async () => {
    render(<Page />);
    // The heading has scrolled past the top, and the next one is still in the lower half.
    scrollHeadingTo('setup-linux', -200);
    await expectCurrent('Linux');
    if (!isPhone) {
      expect(within(nav()).getAllByRole('link', { current: 'location' })).toHaveLength(1);
    }
  });

  it('goes to a chosen section: scrolls it to the top, focuses it and marks it current', async () => {
    const onCurrentIdChange = vi.fn();
    render(<Page onCurrentIdChange={onCurrentIdChange} />);
    await expectCurrent('Introduction');
    await choose('Usage');
    const target = heading('usage');
    await expect.poll(() => document.activeElement).toBe(target);
    expect(target).toHaveAttribute('tabindex', '-1');
    await expectCurrent('Usage');
    // Below the phone's sticky menu bar, or at the very top.
    const bar = isPhone ? nav().getBoundingClientRect().height : 0;
    await expect
      .poll(() => Math.round(target.getBoundingClientRect().top - bar), { timeout: 3000 })
      .toBe(0);
    expect(onCurrentIdChange).toHaveBeenLastCalledWith('usage');
    expect(window.location.href).toBe(startUrl);
  });

  it('jumps at once when the user prefers reduced motion', async () => {
    preferReducedMotion();
    const scrollTo = vi.spyOn(window, 'scrollTo');
    render(<Page />);
    await choose('FAQ');
    await expect.poll(() => scrollTo.mock.calls.at(-1)?.[0]).toMatchObject({ behavior: 'instant' });
  });

  it('scrolls smoothly otherwise', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    render(<Page />);
    await choose('FAQ');
    await expect.poll(() => scrollTo.mock.calls.at(-1)?.[0]).toMatchObject({ behavior: 'smooth' });
  });

  it('can put the chosen section in the URL', async () => {
    render(<Page shouldUpdateHash />);
    await choose('Mac');
    await expect.poll(() => window.location.hash).toBe('#setup-mac');
  });

  it('keeps a chosen short last section current until the user scrolls again', async () => {
    preferReducedMotion();
    render(<Page lastHeight={40} />);
    await choose('FAQ');
    // The page can't scroll the last heading to the top, and the one before it is still in view…
    await expect.poll(() => document.activeElement).toBe(heading('faq'));
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    await expectCurrent('FAQ');
    // …until the user scrolls themselves.
    act(() => {
      window.dispatchEvent(new WheelEvent('wheel'));
    });
    scrollHeadingTo('setup', 120);
    await expectCurrent('Setup');
  });

  it('allows for sticky headers above the content', async () => {
    preferReducedMotion();
    render(<Page scrollOffset={100} />);
    expect(nav().style.top).toBe('100px');
    await choose('Usage');
    const bar = isPhone ? nav().getBoundingClientRect().height : 0;
    await expect
      .poll(() => Math.round(heading('usage').getBoundingClientRect().top - bar), {
        timeout: 3000,
      })
      .toBe(100);
    // A heading under the header has been scrolled past: its section is the one being read.
    act(() => {
      window.dispatchEvent(new WheelEvent('wheel'));
    });
    scrollHeadingTo('faq', 60 + bar);
    await expectCurrent('FAQ');
  });

  it('follows a scroll container instead of the page', async () => {
    preferReducedMotion();
    function Boxed() {
      const scrollRef = useRef<HTMLDivElement>(null);
      return (
        <>
          <AnchorNav items={ITEMS} scrollRef={scrollRef} />
          <div ref={scrollRef} data-testid="box" className="h-80 overflow-y-auto">
            <Sections height={500} />
          </div>
        </>
      );
    }
    render(<Boxed />);
    const box = screen.getByTestId('box');
    await expectCurrent('Introduction');
    scrollHeadingTo('setup-mac', 20, box);
    await expectCurrent('Mac');
    expect(window.scrollY).toBe(0);
    await choose('FAQ');
    await expect
      .poll(() =>
        Math.round(heading('faq').getBoundingClientRect().top - box.getBoundingClientRect().top),
      )
      .toBe(0);
    expect(window.scrollY).toBe(0);
  });

  it.runIf(!isPhone && !isTouch)('works from the keyboard', async () => {
    render(<Page />);
    within(nav()).getByRole('link', { name: 'Mac' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement).toBe(heading('setup-mac'));
    await expectCurrent('Mac');
    // Tab carries on from the section.
    await userEvent.tab({ shift: true });
    expect(nav().contains(document.activeElement)).toBe(true);
  });

  it.runIf(isTouch && !isPhone)('goes to a section when its link is tapped', async () => {
    render(<Page />);
    await commands.tap('a[href="#usage"]');
    await expect.poll(() => document.activeElement).toBe(heading('usage'));
    await expectCurrent('Usage');
  });

  it.runIf(!isPhone)('leaves modified clicks to the browser', async () => {
    render(<Page />);
    const link = within(nav()).getByRole('link', { name: 'FAQ' });
    let wasPrevented: boolean | undefined;
    // After the component's handler: note what it did, then stop the browser actually opening a tab.
    document.addEventListener(
      'click',
      (event) => {
        wasPrevented = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    expect(wasPrevented).toBe(false);
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
    expect(document.activeElement).not.toBe(heading('faq'));
  });

  it.runIf(!isPhone)('shows a bar of top-level jump links horizontally', async () => {
    render(<Page orientation="horizontal" />);
    const landmark = nav();
    expect(
      within(landmark)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Introduction', 'Setup', 'Usage', 'FAQ']);
    // A subsection being read marks its top-level section.
    scrollHeadingTo('setup-mac', landmark.getBoundingClientRect().height + 20);
    await expectCurrent('Setup');
    await expectNoAxeViolations(landmark);
  });

  it.runIf(isPhone)('collapses into a menu on phones', async () => {
    render(<Page />);
    await expectCurrent('Introduction');
    await userEvent.click(screen.getByRole('button', { name: /On this page/ }));
    const menu = await screen.findByRole('menu', { name: 'On this page' });
    const items = within(menu).getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent)).toEqual([
      'Introduction',
      'Setup',
      'Linux',
      'Mac',
      'Usage',
      'FAQ',
    ]);
    expect(items[0]).toHaveAttribute('aria-checked', 'true');
    await expectNoAxeViolations(menu);
    const mac = within(menu).getByRole('menuitemradio', { name: 'Mac' });
    await settled(mac);
    await userEvent.click(mac);
    await expect.poll(() => document.activeElement).toBe(heading('setup-mac'));
    await expectCurrent('Mac');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it.runIf(isPhone)('opens the menu with a tap', async () => {
    render(<Page orientation="horizontal" />);
    await commands.tap('nav button');
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(6);
  });

  it('can be controlled', async () => {
    const onCurrentIdChange = vi.fn();
    const { rerender } = render(<Page currentId="usage" onCurrentIdChange={onCurrentIdChange} />);
    // The page shows the introduction, which is reported, but the app keeps Usage current.
    await expect.poll(() => onCurrentIdChange.mock.calls).toEqual([['intro']]);
    await expectCurrent('Usage');
    rerender(<Page currentId="faq" onCurrentIdChange={onCurrentIdChange} />);
    await expectCurrent('FAQ');
    rerender(<Page currentId={null} onCurrentIdChange={onCurrentIdChange} />);
    if (!isPhone) {
      expect(within(nav()).queryAllByRole('link', { current: 'location' })).toHaveLength(0);
    }
  });

  it('starts from defaultCurrentId until the page says otherwise', async () => {
    render(<Page defaultCurrentId="faq" />);
    // The first render shows the default; the page then reports what's in view.
    expect(currentLabel()).toBe(isPhone ? 'On this pageFAQ' : 'FAQ');
    await expectCurrent('Introduction');
  });

  it('gathers its links from the headings of a Markdown document', async () => {
    function Doc({ source, maxDepth }: { source: string; maxDepth?: number }) {
      const contentRef = useRef<HTMLDivElement>(null);
      return (
        <>
          <AnchorNav contentRef={contentRef} maxDepth={maxDepth} />
          <Markdown ref={contentRef}>{source}</Markdown>
        </>
      );
    }
    const source =
      '# Alpha\n\nText.\n\n## Alpha one\n\n### Deep\n\n# Beta\n\n# Beta\n\n# Café au lait';
    const { rerender } = render(<Doc source={source} />);
    // Headings get ids from their text, unique on the page.
    expect(document.querySelector('h2')).toHaveAttribute('id', 'alpha');
    expect([...document.querySelectorAll('h2')].map((element) => element.id)).toEqual([
      'alpha',
      'beta',
      'beta-2',
      'cafe-au-lait',
    ]);
    const names = () =>
      isPhone
        ? []
        : within(nav())
            .getAllByRole('link')
            .map((link) => `${link.textContent} ${link.getAttribute('href') ?? ''}`);
    if (!isPhone) {
      expect(names()).toEqual([
        'Alpha #alpha',
        'Alpha one #alpha-one',
        'Beta #beta',
        'Beta #beta-2',
        'Café au lait #cafe-au-lait',
      ]);
    }
    rerender(<Doc source={source} maxDepth={3} />);
    if (!isPhone) {
      expect(names()).toContain('Deep #deep');
    }
    // The links follow the document as it changes.
    rerender(<Doc source={'# Gamma\n\n## Gamma one'} maxDepth={3} />);
    if (isPhone) {
      await userEvent.click(screen.getByRole('button', { name: /On this page/ }));
      const menu = await screen.findByRole('menu');
      await expect
        .poll(() =>
          within(menu)
            .getAllByRole('menuitemradio')
            .map((item) => item.textContent),
        )
        .toEqual(['Gamma', 'Gamma one']);
    } else {
      await expect.poll(names).toEqual(['Gamma #gamma', 'Gamma one #gamma-one']);
    }
  });

  it.runIf(!isPhone)('gathers headings from Prose, leaving out its own and empty ones', () => {
    function Article() {
      const contentRef = useRef<HTMLDivElement>(null);
      return (
        <Prose ref={contentRef}>
          <AnchorNav contentRef={contentRef} label={<h2>Contents</h2>} />
          <h2 id="first">First</h2>
          <p>Text</p>
          <h3>Second</h3>
          <h2> </h2>
        </Prose>
      );
    }
    render(<Article />);
    expect(
      within(nav('Contents'))
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#first', '#second']);
  });

  it('takes its name from UIProvider messages or label', () => {
    const { unmount } = render(
      <UIProvider messages={{ onThisPage: 'Contents' }}>
        <Page />
      </UIProvider>,
    );
    expect(nav('Contents')).toBeInTheDocument();
    unmount();
    render(<Page label="In this guide" />);
    expect(nav('In this guide')).toBeInTheDocument();
  });

  it('forwards its ref and attributes to the nav', () => {
    const ref = createRef<HTMLElement>();
    render(<Page ref={ref} aria-label="Guide sections" data-testid="toc" className="w-48" />);
    expect(ref.current).toBe(nav('Guide sections'));
    expect(ref.current).toHaveAttribute('data-testid', 'toc');
    expect(ref.current).toHaveClass('w-48');
  });

  it('renders nothing without links', () => {
    const { container } = render(<AnchorNav items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Page />);
    await expectCurrent('Introduction');
    await expectNoAxeViolations(container);
  });

  it("doesn't scroll the page sideways on a phone", () => {
    const long: AnchorNavItem[] = Array.from({ length: 12 }, (_, index) => ({
      id: `long-${String(index)}`,
      label: `A rather long section title number ${String(index)}`,
    }));
    render(
      <>
        <AnchorNav items={long} orientation="horizontal" />
        <AnchorNav items={long} aria-label="Sidebar" />
      </>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('stops rendering once the links and the section in view are shown', async () => {
    let commits = 0;
    function Doc({ children }: { children: ReactNode }) {
      const contentRef: RefObject<HTMLDivElement | null> = useRef(null);
      return (
        <Profiler
          id="nav"
          onRender={() => {
            commits += 1;
          }}
        >
          <AnchorNav contentRef={contentRef} orientation="horizontal" />
          <div ref={contentRef}>{children}</div>
        </Profiler>
      );
    }
    render(
      <Doc>
        <Sections />
      </Doc>,
    );
    await expectCurrent('intro');
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return commits - before;
    };
    await expect.poll(settled, { timeout: 10_000 }).toBe(0);
  });
});
