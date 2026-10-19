import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useWheel } from './useWheel';

afterEach(() => {
  document.body.replaceChildren();
});

function wheel(init: WheelEventInit) {
  return new WheelEvent('wheel', { cancelable: true, ...init });
}

describe('useWheel', () => {
  it('calls the latest handler from a non-passive listener and detaches on unmount', () => {
    const element = document.createElement('div');
    document.body.append(element);
    const target = { current: element };
    const calls: string[] = [];
    const { rerender, unmount } = renderHook(
      ({ name }) => {
        useWheel(target, (event) => {
          event.preventDefault();
          calls.push(name);
        });
      },
      { initialProps: { name: 'first' } },
    );
    const first = wheel({ deltaY: 10 });
    element.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    rerender({ name: 'second' });
    element.dispatchEvent(wheel({ deltaY: 10 }));
    expect(calls).toEqual(['first', 'second']);
    unmount();
    element.dispatchEvent(wheel({ deltaY: 10 }));
    expect(calls).toHaveLength(2);
  });
});
