import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { planetImages } from '../../../test/mediaImages';
import { Button } from '../../components/Button/Button';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { ImageGallery } from './ImageGallery';
import { Lightbox } from './Lightbox';
import type { MediaImageMessages } from './messages';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;
const planets = planetImages();

function position(): string {
  return within(screen.getByRole('dialog')).getByText(/^\d+ of \d+$/).textContent;
}

function stage(): HTMLElement {
  return within(screen.getByRole('dialog')).getByRole('application');
}

/** A one-finger swipe across the image. */
function swipe(dx: number): void {
  const element = stage();
  const rect = element.getBoundingClientRect();
  const base = { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 };
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  fireEvent.pointerDown(element, { ...base, clientX: x, clientY: y });
  fireEvent.pointerMove(element, { ...base, clientX: x + dx / 2, clientY: y });
  fireEvent.pointerMove(element, { ...base, clientX: x + dx, clientY: y });
  fireEvent.pointerUp(element, { ...base, clientX: x + dx, clientY: y });
}

function ControlledLightbox({ initialIndex = 0 }: { initialIndex?: number }) {
  const [isOpen, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  return (
    <>
      <Button
        onPress={() => {
          setOpen(true);
        }}
      >
        View planets
      </Button>
      <Lightbox
        images={planets}
        isOpen={isOpen}
        onOpenChange={setOpen}
        index={index}
        onIndexChange={setIndex}
        hasDownload
      />
    </>
  );
}

describe('Lightbox', () => {
  it('opens full screen on the image, focused, with its position, caption and thumbnails', async () => {
    render(<Lightbox images={planets} defaultOpen defaultIndex={2} />);
    const dialog = await screen.findByRole('dialog', { name: 'Images' });
    expect(position()).toBe('3 of 8');
    expect(within(dialog).getByText('Earth')).toBeInTheDocument();
    await expect.poll(() => document.activeElement).toBe(stage());
    expect(stage()).toHaveAccessibleName('Earth against a field of stars');
    const strip = within(dialog).getByRole('listbox', { name: 'Thumbnails' });
    expect(within(strip).getAllByRole('option')).toHaveLength(8);
    expect(
      within(strip).getByRole('option', { name: 'Earth against a field of stars' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations(dialog);
  });

  it('preloads the neighbouring images', async () => {
    render(<Lightbox images={planets} defaultOpen defaultIndex={4} />);
    await screen.findByRole('dialog');
    const preloaded = [...document.querySelectorAll('link[rel="preload"][as="image"]')].map(
      (link) => link.getAttribute('href'),
    );
    expect(preloaded).toEqual(expect.arrayContaining([planets[3]?.src, planets[5]?.src]));
  });

  it('changes image with the previous and next buttons, disabled at the ends', async () => {
    render(<Lightbox images={planets} defaultOpen />);
    await screen.findByRole('dialog');
    const previous = screen.getByRole('button', { name: 'Previous image' });
    const next = screen.getByRole('button', { name: 'Next image' });
    expect(previous).toBeDisabled();
    await userEvent.click(next);
    expect(position()).toBe('2 of 8');
    await userEvent.click(previous);
    expect(position()).toBe('1 of 8');
  });

  it.runIf(isDesktop)('changes image with the arrow keys, Home and End', async () => {
    render(<Lightbox images={planets} defaultOpen />);
    await screen.findByRole('dialog');
    await expect.poll(() => document.activeElement).toBe(stage());
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(position()).toBe('3 of 8');
    await userEvent.keyboard('{ArrowLeft}');
    expect(position()).toBe('2 of 8');
    await userEvent.keyboard('{End}');
    expect(position()).toBe('8 of 8');
    await userEvent.keyboard('{Home}');
    expect(position()).toBe('1 of 8');
    // Zoomed in, the arrows pan the image instead.
    await userEvent.keyboard('++++');
    await userEvent.keyboard('{ArrowRight}');
    expect(position()).toBe('1 of 8');
  });

  it('changes image with a swipe', async () => {
    render(<Lightbox images={planets} defaultOpen />);
    await screen.findByRole('dialog');
    swipe(-120);
    expect(position()).toBe('2 of 8');
    swipe(120);
    expect(position()).toBe('1 of 8');
  });

  it('changes image from the thumbnail strip', async () => {
    render(<Lightbox images={planets} defaultOpen />);
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('option', { name: 'Mars against a field of stars' }),
    );
    expect(position()).toBe('4 of 8');
  });

  it.runIf(isTouch)('changes image with a tap on a thumbnail', async () => {
    render(<Lightbox images={planets} defaultOpen />);
    await screen.findByRole('dialog');
    await commands.tap('[role="option"][data-key="jupiter"]');
    expect(position()).toBe('5 of 8');
  });

  it.runIf(isDesktop)(
    'closes with Escape and returns focus to the button that opened it',
    async () => {
      render(<ControlledLightbox />);
      const trigger = screen.getByRole('button', { name: 'View planets' });
      await userEvent.click(trigger);
      await screen.findByRole('dialog');
      await userEvent.keyboard('{Escape}');
      await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
      // Focus comes back a frame after the dialog leaves the DOM.
      await expect.poll(() => document.activeElement).toBe(trigger);
    },
  );

  it('downloads the current image with its file name', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    try {
      render(<ControlledLightbox initialIndex={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'View planets' }));
      await screen.findByRole('dialog');
      await userEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(click).toHaveBeenCalledTimes(1);
      const link = click.mock.contexts[0] as HTMLAnchorElement;
      expect(link.download).toBe('saturn.png');
      expect(link.href).toBe(planets[5]?.src);
    } finally {
      click.mockRestore();
    }
  });

  it('takes its strings from UIProvider', async () => {
    const messages: Partial<MediaImageMessages> = {
      imageLightbox: 'Planètes',
      imageNext: 'Suivante',
      imagePosition: ({ position: at, total }) => `${String(at)} sur ${String(total)}`,
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <Lightbox images={planets} defaultOpen />
      </UIProvider>,
    );
    expect(await screen.findByRole('dialog', { name: 'Planètes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivante' })).toBeInTheDocument();
    expect(screen.getByText('1 sur 8')).toBeInTheDocument();
  });
});

describe('ImageGallery', () => {
  it('lists thumbnails named by their alt text, and opens the lightbox at the one chosen', async () => {
    const onIndexChange = vi.fn();
    const { container } = render(
      <ImageGallery images={planets} hasCaptions onIndexChange={onIndexChange} />,
    );
    const list = screen.getByRole('list', { name: 'Image gallery' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(8);
    expect(within(list).getByText('Neptune')).toBeInTheDocument();
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'Venus against a field of stars' }));
    await screen.findByRole('dialog');
    expect(position()).toBe('2 of 8');
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it.runIf(isTouch)('opens the lightbox with a tap', async () => {
    render(<ImageGallery images={planets} />);
    await commands.tap('ul[aria-label="Image gallery"] > li:first-child button');
    await screen.findByRole('dialog');
    expect(position()).toBe('1 of 8');
  });

  it('never makes the page scroll sideways on a phone', () => {
    render(
      <div className="p-2">
        <ImageGallery images={planets} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('leaves the carousel on the image the lightbox closed on, with focus there', async () => {
    render(<ImageGallery images={planets} layout="carousel" />);
    const carousel = screen.getByRole('region', { name: 'Image gallery' });
    await userEvent.click(within(carousel).getByRole('button', { name: 'Next slide' }));
    await userEvent.click(
      within(carousel).getByRole('button', { name: 'Venus against a field of stars' }),
    );
    const dialog = await screen.findByRole('dialog');
    for (let step = 0; step < 4; step++) {
      await userEvent.click(within(dialog).getByRole('button', { name: 'Next image' }));
    }
    expect(position()).toBe('6 of 8');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    expect(within(carousel).getByRole('group', { name: '6 of 8' })).toBeInTheDocument();
    await expect
      .poll(() => document.activeElement)
      .toBe(within(carousel).getByRole('button', { name: 'Saturn against a field of stars' }));
  });

  it("calls the app's handlers in the carousel layout too", async () => {
    const onFocus = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <ImageGallery images={planets} layout="carousel" onFocus={onFocus} onKeyDown={onKeyDown} />,
    );
    const carousel = screen.getByRole('region', { name: 'Image gallery' });
    await userEvent.click(within(carousel).getByRole('button', { name: 'Next slide' }));
    expect(onFocus).toHaveBeenCalled();
    await userEvent.keyboard('{ArrowRight}');
    expect(onKeyDown).toHaveBeenCalled();
    expect(within(carousel).getByRole('group', { name: '3 of 8' })).toBeInTheDocument();
  });

  it('shows one image at a time as a carousel, and opens the lightbox at the one in view', async () => {
    const onIndexChange = vi.fn();
    render(
      <ImageGallery images={planets} layout="carousel" hasCaptions onIndexChange={onIndexChange} />,
    );
    const carousel = screen.getByRole('region', { name: 'Image gallery' });
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    const thumbnails = within(carousel).getByRole('listbox', { name: 'Choose slide' });
    expect(within(thumbnails).getAllByRole('option')).toHaveLength(8);
    await userEvent.click(within(thumbnails).getByRole('option', { name: 'Slide 3 of 8' }));
    expect(within(carousel).getByRole('group')).toHaveAccessibleName('3 of 8');
    expect(within(within(carousel).getByRole('group')).getByText('Earth')).toBeInTheDocument();
    await userEvent.click(
      within(carousel).getByRole('button', { name: 'Earth against a field of stars' }),
    );
    await screen.findByRole('dialog');
    expect(position()).toBe('3 of 8');
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    await expectNoAxeViolations(carousel);
  });
});
