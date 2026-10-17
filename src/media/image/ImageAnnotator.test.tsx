import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { bodyDiagram, telescopeAnnotations, telescopeDiagram } from '../../../test/mediaImages';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { ImageAnnotator } from './ImageAnnotator';
import type { MediaImageMessages } from './messages';
import type { Annotation, PinAnnotation, PolygonAnnotation, RectAnnotation } from './types';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;
const body = bodyDiagram();
const telescope = telescopeDiagram();
const labels = ['Bruise', 'Laceration', 'Burn', 'Sprain', 'Swelling'];
const bodyPins: Annotation[] = [
  { id: 'a', kind: 'pin', x: 0.5, y: 0.12, label: 'Burn' },
  { id: 'b', kind: 'pin', x: 0.3, y: 0.45, label: 'Bruise', note: 'About 3 cm across.' },
];

function stage(): HTMLElement {
  return screen.getByRole('application');
}

async function loaded(): Promise<void> {
  await expect
    .poll(() => document.querySelector('[data-status]')?.getAttribute('data-status'))
    .toBe('loaded');
}

/** The client position of an image point (the image is fitted and not rotated). */
function clientPoint(x: number, y: number): { clientX: number; clientY: number } {
  const rect = document.querySelector('[data-image-layer]')?.getBoundingClientRect();
  if (!rect) {
    throw new Error('No image layer');
  }
  return { clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y };
}

type PointerType = 'mouse' | 'touch';

function press(target: Element, x: number, y: number, pointerType: PointerType = 'mouse'): void {
  fireEvent.pointerDown(target, {
    pointerId: 1,
    pointerType,
    button: 0,
    isPrimary: true,
    ...clientPoint(x, y),
  });
}

function moveTo(x: number, y: number, pointerType: PointerType = 'mouse'): void {
  fireEvent.pointerMove(stage(), {
    pointerId: 1,
    pointerType,
    isPrimary: true,
    ...clientPoint(x, y),
  });
}

function release(x: number, y: number, pointerType: PointerType = 'mouse'): void {
  fireEvent.pointerUp(stage(), {
    pointerId: 1,
    pointerType,
    isPrimary: true,
    ...clientPoint(x, y),
  });
}

function tapAt(x: number, y: number, pointerType: PointerType = 'mouse'): void {
  press(stage(), x, y, pointerType);
  release(x, y, pointerType);
}

function marker(id: string): Element {
  const element = document.querySelector(`[data-annotation-marker][data-annotation-id="${id}"]`);
  if (!element) {
    throw new Error(`No marker for ${id}`);
  }
  return element;
}

function lastChange(onChange: ReturnType<typeof vi.fn>): Annotation[] {
  return onChange.mock.lastCall?.[0] as Annotation[];
}

describe('ImageAnnotator', () => {
  it('shows each annotation on the image and in a list, numbered the same', async () => {
    const { container } = render(
      <ImageAnnotator image={telescope} defaultAnnotations={telescopeAnnotations} />,
    );
    await loaded();
    const list = screen.getByRole('grid', { name: 'Annotations' });
    const rows = within(list).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('1Dew shield'),
      expect.stringContaining('2Eyepiece'),
      expect.stringContaining('3Tripod'),
    ]);
    expect(marker('eyepiece').textContent).toBe('2');
    expect(document.querySelector('rect[data-annotation-id="objective"]')).not.toBeNull();
    expect(document.querySelector('polygon[data-annotation-id="tripod"]')).not.toBeNull();
    expect(screen.getByRole('radiogroup', { name: 'Annotation tools' })).toBeInTheDocument();
    expect(stage()).toHaveAccessibleDescription(/arrow keys move it/);
    await expectNoAxeViolations(container);
  });

  it('keeps the selection in step between the image and the list', async () => {
    const onSelectionChange = vi.fn();
    render(
      <ImageAnnotator
        image={telescope}
        defaultAnnotations={telescopeAnnotations}
        onSelectionChange={onSelectionChange}
      />,
    );
    await loaded();
    await userEvent.click(screen.getByRole('row', { name: /Dew shield/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith('objective');
    // A selected rectangle shows its corner handles.
    expect(document.querySelectorAll('[data-annotation-handle]')).toHaveLength(4);
    const eyepiece = marker('eyepiece');
    const rect = eyepiece.getBoundingClientRect();
    const at = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    fireEvent.pointerDown(eyepiece, { pointerId: 1, pointerType: 'mouse', button: 0, ...at });
    fireEvent.pointerUp(stage(), { pointerId: 1, pointerType: 'mouse', ...at });
    expect(onSelectionChange).toHaveBeenLastCalledWith('eyepiece');
    expect(screen.getByRole('row', { name: /Eyepiece/ })).toHaveAttribute('aria-selected', 'true');
  });

  it.runIf(isTouch)(
    'places 5 labelled pins on a body diagram by touch',
    async () => {
      const onChange = vi.fn();
      render(
        <ImageAnnotator
          image={body}
          defaultAnnotations={[]}
          tools={['pin']}
          labelOptions={labels}
          onChange={onChange}
        />,
      );
      await loaded();
      await commands.tap('button[aria-label="Pin"]');
      const spots = [
        [0.5, 0.5],
        [0.5, 0.12],
        [0.25, 0.4],
        [0.42, 0.8],
        [0.6, 0.85],
      ] as const;
      for (const [index, [x, y]] of spots.entries()) {
        if (index === 0) {
          // A real tap in the middle of the image.
          await commands.tap('[role="application"]');
        } else {
          tapAt(x, y, 'touch');
        }
        await screen.findByRole('dialog');
        await commands.tap(`[role="dialog"] >> text="${String(labels[index])}"`);
        await commands.tap('[role="dialog"] >> text="Done"');
        await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
      }
      const pins = lastChange(onChange) as PinAnnotation[];
      expect(pins.map((pin) => pin.label)).toEqual(labels);
      pins.forEach((pin, index) => {
        expect(pin.kind).toBe('pin');
        expect(pin.x).toBeCloseTo(spots[index]?.[0] ?? -1, 1);
        expect(pin.y).toBeCloseTo(spots[index]?.[1] ?? -1, 1);
      });
      expect(within(screen.getByRole('grid')).getAllByRole('row')).toHaveLength(5);
    },
    30_000,
  );

  it.runIf(isDesktop)('edits an annotation from the list with the keyboard', async () => {
    const onChange = vi.fn();
    render(
      <ImageAnnotator
        image={body}
        defaultAnnotations={bodyPins}
        labelOptions={labels}
        onChange={onChange}
      />,
    );
    await loaded();
    screen.getByRole('button', { name: 'Add' }).focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(screen.getByRole('row', { name: /Burn/ }));
    await userEvent.keyboard('{ArrowDown}');
    const row = screen.getByRole('row', { name: /Bruise/ });
    expect(row).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Edit Bruise' });
    await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
    // The chosen label's radio has focus; the arrow keys choose another.
    await userEvent.keyboard('{ArrowRight}');
    expect(lastChange(onChange).find((item) => item.id === 'b')?.label).toBe('Laceration');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: 'Note' }));
    await userEvent.keyboard('{End} Cleaned.');
    expect(lastChange(onChange).find((item) => item.id === 'b')?.note).toBe(
      'About 3 cm across. Cleaned.',
    );
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('row', { name: /Laceration/ }));
  });

  it.runIf(isDesktop)(
    'adds a pin in the middle of the view with the keyboard, then moves, edits and deletes it',
    async () => {
      const onChange = vi.fn();
      render(
        <ImageAnnotator
          image={body}
          defaultAnnotations={[]}
          onChange={onChange}
          createId={() => 'new'}
        />,
      );
      await loaded();
      await userEvent.click(screen.getByRole('radio', { name: 'Pin' }));
      stage().focus();
      await userEvent.keyboard('{Enter}');
      let pin = lastChange(onChange)[0] as PinAnnotation;
      expect(pin).toMatchObject({ id: 'new', kind: 'pin', label: '' });
      expect(pin.x).toBeCloseTo(0.5, 5);
      expect(pin.y).toBeCloseTo(0.5, 5);
      await expect
        .poll(() => screen.getAllByRole('status').at(-1)?.textContent)
        .toBe('Unlabelled added');
      await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}');
      pin = lastChange(onChange)[0] as PinAnnotation;
      expect(pin.x).toBeCloseTo(0.51, 5);
      expect(pin.y).toBeCloseTo(0.55, 5);
      await userEvent.keyboard('{Enter}');
      const dialog = await screen.findByRole('dialog', { name: 'Edit Unlabelled' });
      await userEvent.click(within(dialog).getByRole('textbox', { name: 'Label' }));
      await userEvent.keyboard('Mole');
      expect(lastChange(onChange)[0]?.label).toBe('Mole');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
      await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
      await expect.poll(() => document.activeElement).toBe(stage());
      await userEvent.keyboard('{Delete}');
      expect(lastChange(onChange)).toEqual([]);
      await expect
        .poll(() => screen.getAllByRole('status').at(-1)?.textContent)
        .toBe('Mole deleted');
    },
  );

  it.runIf(isDesktop)('moves a pin and resizes a rectangle by dragging', async () => {
    const onChange = vi.fn();
    render(
      <ImageAnnotator
        image={telescope}
        defaultAnnotations={telescopeAnnotations}
        defaultSelectedId="objective"
        onChange={onChange}
      />,
    );
    await loaded();
    press(marker('eyepiece'), 0.17, 0.61);
    moveTo(0.25, 0.6);
    moveTo(0.3, 0.5);
    release(0.3, 0.5);
    const eyepiece = lastChange(onChange).find((item) => item.id === 'eyepiece') as PinAnnotation;
    expect(eyepiece.x).toBeCloseTo(0.3, 2);
    expect(eyepiece.y).toBeCloseTo(0.5, 2);

    await userEvent.click(screen.getByRole('row', { name: /Dew shield/ }));
    const corner = document.querySelector('[data-annotation-handle="se"]');
    if (!corner) {
      throw new Error('No corner handle');
    }
    press(corner, 0.83, 0.36);
    moveTo(0.9, 0.5);
    release(0.9, 0.5);
    const shield = lastChange(onChange).find((item) => item.id === 'objective') as RectAnnotation;
    expect(shield.x).toBeCloseTo(0.69, 5);
    expect(shield.width).toBeCloseTo(0.21, 2);
    expect(shield.height).toBeCloseTo(0.44, 2);
  });

  it.runIf(isDesktop)('draws a rectangle and a polygon', async () => {
    const onChange = vi.fn();
    render(<ImageAnnotator image={telescope} defaultAnnotations={[]} onChange={onChange} />);
    await loaded();
    await userEvent.click(screen.getByRole('radio', { name: 'Rectangle' }));
    press(stage(), 0.1, 0.1);
    moveTo(0.2, 0.2);
    moveTo(0.3, 0.4);
    release(0.3, 0.4);
    const rect = lastChange(onChange)[0] as RectAnnotation;
    expect(rect.kind).toBe('rect');
    expect(rect.x).toBeCloseTo(0.1, 2);
    expect(rect.width).toBeCloseTo(0.2, 2);
    expect(rect.height).toBeCloseTo(0.3, 2);
    // The editor opens for the new shape.
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(screen.getByRole('radio', { name: 'Polygon' }));
    expect(screen.getByText(/Tap to add points/)).toBeInTheDocument();
    tapAt(0.6, 0.2);
    tapAt(0.8, 0.5);
    tapAt(0.5, 0.6);
    expect(screen.getByRole('button', { name: 'Finish shape' })).toBeInTheDocument();
    stage().focus();
    await userEvent.keyboard('{Enter}');
    const polygon = lastChange(onChange)[1] as PolygonAnnotation;
    expect(polygon.kind).toBe('polygon');
    expect(polygon.points).toHaveLength(3);
    expect(polygon.points[1]?.x).toBeCloseTo(0.8, 2);
  });

  it('can be read-only: annotations are selectable but not editable', async () => {
    const onChange = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <ImageAnnotator
        image={telescope}
        defaultAnnotations={telescopeAnnotations}
        isReadOnly
        onChange={onChange}
        onSelectionChange={onSelectionChange}
      />,
    );
    await loaded();
    expect(screen.queryByRole('radiogroup', { name: 'Annotation tools' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    const eyepiece = marker('eyepiece');
    fireEvent.pointerDown(eyepiece, {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      ...clientPoint(0.17, 0.61),
    });
    fireEvent.pointerUp(stage(), {
      pointerId: 1,
      pointerType: 'touch',
      ...clientPoint(0.17, 0.61),
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith('eyepiece');
    stage().focus();
    await userEvent.keyboard('{ArrowRight}{Delete}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes its strings from UIProvider', async () => {
    const messages: Partial<MediaImageMessages> = {
      annotatorList: 'Marques',
      annotatorEmpty: 'Aucune marque.',
      annotatorKindPin: 'Épingle',
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <ImageAnnotator image={body} defaultAnnotations={[]} />
      </UIProvider>,
    );
    await loaded();
    expect(screen.getByRole('grid', { name: 'Marques' })).toBeInTheDocument();
    expect(screen.getByText('Aucune marque.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Épingle' })).toBeInTheDocument();
  });

  it('never makes the page scroll sideways', async () => {
    render(
      <div className="p-2">
        <ImageAnnotator image={telescope} defaultAnnotations={telescopeAnnotations} />
      </div>,
    );
    await loaded();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
