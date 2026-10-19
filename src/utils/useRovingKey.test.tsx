import { act, render, screen } from '@testing-library/react';
import { createRef, useImperativeHandle, useRef, type Ref } from 'react';
import { describe, expect, it } from 'vitest';
import { useRovingKey, type RovingKey } from './useRovingKey';

function Grid({ keys, actions }: { keys: readonly string[]; actions: Ref<RovingKey> }) {
  const ref = useRef<HTMLDivElement>(null);
  const roving = useRovingKey(ref);
  useImperativeHandle(actions, () => roving);
  return (
    <div ref={ref}>
      {keys.map((key) => (
        <button key={key} type="button" data-key={key} tabIndex={roving.activeKey === key ? 0 : -1}>
          {key}
        </button>
      ))}
    </div>
  );
}

describe('useRovingKey', () => {
  it('focuses by key and makes it the tab stop', () => {
    const actions = createRef<RovingKey>();
    render(<Grid keys={['a', 'b']} actions={actions} />);
    expect(actions.current?.activeKey).toBeNull();
    act(() => {
      actions.current?.focusKey('b');
    });
    expect(screen.getByRole('button', { name: 'b' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'b' })).toHaveAttribute('tabindex', '0');
    expect(actions.current?.elementFor('a')).toBe(screen.getByRole('button', { name: 'a' }));
    expect(actions.current?.elementFor('z')).toBeNull();
  });

  it('puts focus back on a key once it renders', () => {
    const actions = createRef<RovingKey>();
    const { rerender } = render(<Grid keys={['a', 'b']} actions={actions} />);
    act(() => {
      actions.current?.restoreFocusTo('c');
    });
    expect(document.body).toHaveFocus();
    rerender(<Grid keys={['a', 'b', 'c']} actions={actions} />);
    expect(screen.getByRole('button', { name: 'c' })).toHaveFocus();
  });
});
