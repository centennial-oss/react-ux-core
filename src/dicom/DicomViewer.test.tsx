import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import {
  itemAt,
  JPEG_BASELINE,
  PHANTOM_PIXEL_SPACING,
  phantomImageIds,
  toImageIds,
  writeDicom,
} from '../../test/dicom';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { DicomViewer } from './DicomViewer';
import { loadDicomImage } from './loader';
import type { DicomLengthMeasurement, DicomMeasurement } from './measurements';
import type { DicomMessages } from './messages';

const isPhone = window.innerWidth < 640;
const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

const imageIds = phantomImageIds({ slices: 20, size: 64 });
const coronalIds = phantomImageIds({ slices: 10, size: 64, seriesDescription: 'Coronal' });
const overlays = {
  topLeft: ['Phantom Ada', 'PHANTOM-001'],
  topRight: ['Ring phantom study'],
};

function viewport(): HTMLElement {
  return screen.getByRole('application', { name: 'Image' });
}

/** Waits until every image on screen (the slice and any thumbnails) has loaded. */
async function loaded(): Promise<void> {
  await expect
    .poll(() => document.querySelectorAll('[data-dicom-status="loading"]').length)
    .toBe(0);
  await expect.poll(() => document.querySelector('[data-dicom-status]')).not.toBeNull();
}

function statusText(): string {
  return screen.getByText(/^Slice \d+ of \d+/, { selector: 'span' }).textContent;
}

/** Fires a mouse press, optional drag, and release on the viewport at offsets from its centre. */
function click(dx: number, dy: number, to?: { dx: number; dy: number }): void {
  const element = viewport();
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const base = { pointerId: 1, button: 0, pointerType: 'mouse', isPrimary: true };
  fireEvent.pointerDown(element, { ...base, clientX: x + dx, clientY: y + dy });
  const end = to ?? { dx, dy };
  if (to) {
    fireEvent.pointerMove(element, { ...base, clientX: x + end.dx, clientY: y + end.dy });
  }
  fireEvent.pointerUp(element, { ...base, clientX: x + end.dx, clientY: y + end.dy });
}

describe('DicomViewer', () => {
  it('shows the series, slice position, window and zoom as text, and says it’s not diagnostic', async () => {
    render(<DicomViewer imageIds={imageIds} overlays={overlays} />);
    expect(screen.getByRole('group', { name: 'Image viewer' })).toBeInTheDocument();
    await expect.poll(statusText).toBe('Slice 1 of 20, -50 mm');
    expect(screen.getByText('Window 400, level 40')).toBeInTheDocument();
    expect(screen.getByText('Zoom 100%')).toBeInTheDocument();
    expect(screen.getByText('For review only. Not for diagnostic use.')).toBeInTheDocument();
    expect(viewport()).toHaveAccessibleDescription(/Page Up/);
    const information = screen.getByRole('list', { name: 'Image information' });
    expect(within(information).getByText('Phantom Ada')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Slice' })).toHaveValue('1');
  });

  it.runIf(!isPhone)('draws the slice through the window, and inverts it', async () => {
    render(<DicomViewer imageIds={imageIds} />);
    await loaded();
    const canvas = viewport().querySelector('canvas');
    const centre = () => {
      if (!canvas) {
        return -1;
      }
      const pixel = canvas
        .getContext('2d')
        ?.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
      return pixel?.[0] ?? -1;
    };
    // The phantom's water core (0 HU) under the default window (400 / 40).
    const water = Math.round(((0 - 39.5) / 399 + 0.5) * 255);
    await expect.poll(centre).toBe(water);
    await userEvent.click(screen.getByRole('button', { name: 'Invert' }));
    await expect.poll(centre).toBe(255 - water);
  });

  it.runIf(isDesktop)('scrolls a 200-slice stack to its end', async () => {
    const longStack = phantomImageIds({ slices: 200, size: 32 });
    render(<DicomViewer imageIds={longStack} />);
    await loaded();
    viewport().focus();
    await userEvent.keyboard('{Shift>}{PageDown}{/Shift}');
    await expect.poll(statusText).toBe('Slice 11 of 200, 0 mm');
    await userEvent.keyboard('{End}');
    await expect.poll(statusText).toBe('Slice 200 of 200, 945 mm');
  });

  it.runIf(isDesktop)(
    'scrolls the stack with the keyboard and announces where it stops',
    async () => {
      const onSliceChange = vi.fn();
      render(<DicomViewer imageIds={imageIds} onSliceChange={onSliceChange} />);
      await loaded();
      viewport().focus();
      await userEvent.keyboard('{PageDown}');
      await expect.poll(statusText).toBe('Slice 2 of 20, -45 mm');
      expect(onSliceChange).toHaveBeenLastCalledWith(1);
      await userEvent.keyboard('{End}');
      await expect.poll(statusText).toBe('Slice 20 of 20, 45 mm');
      await userEvent.keyboard('{Home}{ArrowDown}{ArrowDown}');
      await expect.poll(statusText).toBe('Slice 3 of 20, -40 mm');
      await expect.poll(() => screen.getByRole('status').textContent).toBe('Slice 3 of 20, -40 mm');
    },
  );

  it('scrolls with the slider and the wheel', async () => {
    render(<DicomViewer imageIds={imageIds} />);
    await loaded();
    const slider = screen.getByRole('slider', { name: 'Slice' });
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(statusText).toBe('Slice 2 of 20, -45 mm');
    fireEvent.wheel(viewport(), { deltaY: 100 });
    await expect.poll(statusText).toBe('Slice 4 of 20, -35 mm');
    fireEvent.wheel(viewport(), { deltaY: -50 });
    await expect.poll(statusText).toBe('Slice 3 of 20, -40 mm');
  });

  it('loads through a custom loader and prefetches the neighbours', async () => {
    const loadImage = vi.fn(loadDicomImage);
    render(
      <DicomViewer
        imageIds={imageIds}
        loadImage={loadImage}
        defaultSliceIndex={10}
        prefetchCount={3}
      />,
    );
    await expect.poll(statusText).toBe('Slice 11 of 20, 0 mm');
    expect(loadImage).toHaveBeenCalledWith(imageIds[10], expect.any(AbortSignal));
    await expect
      .poll(() => loadImage.mock.calls.map(([id]) => imageIds.indexOf(id)).sort((a, b) => a - b))
      .toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it('applies window presets and returns to the image’s own window', async () => {
    render(<DicomViewer imageIds={imageIds} />);
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: 'Window' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Lung' }));
    await expect.poll(() => screen.queryByText('Window 1,500, level -600')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Window' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Image default' }));
    await expect.poll(() => screen.queryByText('Window 400, level 40')).not.toBeNull();
  });

  it.runIf(isDesktop)('changes window and level with the arrow keys', async () => {
    render(<DicomViewer imageIds={imageIds} />);
    await loaded();
    await userEvent.click(screen.getByRole('radio', { name: 'Window and level' }));
    viewport().focus();
    // The phantom spans −1000 to 700 HU, so a key press steps 1700 / 200 = 8.5.
    await userEvent.keyboard('{ArrowRight}{ArrowUp}');
    await expect.poll(() => screen.queryByText('Window 408.5, level 48.5')).not.toBeNull();
  });

  it.runIf(isDesktop)('measures a length in mm from the keyboard', async () => {
    const onMeasurementsChange = vi.fn();
    render(<DicomViewer imageIds={imageIds} onMeasurementsChange={onMeasurementsChange} />);
    await loaded();
    await userEvent.click(screen.getByRole('radio', { name: 'Length' }));
    viewport().focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => screen.getByRole('status').textContent).toBe('Point 1 of 2 placed');
    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{ArrowDown}{/Shift}{Enter}');
    await expect.poll(() => onMeasurementsChange.mock.calls.length).toBe(1);
    const [measurements] = onMeasurementsChange.mock.lastCall as [DicomMeasurement[]];
    const length = measurements[0] as DicomLengthMeasurement;
    expect(length).toMatchObject({
      kind: 'length',
      unit: 'mm',
      imageId: imageIds[0],
      sliceIndex: 0,
    });
    const [a, b] = length.points;
    expect(length.length).toBeCloseTo(
      Math.hypot((b.x - a.x) * PHANTOM_PIXEL_SPACING, (b.y - a.y) * PHANTOM_PIXEL_SPACING),
    );
    expect(length.length).toBeGreaterThan(0);
    const list = screen.getByRole('list', { name: 'Measurements' });
    expect(within(list).getByRole('button', { name: /^Length [\d.]+ mm, slice 1$/ })).toBeVisible();
    await expect
      .poll(() => screen.getByRole('status').textContent)
      .toMatch(/^Added Length [\d.]+ mm, slice 1$/);
  });

  it.runIf(isDesktop)('cancels a measurement in progress with Escape', async () => {
    const onMeasurementsChange = vi.fn();
    render(
      <DicomViewer
        imageIds={imageIds}
        defaultTool="angle"
        onMeasurementsChange={onMeasurementsChange}
      />,
    );
    await loaded();
    viewport().focus();
    await userEvent.keyboard('{Enter}{ArrowLeft}{Enter}{Escape}');
    await expect.poll(() => screen.getByRole('status').textContent).toBe('Measurement cancelled');
    expect(onMeasurementsChange).not.toHaveBeenCalled();
  });

  it('measures an angle with clicks and a rectangular region by dragging', async () => {
    const onMeasurementsChange = vi.fn();
    const { rerender } = render(
      <DicomViewer imageIds={imageIds} tool="angle" onMeasurementsChange={onMeasurementsChange} />,
    );
    await loaded();
    click(-40, 0);
    click(0, 0);
    click(0, -40);
    await expect
      .poll(() => screen.queryByRole('button', { name: 'Angle 90°, slice 1' }))
      .not.toBeNull();
    rerender(
      <DicomViewer
        imageIds={imageIds}
        tool="rectangleRoi"
        onMeasurementsChange={onMeasurementsChange}
      />,
    );
    // A small box around the phantom's water core (0 HU).
    click(-6, -6, { dx: 6, dy: 6 });
    await expect
      .poll(() =>
        screen.queryByRole('button', { name: /^Rectangle [\d.,]+ mm², mean 0 ± 0, slice 1$/ }),
      )
      .not.toBeNull();
    expect(onMeasurementsChange).toHaveBeenCalledTimes(2);
  });

  it('removes a measurement, jumps to one, and clears them all', async () => {
    const onMeasurementsChange = vi.fn();
    const length = (id: string, sliceIndex: number): DicomLengthMeasurement => ({
      id,
      kind: 'length',
      imageId: itemAt(imageIds, sliceIndex),
      sliceIndex,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ],
      length: 7.5,
      unit: 'mm',
    });
    render(
      <DicomViewer
        imageIds={imageIds}
        defaultMeasurements={[length('a', 0), length('b', 4), length('c', 9)]}
        onMeasurementsChange={onMeasurementsChange}
      />,
    );
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: 'Length 7.5 mm, slice 5' }));
    await expect.poll(statusText).toBe('Slice 5 of 20, -30 mm');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Length 7.5 mm, slice 1' }));
    expect(onMeasurementsChange).toHaveBeenLastCalledWith([length('b', 4), length('c', 9)]);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onMeasurementsChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole('list', { name: 'Measurements' })).toBeNull();
  });

  it.runIf(!isPhone)('hides the overlay text with a toggle', async () => {
    const onOverlayHiddenChange = vi.fn();
    render(
      <DicomViewer
        imageIds={imageIds}
        overlays={overlays}
        onOverlayHiddenChange={onOverlayHiddenChange}
      />,
    );
    await loaded();
    const toggle = screen.getByRole('button', { name: 'Overlay text' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(onOverlayHiddenChange).toHaveBeenCalledWith(true);
  });

  it('switches series from the thumbnails', async () => {
    const onSeriesChange = vi.fn();
    render(
      <DicomViewer
        series={[
          { id: 'axial', label: 'Axial', imageIds },
          { id: 'coronal', label: 'Coronal', imageIds: coronalIds },
        ]}
        onSeriesChange={onSeriesChange}
      />,
    );
    await loaded();
    const group = screen.getByRole('radiogroup', { name: 'Series' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    expect(screen.getByText('Series: Axial')).toBeInTheDocument();
    await userEvent.click(within(group).getByRole('radio', { name: /Coronal/ }));
    expect(onSeriesChange).toHaveBeenCalledWith('coronal');
    await expect.poll(statusText).toBe('Slice 1 of 10, -50 mm');
    expect(screen.getByText('Series: Coronal')).toBeInTheDocument();
    expect(screen.getByText('10 images')).toBeInTheDocument();
  });

  it('explains that compressed images need a custom loader', async () => {
    const compressed = toImageIds([
      writeDicom({
        rows: 2,
        columns: 2,
        pixels: new Uint16Array(4),
        transferSyntax: JPEG_BASELINE,
      }),
    ]);
    render(<DicomViewer imageIds={compressed} />);
    expect(await screen.findByText('Couldn’t load the image')).toBeInTheDocument();
    expect(screen.getByText(/compressed in a format the viewer can’t decode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('says when there are no images', () => {
    render(<DicomViewer imageIds={[]} />);
    expect(screen.getByText('No images')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it.runIf(isDesktop)('goes full screen and back with Escape', async () => {
    render(<DicomViewer imageIds={imageIds} />);
    await loaded();
    const root = screen.getByRole('group', { name: 'Image viewer' });
    await userEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(root.className).toContain('fixed');
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();
    viewport().focus();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => root.className.includes('fixed')).toBe(false);
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  });

  it.runIf(isPhone)('collapses the tools into menus on a phone, operable by touch', async () => {
    // Padding, as a page has: small buttons' touch targets reach a few pixels past their edges.
    render(
      <div className="p-2">
        <DicomViewer imageIds={imageIds} />
      </div>,
    );
    await loaded();
    expect(screen.queryByRole('radiogroup', { name: 'Tool' })).toBeNull();
    await commands.tap('button:has-text("Tool: Scroll slices")');
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Length' }));
    await expect.poll(() => screen.queryByRole('button', { name: 'Tool: Length' })).not.toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it.runIf(isTouch && !isPhone)('changes tools with a tap', async () => {
    render(<DicomViewer imageIds={imageIds} />);
    await loaded();
    await commands.tap('[role="radio"][aria-label="Pan"]');
    await expect
      .poll(() => screen.getByRole('radio', { name: 'Pan' }).getAttribute('aria-checked'))
      .toBe('true');
  });

  it('takes its strings from UIProvider messages', async () => {
    const overrides: Partial<DicomMessages> = {
      dicomSlice: 'Schicht',
      dicomSlicePosition: ({ slice, total }) => `Schicht ${String(slice)}/${String(total)}`,
      dicomDisclaimer: 'Nur zur Ansicht.',
    };
    render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <DicomViewer imageIds={imageIds} />
      </UIProvider>,
    );
    await loaded();
    expect(screen.getByRole('slider', { name: 'Schicht' })).toBeInTheDocument();
    expect(screen.getByText('Schicht 1/20', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Nur zur Ansicht.')).toBeInTheDocument();
  });

  it('has no axe violations, with series, overlays and measurements', async () => {
    const { container } = render(
      <div className="p-2">
        <DicomViewer
          series={[
            { id: 'axial', label: 'Axial', imageIds },
            { id: 'coronal', label: 'Coronal', imageIds: coronalIds },
          ]}
          overlays={overlays}
          defaultMeasurements={[
            {
              id: 'a',
              kind: 'angle',
              imageId: itemAt(imageIds),
              sliceIndex: 0,
              points: [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 30, y: 10 },
              ],
              degrees: 90,
            },
          ]}
        />
      </div>,
    );
    await loaded();
    await expectNoAxeViolations(container);
    if (isPhone) {
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
  });
});
