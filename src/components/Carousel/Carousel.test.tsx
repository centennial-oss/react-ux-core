import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { enableVirtualizer } from '../../../test/virtualizer';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { Slider } from '../Slider/Slider';
import { Carousel, type CarouselProps } from './Carousel';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

afterEach(() => {
  vi.restoreAllMocks();
});

const names = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

type Props = Partial<Omit<CarouselProps, 'children' | 'items' | 'renderThumbnail'>> & {
  renderThumbnail?: (index: number) => ReactNode;
};

function Planets({ count = names.length, ...props }: Props & { count?: number }) {
  return (
    <Carousel aria-label="Planets" {...props}>
      {names.slice(0, count).map((name) => (
        <div key={name} className="h-32 bg-surface-2 p-4">
          <p>{name}</p>
          <button type="button">Visit {name}</button>
        </div>
      ))}
    </Carousel>
  );
}

function region(): HTMLElement {
  return screen.getByRole('region', { name: 'Planets' });
}

/** The slides in view (the others are hidden from assistive technology), in the order they're shown. */
function groupsInView(): HTMLElement[] {
  const isRtl = getComputedStyle(region()).direction === 'rtl';
  return within(region())
    .queryAllByRole('group')
    .filter((group) => group.hasAttribute('data-slide'))
    .map((group) => ({ group, x: group.getBoundingClientRect().left }))
    .sort((a, b) => (isRtl ? b.x - a.x : a.x - b.x))
    .map(({ group }) => group);
}

/** The labels of the slides in view, in the order they're shown. */
function slidesInView(): string[] {
  return groupsInView().map((group) => group.getAttribute('aria-label') ?? '');
}

/** The text of the slides in view, in the order they're shown. */
function namesInView(): string[] {
  return groupsInView().map((group) => group.querySelector('p')?.textContent ?? '');
}

function viewport(): HTMLElement {
  const element = region().querySelector<HTMLElement>('[aria-live]');
  if (!element) {
    throw new Error('No slides viewport');
  }
  return element;
}

function button(name: string): HTMLElement {
  return within(region()).getByRole('button', { name });
}

/** A one-pointer drag across the slides, by `dx` pixels. */
function drag(
  dx: number,
  { pointerType = 'touch', target = viewport() }: { pointerType?: string; target?: Element } = {},
): void {
  const rect = viewport().getBoundingClientRect();
  const base = { pointerId: 7, pointerType, isPrimary: true, button: 0 };
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  fireEvent.pointerDown(target, { ...base, clientX: x, clientY: y });
  for (let step = 1; step <= 4; step++) {
    fireEvent.pointerMove(target, { ...base, clientX: x + (dx * step) / 4, clientY: y });
  }
  fireEvent.pointerUp(target, { ...base, clientX: x + dx, clientY: y });
}

describe('Carousel', () => {
  it('is a labelled carousel region of slides, with only the slide in view exposed', async () => {
    render(<Planets />);
    const carousel = region();
    expect(carousel.tagName).toBe('SECTION');
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    expect(slidesInView()).toEqual(['1 of 8']);
    const [slide] = within(carousel).getAllByRole('group');
    expect(slide).toHaveAttribute('aria-roledescription', 'slide');
    expect(viewport()).toHaveAttribute('aria-live', 'polite');
    // The neighbours are drawn, but inert and hidden.
    const hidden = carousel.querySelectorAll('[aria-roledescription="slide"][aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);
    for (const element of hidden) {
      expect(element).toHaveAttribute('inert');
    }
    await expectNoAxeViolations(carousel);
  });

  it('moves with the previous and next buttons, stopping at the ends', async () => {
    const onIndexChange = vi.fn();
    render(<Planets count={3} onIndexChange={onIndexChange} />);
    const previous = button('Previous slide');
    const next = button('Next slide');
    expect(previous).toBeDisabled();
    expect(previous).toHaveAttribute('aria-controls', viewport().id);
    await userEvent.click(next);
    expect(namesInView()).toEqual(['Venus']);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(next);
    expect(namesInView()).toEqual(['Earth']);
    expect(next).toBeDisabled();
    await userEvent.click(previous);
    expect(namesInView()).toEqual(['Venus']);
  });

  it('jumps to any slide from the dots', async () => {
    render(<Planets />);
    const dots = within(region()).getByRole('listbox', { name: 'Choose slide' });
    const options = within(dots).getAllByRole('option');
    expect(options).toHaveLength(8);
    expect(options[0]).toHaveAccessibleName('Slide 1 of 8');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(dots).getByRole('option', { name: 'Slide 5 of 8' }));
    expect(namesInView()).toEqual(['Jupiter']);
    expect(within(dots).getByRole('option', { name: 'Slide 5 of 8' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it.runIf(isDesktop)(
    'moves with the arrow keys, Home and End wherever focus is inside',
    async () => {
      render(<Planets />);
      button('Next slide').focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(namesInView()).toEqual(['Venus']);
      await userEvent.keyboard('{End}');
      expect(namesInView()).toEqual(['Neptune']);
      await userEvent.keyboard('{ArrowLeft}');
      expect(namesInView()).toEqual(['Uranus']);
      await userEvent.keyboard('{Home}');
      expect(namesInView()).toEqual(['Mercury']);
      // The dots take the arrow keys themselves, and choose as focus moves.
      within(region()).getByRole('option', { name: 'Slide 1 of 8' }).focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(namesInView()).toEqual(['Venus']);
    },
  );

  it.runIf(isDesktop)(
    'keeps focus in the carousel when the arrow holding it is disabled',
    async () => {
      render(<Planets count={2} />);
      button('Next slide').focus();
      await userEvent.keyboard('{Enter}');
      expect(button('Next slide')).toBeDisabled();
      expect(document.activeElement).toBe(viewport());
      await userEvent.keyboard('{ArrowLeft}');
      expect(namesInView()).toEqual(['Mercury']);
    },
  );

  it.runIf(isDesktop)(
    'moves focus with the view when the slide holding it moves away',
    async () => {
      render(<Planets />);
      button('Visit Mercury').focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(namesInView()).toEqual(['Venus']);
      expect(document.activeElement).toBe(button('Visit Venus'));
      await userEvent.keyboard('{ArrowRight}');
      expect(namesInView()).toEqual(['Earth']);
      expect(document.activeElement).toBe(button('Visit Earth'));
    },
  );

  it.runIf(isDesktop)('keeps focus on the slides when the next one has no controls', async () => {
    render(
      <Carousel aria-label="Planets">
        <button type="button">Mercury</button>
        <p>Venus</p>
      </Carousel>,
    );
    screen.getByRole('button', { name: 'Mercury' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(slidesInView()).toEqual(['2 of 2']);
    expect(document.activeElement).toBe(viewport());
    await userEvent.keyboard('{ArrowLeft}');
    expect(slidesInView()).toEqual(['1 of 2']);
  });

  it('leaves arrow keys in text fields alone', async () => {
    render(
      <Carousel aria-label="Planets">
        <input aria-label="Note" />
        <p>Second</p>
      </Carousel>,
    );
    const input = screen.getByRole('textbox', { name: 'Note' });
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowRight}');
    expect(slidesInView()).toEqual(['1 of 2']);
  });

  it('loops from the last slide to the first and back', async () => {
    render(<Planets count={4} isLooping />);
    const previous = button('Previous slide');
    expect(previous).toBeEnabled();
    await userEvent.click(previous);
    expect(namesInView()).toEqual(['Mars']);
    await userEvent.click(button('Next slide'));
    await userEvent.click(button('Next slide'));
    expect(namesInView()).toEqual(['Venus']);
  });

  it('shows several slides per view and moves a page at a time', async () => {
    render(<Planets columns={3} moveBy="page" />);
    expect(namesInView()).toEqual(['Mercury', 'Venus', 'Earth']);
    const dots = within(region()).getAllByRole('option');
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
      'Page 1 of 3',
      'Page 2 of 3',
      'Page 3 of 3',
    ]);
    await userEvent.click(button('Next slide'));
    expect(namesInView()).toEqual(['Mars', 'Jupiter', 'Saturn']);
    // The last page ends at the last slide.
    await userEvent.click(button('Next slide'));
    expect(namesInView()).toEqual(['Saturn', 'Uranus', 'Neptune']);
    expect(button('Next slide')).toBeDisabled();
    await userEvent.click(button('Previous slide'));
    expect(namesInView()).toEqual(['Mars', 'Jupiter', 'Saturn']);
    // The slides share the width, with the gap between them.
    const [first, second] = within(region()).getAllByRole('group');
    const width = viewport().clientWidth;
    expect(first?.getBoundingClientRect().width).toBeCloseTo((width - 2 * 16) / 3, 0);
    expect(second?.getBoundingClientRect().width).toBeCloseTo((width - 2 * 16) / 3, 0);
  });

  it('moves one slide at a time with several in view, looping', async () => {
    render(<Planets columns={2} isLooping />);
    await userEvent.click(button('Previous slide'));
    expect(namesInView()).toEqual(['Neptune', 'Mercury']);
    await userEvent.click(button('Previous slide'));
    expect(namesInView()).toEqual(['Uranus', 'Neptune']);
    expect(within(region()).getAllByRole('option')).toHaveLength(8);
  });

  it('shows as many slides as its own width allows', async () => {
    const { rerender } = render(
      <div style={{ width: 300 }}>
        <Planets columns={{ base: 1, sm: 2 }} />
      </div>,
    );
    expect(namesInView()).toHaveLength(1);
    rerender(
      <div style={{ width: 500 }}>
        <Planets columns={{ base: 1, sm: 2 }} />
      </div>,
    );
    await expect.poll(() => namesInView()).toEqual(['Mercury', 'Venus']);
    rerender(
      <div style={{ width: 500 }}>
        <Planets columns={{ base: 1, sm: 3 }} />
      </div>,
    );
    await expect.poll(() => namesInView()).toEqual(['Mercury', 'Venus', 'Earth']);
  });

  it('has no controls when every slide fits', () => {
    render(<Planets count={2} columns={3} />);
    expect(namesInView()).toEqual(['Mercury', 'Venus']);
    expect(within(region()).queryByRole('button', { name: 'Next slide' })).toBeNull();
    expect(within(region()).queryByRole('listbox')).toBeNull();
  });

  it('follows a controlled index, and stays put when it is not updated', async () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(<Planets index={2} onIndexChange={onIndexChange} />);
    expect(namesInView()).toEqual(['Earth']);
    await userEvent.click(button('Next slide'));
    expect(onIndexChange).toHaveBeenCalledWith(3);
    expect(namesInView()).toEqual(['Earth']);
    rerender(<Planets index={6} onIndexChange={onIndexChange} />);
    expect(namesInView()).toEqual(['Uranus']);
  });

  it('starts at defaultIndex', () => {
    render(<Planets defaultIndex={4} />);
    expect(namesInView()).toEqual(['Jupiter']);
    expect(within(region()).getByRole('option', { name: 'Slide 5 of 8' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('works with a controlled index from a parent', async () => {
    function Controlled() {
      const [index, setIndex] = useState(0);
      return (
        <>
          <p data-testid="index">{index}</p>
          <Planets index={index} onIndexChange={setIndex} isLooping />
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(button('Previous slide'));
    expect(screen.getByTestId('index').textContent).toBe('7');
    expect(namesInView()).toEqual(['Neptune']);
  });

  it('swipes to the next and previous slides, and snaps back from a short drag', () => {
    const onIndexChange = vi.fn();
    render(<Planets onIndexChange={onIndexChange} />);
    drag(-120);
    expect(namesInView()).toEqual(['Venus']);
    drag(120);
    expect(namesInView()).toEqual(['Mercury']);
    drag(-20);
    expect(namesInView()).toEqual(['Mercury']);
    expect(onIndexChange).toHaveBeenCalledTimes(2);
    // Past the first slide it only stretches.
    drag(200);
    expect(namesInView()).toEqual(['Mercury']);
  });

  it('moves by as many slides as a long drag covers', () => {
    render(<Planets columns={4} />);
    const slide = viewport().clientWidth / 4;
    drag(-2.2 * slide, { pointerType: 'mouse' });
    expect(namesInView()).toEqual(['Earth', 'Mars', 'Jupiter', 'Saturn']);
  });

  it('ignores vertical drags, which scroll the page', () => {
    render(<Planets />);
    const rect = viewport().getBoundingClientRect();
    const base = { pointerId: 3, pointerType: 'touch', isPrimary: true, button: 0 };
    const x = rect.left + 20;
    const y = rect.top + 20;
    fireEvent.pointerDown(viewport(), { ...base, clientX: x, clientY: y });
    fireEvent.pointerMove(viewport(), { ...base, clientX: x - 15, clientY: y + 40 });
    fireEvent.pointerMove(viewport(), { ...base, clientX: x - 100, clientY: y + 60 });
    fireEvent.pointerUp(viewport(), { ...base, clientX: x - 100, clientY: y + 60 });
    expect(namesInView()).toEqual(['Mercury']);
    // Vertical swipes scroll the page, and pinches still zoom it.
    expect(getComputedStyle(viewport()).touchAction).toBe('pan-y pinch-zoom');
  });

  it("doesn't click what a mouse drag started on", () => {
    const onClick = vi.fn();
    render(
      <Carousel aria-label="Planets">
        <button type="button" onClick={onClick}>
          First
        </button>
        <p>Second</p>
      </Carousel>,
    );
    const first = screen.getByRole('button', { name: 'First' });
    drag(-150, { pointerType: 'mouse', target: first });
    fireEvent.click(first);
    expect(onClick).not.toHaveBeenCalled();
    expect(slidesInView()).toEqual(['2 of 2']);
    // The next click is a click again.
    fireEvent.pointerDown(viewport(), { pointerId: 9, pointerType: 'mouse', button: 0 });
    fireEvent.click(first);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('drags from a button in a slide without pressing it, even leaving the carousel at once', async () => {
    const onPress = vi.fn();
    render(
      <div className="flex items-start">
        <div data-testid="outside" className="h-32 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <Carousel aria-label="Planets">
            <AriaButton onPress={onPress} className="block h-32 w-full">
              Mercury
            </AriaButton>
            <p>Venus</p>
          </Carousel>
        </div>
      </div>,
    );
    // A real mouse: down on the button, then one move straight off the carousel, then up.
    await userEvent.dragAndDrop(
      screen.getByRole('button', { name: 'Mercury' }),
      screen.getByTestId('outside'),
    );
    expect(slidesInView()).toEqual(['2 of 2']);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('still presses a button in a slide when tapped', async () => {
    const onPress = vi.fn();
    render(
      <Carousel aria-label="Planets">
        <AriaButton onPress={onPress}>Mercury</AriaButton>
        <p>Venus</p>
      </Carousel>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mercury' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.runIf(isTouch)('moves with a tap on the next button', async () => {
    render(<Planets />);
    await commands.tap('section[aria-label="Planets"] button[aria-label="Next slide"]');
    expect(namesInView()).toEqual(['Venus']);
  });

  it('mirrors right to left', async () => {
    render(
      <div dir="rtl">
        <Planets />
      </div>,
    );
    drag(120);
    expect(namesInView()).toEqual(['Venus']);
    if (isDesktop) {
      button('Next slide').focus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(namesInView()).toEqual(['Earth']);
      await userEvent.keyboard('{ArrowRight}');
      expect(namesInView()).toEqual(['Venus']);
    }
    // The first slide is at the right.
    const [slide] = within(region()).getAllByRole('group');
    await expect
      .poll(() => Math.round(slide?.getBoundingClientRect().right ?? 0))
      .toBe(Math.round(viewport().getBoundingClientRect().right));
  });

  it('only renders the item slides near the view', async () => {
    const items = Array.from({ length: 10_000 }, (_, at) => at + 1);
    const renderItem = vi.fn((item: number) => <p>Item {item}</p>);
    render(
      <Carousel aria-label="Planets" items={items} columns={2} isLooping>
        {renderItem}
      </Carousel>,
    );
    expect(slidesInView()).toEqual(['1 of 10000', '2 of 10000']);
    expect(region().querySelectorAll('[aria-roledescription="slide"]').length).toBeLessThanOrEqual(
      8,
    );
    expect(renderItem.mock.calls.length).toBeLessThan(20);
    // Too many stops for dots: the position instead.
    expect(within(region()).queryByRole('listbox')).toBeNull();
    expect(within(region()).getByText('1 of 10000')).toBeInTheDocument();
    await userEvent.click(button('Previous slide'));
    expect(slidesInView()).toEqual(['10000 of 10000', '1 of 10000']);
    expect(within(region()).getByText('Item 10000')).toBeInTheDocument();
  });

  it('renders children slides as they come near, then keeps them', async () => {
    render(<Planets />);
    expect(screen.queryByText('Jupiter')).toBeNull();
    await userEvent.click(within(region()).getByRole('option', { name: 'Slide 4 of 8' }));
    // The next slide is drawn, out of view.
    expect(region().textContent).toContain('Jupiter');
    expect(namesInView()).toEqual(['Mars']);
    await userEvent.click(within(region()).getByRole('option', { name: 'Slide 1 of 8' }));
    expect(region().textContent).toContain('Jupiter');
  });

  it('shows thumbnails from renderThumbnail', async () => {
    render(
      <Planets
        renderThumbnail={(at) => <span className="block size-full bg-surface-3">{at + 1}</span>}
      />,
    );
    const strip = within(region()).getByRole('listbox', { name: 'Choose slide' });
    expect(within(strip).getAllByRole('option')).toHaveLength(8);
    await userEvent.click(within(strip).getByRole('option', { name: 'Slide 3 of 8' }));
    expect(namesInView()).toEqual(['Earth']);
    await expectNoAxeViolations(region());
  });

  it('takes its strings from UIProvider', () => {
    const messages: Partial<Messages> = {
      carousel: 'carrousel',
      carouselSlide: 'diapositive',
      carouselSlideLabel: ({ position, total }) => `${String(position)} sur ${String(total)}`,
      carouselNext: 'Diapositive suivante',
      carouselPicker: 'Choisir',
      carouselGoToSlide: ({ position }) => `Diapositive ${String(position)}`,
    };
    render(
      <UIProvider messages={messages}>
        <Planets />
      </UIProvider>,
    );
    expect(region()).toHaveAttribute('aria-roledescription', 'carrousel');
    expect(slidesInView()).toEqual(['1 sur 8']);
    expect(within(region()).getByRole('group')).toHaveAttribute(
      'aria-roledescription',
      'diapositive',
    );
    expect(button('Diapositive suivante')).toBeInTheDocument();
    const picker = within(region()).getByRole('listbox', { name: 'Choisir' });
    expect(within(picker).getByRole('option', { name: 'Diapositive 2' })).toBeInTheDocument();
  });

  it('passes data and aria attributes and the ref to the region', () => {
    const ref = vi.fn();
    render(<Planets data-testid="planets" aria-describedby="hint" ref={ref} className="mt-2" />);
    expect(region()).toHaveAttribute('data-testid', 'planets');
    expect(region()).toHaveAttribute('aria-describedby', 'hint');
    expect(region()).toHaveClass('mt-2');
    expect(ref).toHaveBeenCalledWith(region());
  });

  it('reads the columns again when the width crosses a breakpoint, even with the same column width', async () => {
    // 380px is one column 380px wide; 776px is two, each (776 - 16) / 2 = 380px wide.
    const { rerender } = render(
      <div style={{ width: 380 }}>
        <Planets columns={{ base: 1, sm: 2 }} gap="md" />
      </div>,
    );
    expect(namesInView()).toEqual(['Mercury']);
    rerender(
      <div style={{ width: 776 }}>
        <Planets columns={{ base: 1, sm: 2 }} gap="md" />
      </div>,
    );
    await expect.poll(() => namesInView()).toEqual(['Mercury', 'Venus']);
  });

  it('drops the slides of children that were removed', async () => {
    const labels = Array.from({ length: 12 }, (_, at) => `Slide ${String(at + 1)}`);
    function Slides({ count }: { count: number }) {
      return (
        <Carousel aria-label="Planets" isLooping>
          {labels.slice(0, count).map((label) => (
            <p key={label}>{label}</p>
          ))}
        </Carousel>
      );
    }
    const { rerender } = render(<Slides count={12} />);
    // Every slide has been near the view, so every one is drawn.
    for (let step = 0; step < 12; step++) {
      await userEvent.click(button('Next slide'));
    }
    rerender(<Slides count={10} />);
    const drawn = [...region().querySelectorAll('[aria-roledescription="slide"]')].map((slide) =>
      slide.getAttribute('aria-label'),
    );
    expect(drawn.length).toBeLessThanOrEqual(10);
    expect(drawn).not.toContain('11 of 10');
    expect(drawn).not.toContain('12 of 10');
  });

  it('leaves a drag on a widget that claims the pointer to the widget', () => {
    render(
      <Carousel aria-label="Planets">
        <div className="flex h-32 flex-col gap-2">
          <div
            data-testid="claims"
            className="h-10"
            onPointerDown={(event) => {
              event.preventDefault();
            }}
          />
          <div
            data-testid="captures"
            className="h-10"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          >
            <span data-testid="inside-capture" className="block h-full" />
          </div>
          <div
            role="slider"
            aria-label="Level"
            aria-valuenow={3}
            tabIndex={0}
            data-testid="slider"
            className="h-10"
          />
        </div>
        <p>Second</p>
      </Carousel>,
    );
    drag(-150, { pointerType: 'mouse', target: screen.getByTestId('claims') });
    expect(slidesInView()).toEqual(['1 of 2']);
    drag(-150, { pointerType: 'mouse', target: screen.getByTestId('slider') });
    expect(slidesInView()).toEqual(['1 of 2']);
    // Elsewhere in the slide still drags.
    drag(-150, { pointerType: 'mouse' });
    expect(slidesInView()).toEqual(['2 of 2']);
  });

  it('leaves a real drag on a slider in a slide to the slider', async () => {
    const onChange = vi.fn();
    render(
      <div className="flex items-start">
        <div data-testid="outside" className="h-24 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <Carousel aria-label="Planets">
            <div className="h-24 p-4">
              <Slider label="Volume" defaultValue={80} onChange={onChange} />
            </div>
            <p>Second</p>
          </Carousel>
        </div>
      </div>,
    );
    const thumb = screen.getByRole('slider').parentElement?.parentElement;
    if (!thumb) {
      throw new Error('No slider thumb');
    }
    await userEvent.dragAndDrop(thumb, screen.getByTestId('outside'));
    expect(onChange).toHaveBeenCalled();
    expect(slidesInView()).toEqual(['1 of 2']);
  });

  it("doesn't render the slides or the picker again for hover, focus or a drag", () => {
    const slideRendered = vi.fn();
    const thumbnailRendered = vi.fn();
    const childRendered = vi.fn();
    const items = Array.from({ length: 6 }, (_, at) => at);
    function Child({ name }: { name: string }) {
      childRendered();
      return <p>{name}</p>;
    }
    render(
      <>
        <Carousel
          aria-label="Planets"
          items={items}
          renderThumbnail={(item: number) => {
            thumbnailRendered();
            return <span>{item}</span>;
          }}
        >
          {(item) => {
            slideRendered();
            return <button type="button">Item {item}</button>;
          }}
        </Carousel>
        <Carousel aria-label="Children">
          <Child name="One" />
          <Child name="Two" />
        </Carousel>
      </>,
    );
    const counts = () =>
      [slideRendered, thumbnailRendered, childRendered].map((spy) => spy.mock.calls.length);
    const before = counts();
    for (const name of ['Planets', 'Children']) {
      const carousel = screen.getByRole('region', { name });
      fireEvent.pointerEnter(carousel, { pointerType: 'mouse' });
      fireEvent.pointerLeave(carousel, { pointerType: 'mouse' });
      act(() => {
        within(carousel).getAllByRole('button')[0]?.focus();
      });
      act(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
    }
    // A short drag that snaps back changes nothing either.
    drag(-20);
    expect(counts()).toEqual(before);
  });

  it('draws only the thumbnails in view in a long strip, and keeps the current one in view', async () => {
    const undo = enableVirtualizer();
    try {
      const items = Array.from({ length: 500 }, (_, at) => at + 1);
      const renderThumbnail = vi.fn((item: number, at: number) => (
        <span className="block size-full bg-surface-3">{`${String(item)}/${String(at)}`}</span>
      ));
      render(
        <Carousel aria-label="Planets" items={items} renderThumbnail={renderThumbnail}>
          {(item) => <p>Item {item}</p>}
        </Carousel>,
      );
      const strip = within(region()).getByRole('listbox', { name: 'Choose slide' });
      await expect.poll(() => within(strip).queryAllByRole('option').length).toBeGreaterThan(0);
      expect(within(strip).getAllByRole('option').length).toBeLessThan(40);
      // The render function gets the item, then its index.
      expect(renderThumbnail).toHaveBeenCalledWith(1, 0);
      act(() => {
        button('Next slide').focus();
      });
      await userEvent.keyboard('{End}');
      expect(slidesInView()).toEqual(['500 of 500']);
      await expect
        .poll(() => within(strip).queryByRole('option', { name: 'Slide 500 of 500' }))
        .toHaveAttribute('aria-selected', 'true');
    } finally {
      undo();
    }
  });

  it('keeps the chosen thumbnail current with several slides in view', async () => {
    render(
      <Planets
        columns={3}
        renderThumbnail={(at) => <span className="block size-full bg-surface-3">{at + 1}</span>}
      />,
    );
    const strip = within(region()).getByRole('listbox', { name: 'Choose slide' });
    const selected = () =>
      within(strip)
        .getAllByRole('option')
        .filter((option) => option.getAttribute('aria-selected') === 'true')
        .map((option) => option.getAttribute('aria-label'));
    await userEvent.click(within(strip).getByRole('option', { name: 'Slide 8 of 8' }));
    expect(namesInView()).toEqual(['Saturn', 'Uranus', 'Neptune']);
    expect(selected()).toEqual(['Slide 8 of 8']);
    // One already in view becomes current without moving.
    await userEvent.click(within(strip).getByRole('option', { name: 'Slide 7 of 8' }));
    expect(namesInView()).toEqual(['Saturn', 'Uranus', 'Neptune']);
    expect(selected()).toEqual(['Slide 7 of 8']);
    // Any other move makes the first slide in view current.
    await userEvent.click(button('Previous slide'));
    expect(namesInView()).toEqual(['Jupiter', 'Saturn', 'Uranus']);
    expect(selected()).toEqual(['Slide 5 of 8']);
  });

  it('calls its own handlers as well as the ones passed in', () => {
    const onKeyDown = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    render(
      <Planets
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />,
    );
    act(() => {
      button('Next slide').focus();
    });
    fireEvent.keyDown(button('Next slide'), { key: 'ArrowRight' });
    expect(namesInView()).toEqual(['Venus']);
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    fireEvent.pointerEnter(region(), { pointerType: 'mouse' });
    fireEvent.pointerLeave(region(), { pointerType: 'mouse' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("lets a passed-in key handler stop the carousel's own", () => {
    render(
      <Planets
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    act(() => {
      button('Next slide').focus();
    });
    fireEvent.keyDown(button('Next slide'), { key: 'ArrowRight' });
    expect(namesInView()).toEqual(['Mercury']);
  });

  it("doesn't scroll the page sideways on a phone", () => {
    render(<Planets columns={{ base: 1, sm: 2, md: 3 }} isLooping />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });
});

describe('Carousel autoplay', () => {
  it('moves on by itself, with a button that stops and starts it', async () => {
    render(<Planets shouldAutoPlay isLooping autoPlayIntervalMs={100} />);
    // A pointer resting over the carousel pauses it.
    await userEvent.unhover(region());
    const stop = button('Stop automatic slide show');
    // The live region is quiet while the slides change by themselves.
    expect(viewport()).toHaveAttribute('aria-live', 'off');
    await expect.poll(() => namesInView()).toEqual(['Venus']);
    await userEvent.click(stop);
    expect(button('Start automatic slide show')).toBeInTheDocument();
    // Pressing the button keeps focus on it; the pointer still over the carousel pauses it, so move it away.
    await userEvent.unhover(region());
    const stoppedAt = namesInView();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(namesInView()).toEqual(stoppedAt);
    expect(viewport()).toHaveAttribute('aria-live', 'polite');
    await userEvent.click(button('Start automatic slide show'));
    await userEvent.unhover(region());
    await expect.poll(() => namesInView()).not.toEqual(stoppedAt);
  });

  it('pauses while focus from a click is inside, and comes back round after the last slide', async () => {
    render(
      <>
        <button type="button">Outside</button>
        <Planets count={2} shouldAutoPlay autoPlayIntervalMs={100} />
      </>,
    );
    await userEvent.click(button('Visit Mercury'));
    await userEvent.unhover(region());
    expect(document.activeElement).toBe(button('Visit Mercury'));
    expect(viewport()).toHaveAttribute('aria-live', 'polite');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(namesInView()).toEqual(['Mercury']);
    expect(button('Stop automatic slide show')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
    expect(viewport()).toHaveAttribute('aria-live', 'off');
    await expect.poll(() => namesInView()).toEqual(['Venus']);
    // Without looping it comes back to the start.
    await expect.poll(() => namesInView()).toEqual(['Mercury']);
  });

  it('stops for good when keyboard focus comes in', async () => {
    const onPlayingChange = vi.fn();
    render(
      <>
        <button type="button">Before</button>
        <Planets shouldAutoPlay autoPlayIntervalMs={100} onPlayingChange={onPlayingChange} />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.unhover(region());
    await userEvent.keyboard('{Tab}');
    expect(region().contains(document.activeElement)).toBe(true);
    expect(onPlayingChange).toHaveBeenCalledWith(false);
    expect(button('Start automatic slide show')).toBeInTheDocument();
    expect(viewport()).toHaveAttribute('aria-live', 'polite');
    // Leaving doesn't start it again.
    const stoppedAt = namesInView();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(region().contains(document.activeElement)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(namesInView()).toEqual(stoppedAt);
  });

  it.runIf(isDesktop)('pauses while the pointer is over it', async () => {
    render(<Planets shouldAutoPlay autoPlayIntervalMs={100} />);
    await userEvent.hover(viewport());
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(namesInView()).toEqual(['Mercury']);
    await userEvent.unhover(region());
    await expect.poll(() => namesInView()).toEqual(['Venus']);
  });

  it('pauses while the page is hidden', async () => {
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    render(<Planets shouldAutoPlay autoPlayIntervalMs={100} />);
    await userEvent.unhover(region());
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(namesInView()).toEqual(['Mercury']);
    state.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => namesInView()).toEqual(['Venus']);
  });

  it('stops when the slides are dragged', () => {
    const onPlayingChange = vi.fn();
    render(<Planets shouldAutoPlay onPlayingChange={onPlayingChange} />);
    drag(-120);
    expect(onPlayingChange).toHaveBeenCalledWith(false);
    expect(button('Start automatic slide show')).toBeInTheDocument();
  });

  it('starts stopped when the user prefers reduced motion', () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const list = matchMedia(query);
      if (query === '(prefers-reduced-motion: reduce)') {
        Object.defineProperty(list, 'matches', { value: true });
      }
      return list;
    });
    render(<Planets shouldAutoPlay />);
    expect(button('Start automatic slide show')).toBeInTheDocument();
  });

  it('can be controlled', async () => {
    const onPlayingChange = vi.fn();
    render(<Planets isPlaying={false} onPlayingChange={onPlayingChange} />);
    await userEvent.click(button('Start automatic slide show'));
    expect(onPlayingChange).toHaveBeenCalledWith(true);
    expect(button('Start automatic slide show')).toBeInTheDocument();
  });
});
