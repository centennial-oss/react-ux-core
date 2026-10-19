import { act, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Messages } from '../../provider/messages';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  exposureProperties,
  exposureValues,
  marsShape,
  moonShape,
  shapeProperties,
} from '../../../test/shapes';
import type { PropertyInspectorMessages } from './messages';
import { PropertyInspector, type PropertyInspectorProps } from './PropertyInspector';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = !hasTouch;

type Shape = Record<string, unknown>;

/** Applies each change to every selected shape, as an app would. */
function Shapes({
  initial = [moonShape],
  onChange,
  ...props
}: { initial?: Shape[] } & Partial<PropertyInspectorProps>) {
  const [shapes, setShapes] = useState<Shape[]>(initial);
  return (
    <PropertyInspector
      aria-label="Shape properties"
      properties={shapeProperties}
      values={shapes.length === 1 ? (shapes[0] ?? {}) : shapes}
      onChange={(id, value) => {
        onChange?.(id, value);
        setShapes((current) =>
          current.map((shape) => ({
            ...shape,
            [id]:
              id === 'position' ? { ...(shape.position as object), ...(value as object) } : value,
          })),
        );
      }}
      {...props}
    />
  );
}

function row(id: string) {
  const element = document.querySelector<HTMLElement>(`[data-property="${id}"]`);
  if (!element) {
    throw new Error(`No property ${id}`);
  }
  return element;
}

function pointer(target: Element, type: string, clientX: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      button: 0,
      clientX,
      pointerType: 'mouse',
    }),
  );
}

describe('PropertyInspector', () => {
  it('shows a shape’s properties in groups, each field labelled', () => {
    render(<Shapes />);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Moon');
    const transform = screen.getByRole('button', { name: 'Transform' });
    expect(transform).toHaveAttribute('aria-expanded', 'true');
    expect(transform.closest('h3')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const position = screen.getByRole('group', { name: 'Position' });
    expect(within(position).getByRole('textbox', { name: 'X' })).toHaveValue('120');
    expect(within(position).getByRole('textbox', { name: 'Y' })).toHaveValue('80');
    expect(screen.getByRole('textbox', { name: 'Width' })).toHaveValue('64');
    expect(screen.getByRole('textbox', { name: 'Rotation' })).toHaveValue('0');
    expect(row('rotation').textContent).toContain('°');
    expect(screen.getByRole('group', { name: 'Fill' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Stroke width' })).toHaveValue('2');
    expect(screen.getByRole('switch', { name: 'Visible' })).toBeChecked();
  });

  it('edits position, size, rotation, fill and stroke width', async () => {
    const onChange = vi.fn();
    render(<Shapes onChange={onChange} />);
    const width = screen.getByRole('textbox', { name: 'Width' });
    await userEvent.clear(width);
    await userEvent.type(width, '80');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith('width', 80);

    const x = within(screen.getByRole('group', { name: 'Position' })).getByRole('textbox', {
      name: 'X',
    });
    await userEvent.clear(x);
    await userEvent.type(x, '130');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith('position', { x: 130, y: 80 });

    const rotation = screen.getByRole('textbox', { name: 'Rotation' });
    await userEvent.clear(rotation);
    await userEvent.type(rotation, '45');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith('rotation', 45);

    const stroke = screen.getByRole('textbox', { name: 'Stroke width' });
    await userEvent.clear(stroke);
    await userEvent.type(stroke, '3.5');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith('strokeWidth', 3.5);

    const swatches = within(screen.getByRole('group', { name: 'Fill' })).getAllByRole('option');
    const fifth = swatches[4];
    if (!fifth) {
      throw new Error('No fifth swatch');
    }
    await userEvent.click(fifth);
    expect(onChange).toHaveBeenLastCalledWith('fill', 'chart-5');
  });

  it.skipIf(!isDesktop)(
    'steps numbers with the arrow keys, the keyboard way to scrub',
    async () => {
      const onChange = vi.fn();
      render(<Shapes onChange={onChange} />);
      await userEvent.click(screen.getByRole('textbox', { name: 'Stroke width' }));
      await userEvent.keyboard('{ArrowUp}');
      expect(onChange).toHaveBeenLastCalledWith('strokeWidth', 2.5);
      await userEvent.click(screen.getByRole('textbox', { name: 'Rotation' }));
      await userEvent.keyboard('{ArrowDown}');
      expect(onChange).toHaveBeenLastCalledWith('rotation', -1);
    },
  );

  it('scrubs a number by dragging its label, and a press focuses the field', () => {
    const onChange = vi.fn();
    render(<Shapes onChange={onChange} />);
    const label = row('width').querySelector('[data-scrub]');
    if (!label) {
      throw new Error('No scrub label');
    }
    act(() => {
      pointer(label, 'pointerdown', 100);
      pointer(label, 'pointermove', 140);
      pointer(label, 'pointerup', 140);
    });
    expect(onChange).toHaveBeenLastCalledWith('width', 74);
    expect(screen.getByRole('textbox', { name: 'Width' })).toHaveValue('74');

    act(() => {
      pointer(label, 'pointerdown', 100);
      pointer(label, 'pointermove', 60);
      pointer(label, 'pointerup', 60);
    });
    expect(onChange).toHaveBeenLastCalledWith('width', 64);

    act(() => {
      pointer(label, 'pointerdown', 100);
      pointer(label, 'pointerup', 100);
    });
    expect(screen.getByRole('textbox', { name: 'Width' })).toHaveFocus();
  });

  it('shows "Mixed" for two shapes with different fills, and an edit applies to both', async () => {
    const onChange = vi.fn();
    render(<Shapes initial={[moonShape, marsShape]} onChange={onChange} />);
    expect(screen.getByText('2 objects selected')).toBeInTheDocument();
    expect(row('fill').textContent).toEqual(expect.stringContaining('Mixed'));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('placeholder', 'Mixed');
    expect(screen.getByRole('textbox', { name: 'Width' })).toHaveAttribute('placeholder', 'Mixed');
    expect(screen.getByRole('textbox', { name: 'Stroke width' })).toHaveValue('2');
    const position = screen.getByRole('group', { name: 'Position' });
    expect(within(position).getByRole('textbox', { name: 'X' })).toHaveAttribute(
      'placeholder',
      'Mixed',
    );
    expect(within(position).getByRole('textbox', { name: 'Y' })).toHaveValue('80');

    const swatch = within(screen.getByRole('group', { name: 'Fill' })).getAllByRole('option')[1];
    if (!swatch) {
      throw new Error('No swatch');
    }
    await userEvent.click(swatch);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('fill', 'chart-2');
    expect(row('fill').textContent).not.toEqual(expect.stringContaining('Mixed'));

    // Y is shared, X isn't: editing Y sends only Y, for the app to merge into each position.
    const y = within(position).getByRole('textbox', { name: 'Y' });
    await userEvent.clear(y);
    await userEvent.type(y, '90');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith('position', { y: 90 });
  });

  it('collapses a group from its heading', async () => {
    render(<Shapes />);
    const appearance = screen.getByRole('button', { name: 'Appearance' });
    await userEvent.click(appearance);
    expect(appearance).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox', { name: 'Stroke width' })).toBeNull();
  });

  it('shows an empty state with nothing selected', () => {
    const { unmount } = render(<Shapes initial={[]} />);
    expect(screen.getByText('Select something to see its properties.')).toBeInTheDocument();
    unmount();
    render(<Shapes initial={[]} emptyState={<p>Pick a planet</p>} />);
    expect(screen.getByText('Pick a planet')).toBeInTheDocument();
  });

  it('renders every property type', () => {
    render(
      <PropertyInspector
        properties={exposureProperties}
        values={exposureValues}
        onChange={vi.fn()}
        isCompact={false}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Target' })).toHaveValue('M31');
    expect(screen.getByRole('switch', { name: 'Guided' })).toBeChecked();
    expect(screen.getByRole('button', { name: /Filter/ }).textContent).toContain('Red');
    expect(screen.getByRole('textbox', { name: 'Exposure' })).toHaveValue('5');
    expect(screen.getByRole('textbox', { name: 'File size' })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Telescope time' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Position angle' })).toHaveValue('38');
    expect(screen.getByRole('textbox', { name: 'FITS header' })).toHaveValue(
      JSON.stringify(exposureValues.header, null, 2),
    );
  });

  it('sends parsed JSON only when the text is valid', async () => {
    const onChange = vi.fn();
    render(
      <PropertyInspector
        properties={exposureProperties}
        values={exposureValues}
        onChange={onChange}
      />,
    );
    const header = screen.getByRole('textbox', { name: 'FITS header' });
    await userEvent.clear(header);
    await userEvent.type(header, '{{"OBJECT": "M31"');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.type(header, '}');
    expect(onChange).toHaveBeenLastCalledWith('header', { OBJECT: 'M31' });
  });

  it.skipIf(!hasTouch)('collapses a group with a tap and fits a phone', async () => {
    render(
      <div className="p-2">
        <Shapes />
      </div>,
    );
    screen.getByRole('button', { name: 'Transform' }).setAttribute('data-test-trigger', '');
    await commands.tap('[data-test-trigger]');
    await expect
      .poll(() => screen.getByRole('button', { name: 'Transform' }).getAttribute('aria-expanded'))
      .toBe('false');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes its strings from UIProvider messages', () => {
    const messages: Partial<PropertyInspectorMessages> = {
      propertyMixed: 'Mixto',
      propertySelectionCount: ({ count }) => `${String(count)} seleccionados`,
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <Shapes initial={[moonShape, marsShape]} />
      </UIProvider>,
    );
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('placeholder', 'Mixto');
  });

  it('has no axe violations, for one shape or two', async () => {
    const { container } = render(<Shapes initial={[moonShape, marsShape]} />);
    await expectNoAxeViolations(container);
  });
});
