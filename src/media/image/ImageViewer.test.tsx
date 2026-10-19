import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { BROKEN_IMAGE_SRC, largeImageUrl, starfieldImage } from '../../../test/mediaImages';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { ImageViewer, type ImageViewerProps } from './ImageViewer';
import type { MediaImageMessages } from './messages';
import type { MediaImage } from './types';

const isDesktop = window.innerWidth >= 1024;

const starfield: MediaImage = {
  id: 'starfield',
  src: starfieldImage({ width: 1600, height: 1000 }),
  alt: 'A ringed planet against the stars',
};

function stage(): HTMLElement {
  return screen.getByRole('application');
}

function layer(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-image-layer]');
  if (!element) {
    throw new Error('No image layer');
  }
  return element;
}

async function loaded(): Promise<void> {
  await expect
    .poll(() => document.querySelector('[data-status]')?.getAttribute('data-status'))
    .toBe('loaded');
}

/** Renders the viewer and records its zoom (1 = 100%). */
async function renderViewer(props: Partial<ImageViewerProps> = {}) {
  const zoom = { current: 0 };
  const result = render(
    <ImageViewer
      image={starfield}
      onZoomChange={(value) => {
        zoom.current = value;
      }}
      {...props}
    />,
  );
  await loaded();
  return { ...result, zoom };
}

/** Fires pointer events on the stage at offsets from its centre. */
function pointer(
  type: 'pointerDown' | 'pointerMove' | 'pointerUp',
  dx: number,
  dy: number,
  { id = 1, pointerType = 'touch' }: { id?: number; pointerType?: string } = {},
): void {
  const element = stage();
  const rect = element.getBoundingClientRect();
  fireEvent[type](element, {
    pointerId: id,
    pointerType,
    button: 0,
    isPrimary: id === 1,
    clientX: rect.left + rect.width / 2 + dx,
    clientY: rect.top + rect.height / 2 + dy,
  });
}

describe('ImageViewer', () => {
  it('names the image by its alt text, describes the gestures and keys, and shows the zoom level', async () => {
    const { zoom, container } = await renderViewer();
    expect(screen.getByRole('group', { name: 'Image viewer' })).toBeInTheDocument();
    expect(stage()).toHaveAccessibleName('A ringed planet against the stars');
    expect(stage()).toHaveAttribute('aria-roledescription', 'zoomable image');
    expect(stage()).toHaveAccessibleDescription(/plus and minus zoom/);
    const toolbar = screen.getByRole('toolbar', { name: 'Image controls' });
    for (const name of ['Zoom out', 'Zoom in', 'Rotate left', 'Rotate right', 'Reset view']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    // Fitted, without upscaling: the whole 1600 × 1000 image is in view.
    const frame = stage().getBoundingClientRect();
    expect(zoom.current).toBeCloseTo(Math.min(1, frame.width / 1600, frame.height / 1000), 5);
    expect(toolbar.textContent).toEqual(
      expect.stringContaining(`${String(Math.round(zoom.current * 100))}%`),
    );
    // The image moves as one transformed element; the page can't scroll or zoom under a gesture.
    expect(getComputedStyle(stage()).touchAction).toBe('none');
    expect(layer().style.transform).toContain('scale(');
    await expectNoAxeViolations(container);
  });

  it.runIf(isDesktop)(
    'zooms with + and −, resets with 0, pans with the arrows, rotates with R, and announces the zoom',
    async () => {
      const onKeyDown = vi.fn();
      const zoom = { current: 0 };
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- records keys the viewer leaves alone.
        <div onKeyDown={onKeyDown}>
          <ImageViewer
            image={starfield}
            onZoomChange={(value) => {
              zoom.current = value;
            }}
          />
        </div>,
      );
      await loaded();
      const fitted = zoom.current;
      stage().focus();
      // A fitted image can't pan, so the arrow is left for the page.
      await userEvent.keyboard('{ArrowLeft}');
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      await userEvent.keyboard('++');
      expect(zoom.current).toBeCloseTo(fitted * 1.25 * 1.25, 5);
      await expect
        .poll(() => screen.getByRole('status').textContent)
        .toBe(`${String(Math.round(zoom.current * 100))}%`);
      // Zoomed in, the image is taller than the frame, so it pans up and down.
      const before = layer().style.transform;
      await userEvent.keyboard('{ArrowUp}');
      expect(layer().style.transform).not.toBe(before);
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      await userEvent.keyboard('-');
      expect(zoom.current).toBeCloseTo(fitted * 1.25, 5);
      await userEvent.keyboard('r');
      expect(layer().style.transform).toContain('rotate(90deg)');
      await userEvent.keyboard('0');
      expect(zoom.current).toBeCloseTo(fitted, 5);
      expect(layer().style.transform).toContain('rotate(0deg)');
    },
  );

  it.runIf(isDesktop)(
    'zooms with the wheel at the pointer, and toggles 100% with a double-click',
    async () => {
      // Filled, the image covers the frame, so zooming at a point keeps that point in place.
      const { zoom } = await renderViewer({ fit: 'fill' });
      const fitted = zoom.current;
      const rect = stage().getBoundingClientRect();
      const anchor = {
        clientX: rect.left + rect.width * 0.75,
        clientY: rect.top + rect.height * 0.25,
      };
      const imageBefore = layer().getBoundingClientRect();
      const fractionBefore = (anchor.clientX - imageBefore.left) / imageBefore.width;
      const event = new WheelEvent('wheel', {
        deltaY: -200,
        bubbles: true,
        cancelable: true,
        ...anchor,
      });
      act(() => {
        stage().dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
      expect(zoom.current).toBeGreaterThan(fitted);
      // The point under the pointer stays under it.
      const imageAfter = layer().getBoundingClientRect();
      expect((anchor.clientX - imageAfter.left) / imageAfter.width).toBeCloseTo(fractionBefore, 3);

      // Zoomed all the way out, the wheel scrolls the page instead.
      stage().focus();
      await userEvent.keyboard('0');
      const outward = new WheelEvent('wheel', {
        deltaY: 200,
        bubbles: true,
        cancelable: true,
        ...anchor,
      });
      act(() => {
        stage().dispatchEvent(outward);
      });
      expect(outward.defaultPrevented).toBe(false);

      await userEvent.dblClick(stage());
      expect(zoom.current).toBe(1);
      await expect.poll(() => screen.getByRole('status').textContent).toBe('100%');
      await userEvent.dblClick(stage());
      expect(zoom.current).toBeCloseTo(fitted, 5);
    },
  );

  it('pans with a drag, zooms with a pinch, and toggles 100% with a double tap', async () => {
    const { zoom } = await renderViewer({ fit: 'fill' });
    const before = layer().style.transform;
    pointer('pointerDown', 0, 0);
    pointer('pointerMove', 30, 30);
    pointer('pointerMove', 60, 60);
    pointer('pointerUp', 60, 60);
    expect(layer().style.transform).not.toBe(before);

    const start = zoom.current;
    pointer('pointerDown', -20, 0, { id: 1 });
    pointer('pointerDown', 20, 0, { id: 2 });
    pointer('pointerMove', 40, 0, { id: 2 });
    pointer('pointerMove', 60, 0, { id: 2 });
    pointer('pointerUp', 60, 0, { id: 2 });
    pointer('pointerUp', -20, 0, { id: 1 });
    expect(zoom.current).toBeCloseTo(start * 2, 5);

    pointer('pointerDown', 0, 0);
    pointer('pointerUp', 0, 0);
    pointer('pointerDown', 2, 2);
    pointer('pointerUp', 2, 2);
    expect(zoom.current).toBe(1);
  });

  it('keeps within minZoom and maxZoom, and disables the buttons at the limits', async () => {
    const { zoom } = await renderViewer({ minZoom: 0.1, maxZoom: 1 });
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    for (let press = 0; press < 20 && !zoomIn.hasAttribute('disabled'); press += 1) {
      await userEvent.click(zoomIn);
    }
    expect(zoom.current).toBe(1);
    expect(zoomIn).toBeDisabled();
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    for (let press = 0; press < 30 && !zoomOut.hasAttribute('disabled'); press += 1) {
      await userEvent.click(zoomOut);
    }
    expect(zoom.current).toBeCloseTo(0.1, 5);
  });

  it('shows an error with the alt text when the image is broken, and retries', async () => {
    const { container } = render(
      <ImageViewer image={{ id: 'broken', src: BROKEN_IMAGE_SRC, alt: 'Saturn at opposition' }} />,
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toEqual(expect.stringContaining('Couldn’t load the image'));
    expect(alert.textContent).toEqual(expect.stringContaining('Saturn at opposition'));
    expect(screen.queryByRole('application')).toBeNull();
    expect(screen.queryByRole('toolbar')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('takes its strings from UIProvider', async () => {
    const messages: Partial<MediaImageMessages> = {
      imageViewer: 'Visionneuse',
      imageZoomIn: 'Agrandir',
      imageZoomLevel: ({ zoom }) => `Zoom ${zoom}`,
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <ImageViewer image={starfield} hasControls />
      </UIProvider>,
    );
    await loaded();
    expect(screen.getByRole('group', { name: 'Visionneuse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agrandir' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar').textContent).toEqual(expect.stringContaining('Zoom '));
  });

  describe('a 6000 × 4000 photo', () => {
    let src = '';
    beforeAll(async () => {
      src = await largeImageUrl();
    });
    afterAll(() => {
      URL.revokeObjectURL(src);
    });

    it('pinch-zooms smoothly to 400%, moving one element', async () => {
      const { zoom } = await renderViewer({
        image: { id: 'large', src, alt: 'A banded planet', width: 6000, height: 4000 },
      });
      const fitted = zoom.current;
      expect(fitted).toBeLessThan(0.25);
      const image = layer().querySelector('img');
      // Fingers 10 px apart, spreading until the zoom reaches 400%.
      const target = (10 * 4) / fitted;
      pointer('pointerDown', -5, 0, { id: 1 });
      pointer('pointerDown', 5, 0, { id: 2 });
      const steps = 30;
      const started = performance.now();
      for (let step = 1; step <= steps; step += 1) {
        pointer('pointerMove', -5 + (10 - target) * (step / steps) * 0.5, 0, { id: 1 });
        pointer('pointerMove', 5 + (target - 10) * (step / steps) * 0.5, 0, { id: 2 });
      }
      const perMove = (performance.now() - started) / (steps * 2);
      pointer('pointerUp', 0, 0, { id: 2 });
      pointer('pointerUp', 0, 0, { id: 1 });
      expect(zoom.current).toBeCloseTo(4, 5);
      await expect.poll(() => screen.getByRole('status').textContent).toBe('400%');
      // Only the layer is transformed; the image inside isn't re-laid out or restyled.
      const scale = /scale\(([\d.]+)\)/.exec(layer().style.transform)?.[1];
      expect(Number(scale)).toBeCloseTo(4, 5);
      expect(image?.getAttribute('style')).toBeNull();
      // Each pinch update (event, state, render) fits well inside a frame.
      expect(perMove).toBeLessThan(16);
    });
  });
});
