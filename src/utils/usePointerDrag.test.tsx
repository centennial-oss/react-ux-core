import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePointerDrag, type PointerDrag } from './usePointerDrag';

function pointer(element: Element, type: string, clientX: number, button = 0) {
  act(() => {
    element.dispatchEvent(
      new PointerEvent(type, {
        clientX,
        clientY: 0,
        button,
        pointerId: 3,
        pointerType: 'mouse',
        bubbles: true,
      }),
    );
  });
}

interface Options {
  isPressOnly?: boolean;
  threshold?: number;
  onDrop?: (drag: PointerDrag<string>, result: { step: number }) => void;
  onPress?: (drag: PointerDrag<string>) => void;
  onRender?: (preview: { step: number } | null) => void;
}

/** Drags in steps of 10 pixels. */
function Draggable({ isPressOnly, threshold, onDrop = vi.fn(), onPress, onRender }: Options) {
  const drag = usePointerDrag<string, { step: number }>({
    resolve: ({ originX }, clientX) => ({ step: Math.round((clientX - originX) / 10) }),
    onDrop,
    onPress,
    threshold,
  });
  onRender?.(drag.preview);
  return (
    <div
      data-testid="target"
      onPointerDown={(event) => {
        drag.begin(event, 'item', isPressOnly);
      }}
      onPointerMove={drag.move}
      onPointerUp={drag.end}
      onPointerCancel={drag.cancel}
    />
  );
}

describe('usePointerDrag', () => {
  it('previews a drag once it passes the threshold, keeping the preview while it lands the same, then drops', () => {
    const onDrop = vi.fn();
    const onPress = vi.fn();
    const previews: ({ step: number } | null)[] = [];
    const { getByTestId } = render(
      <Draggable
        onDrop={onDrop}
        onPress={onPress}
        onRender={(preview) => {
          previews.push(preview);
        }}
      />,
    );
    const target = getByTestId('target');
    pointer(target, 'pointerdown', 100);
    // Within the mouse's tap slop: still a press.
    pointer(target, 'pointermove', 103);
    expect(previews.at(-1)).toBeNull();
    pointer(target, 'pointermove', 111);
    const first = previews.at(-1);
    expect(first).toEqual({ step: 1 });
    // The same step again keeps the same preview, so nothing drawn from it changes.
    pointer(target, 'pointermove', 112);
    expect(previews.at(-1)).toBe(first);
    pointer(target, 'pointermove', 121);
    expect(previews.at(-1)).toEqual({ step: 2 });
    pointer(target, 'pointerup', 131);
    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'item', originX: 100, hasMoved: true }),
      { step: 3 },
    );
    expect(onPress).not.toHaveBeenCalled();
    expect(previews.at(-1)).toBeNull();
  });

  it('presses when the pointer goes up without dragging, or for a press-only item', () => {
    const onDrop = vi.fn();
    const onPress = vi.fn();
    const { getByTestId, rerender } = render(<Draggable onDrop={onDrop} onPress={onPress} />);
    const target = getByTestId('target');
    pointer(target, 'pointerdown', 100);
    pointer(target, 'pointerup', 102);
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<Draggable onDrop={onDrop} onPress={onPress} isPressOnly />);
    pointer(target, 'pointerdown', 100);
    pointer(target, 'pointermove', 160);
    pointer(target, 'pointerup', 160);
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('takes a fixed threshold, ignores other buttons, and forgets a cancelled drag', () => {
    const onDrop = vi.fn();
    const onPress = vi.fn();
    const { getByTestId } = render(<Draggable onDrop={onDrop} onPress={onPress} threshold={20} />);
    const target = getByTestId('target');
    pointer(target, 'pointerdown', 100, 2);
    pointer(target, 'pointerup', 150);
    expect(onPress).not.toHaveBeenCalled();
    pointer(target, 'pointerdown', 100);
    pointer(target, 'pointermove', 115);
    pointer(target, 'pointerup', 115);
    // 15 pixels is short of 20: a press.
    expect(onPress).toHaveBeenCalledTimes(1);
    pointer(target, 'pointerdown', 100);
    pointer(target, 'pointermove', 140);
    pointer(target, 'pointercancel', 140);
    pointer(target, 'pointerup', 140);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
