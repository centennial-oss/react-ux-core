import { render, screen, within } from '@testing-library/react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline, VolumeX } from 'lucide-react';
import { createRef, useState } from 'react';
import type { Key } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { ToggleButton, ToggleButtonGroup } from './ToggleButton';

const hasTouch = navigator.maxTouchPoints > 0;

function Alignment(props: { onSelectionChange?: (keys: Set<Key>) => void; isRequired?: boolean }) {
  return (
    <ToggleButtonGroup
      aria-label="Alignment"
      defaultSelectedKeys={['left']}
      disallowEmptySelection={props.isRequired}
      onSelectionChange={props.onSelectionChange}
    >
      <ToggleButton id="left" icon={AlignLeft} isIconOnly>
        Align left
      </ToggleButton>
      <ToggleButton id="center" icon={AlignCenter} isIconOnly>
        Align centre
      </ToggleButton>
      <ToggleButton id="right" icon={AlignRight} isIconOnly>
        Align right
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

function Styles() {
  return (
    <ToggleButtonGroup aria-label="Text style" selectionMode="multiple" isAttached>
      <ToggleButton id="bold" icon={Bold}>
        Bold
      </ToggleButton>
      <ToggleButton id="italic" icon={Italic}>
        Italic
      </ToggleButton>
      <ToggleButton id="underline" icon={Underline}>
        Underline
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

describe('ToggleButton', () => {
  it('is a toggle button (aria-pressed), uncontrolled with defaultSelected', async () => {
    const onChange = vi.fn();
    render(
      <ToggleButton icon={VolumeX} defaultSelected={false} onChange={onChange}>
        Mute
      </ToggleButton>,
    );
    const button = screen.getByRole('button', { name: 'Mute' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-selected', 'true');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('follows isSelected when controlled, and stays put when not updated', async () => {
    function Controlled() {
      const [isMuted, setMuted] = useState(true);
      return (
        <ToggleButton isSelected={isMuted} onChange={setMuted}>
          Mute
        </ToggleButton>
      );
    }
    const { unmount } = render(<Controlled />);
    const button = screen.getByRole('button', { name: 'Mute' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{Tab}{Enter}');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard(' ');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    unmount();

    const onChange = vi.fn();
    render(
      <ToggleButton isSelected={false} onChange={onChange}>
        Mute
      </ToggleButton>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('names an icon-only button by its label and shows the label in a tooltip', async () => {
    render(
      <ToggleButton icon={Bold} isIconOnly>
        Bold
      </ToggleButton>,
    );
    const button = screen.getByRole('button', { name: 'Bold' });
    await userEvent.keyboard('{Tab}');
    expect(button).toHaveFocus();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe('Bold');
  });

  it('matches Button’s sizes, and is square when icon-only', () => {
    render(
      <>
        <ToggleButton size="sm">Small</ToggleButton>
        <ToggleButton size="md">Medium</ToggleButton>
        <ToggleButton size="lg">Large</ToggleButton>
        <ToggleButton size="sm" icon={Bold} isIconOnly>
          Bold
        </ToggleButton>
      </>,
    );
    const height = (name: string) =>
      screen.getByRole('button', { name }).getBoundingClientRect().height;
    expect(height('Small')).toBe(32);
    expect(height('Medium')).toBe(40);
    expect(height('Large')).toBe(48);
    expect(screen.getByRole('button', { name: 'Bold' }).getBoundingClientRect().width).toBe(32);
  });

  it('is neutral while off and shows its tone once pressed', () => {
    render(
      <>
        <ToggleButton tone="danger" variant="outline">
          Off
        </ToggleButton>
        <ToggleButton tone="danger" variant="outline" defaultSelected>
          On
        </ToggleButton>
        <ToggleButton variant="outline" defaultSelected>
          Neutral
        </ToggleButton>
      </>,
    );
    const style = (name: string) => getComputedStyle(screen.getByRole('button', { name }));
    expect(screen.getByRole('button', { name: 'Off' })).toHaveClass('border-neutral-border');
    expect(style('Off').backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style('On').backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(style('On').backgroundColor).not.toBe(style('Neutral').backgroundColor);
  });

  it('passes className, ref and data attributes through', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <ToggleButton ref={ref} className="w-40" data-testid="mute">
        Mute
      </ToggleButton>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Mute' }));
    expect(ref.current).toHaveClass('w-40');
    expect(screen.getByTestId('mute')).toBe(ref.current);
  });
});

describe('ToggleButtonGroup', () => {
  it('holds a single choice as radios that can be cleared', async () => {
    const onSelectionChange = vi.fn();
    render(<Alignment onSelectionChange={onSelectionChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Alignment' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Align left' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Align right' }));
    expect(screen.getByRole('radio', { name: 'Align right' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Align left' })).not.toBeChecked();
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['right']));
    // Pressing the chosen button again clears the choice.
    await userEvent.click(screen.getByRole('radio', { name: 'Align right' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());
  });

  it('keeps one pressed with disallowEmptySelection', async () => {
    render(<Alignment isRequired />);
    await userEvent.click(screen.getByRole('radio', { name: 'Align left' }));
    expect(screen.getByRole('radio', { name: 'Align left' })).toBeChecked();
  });

  it('moves focus with the arrow keys without changing the selection', async () => {
    render(<Alignment />);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('radio', { name: 'Align left' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Align centre' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Align left' })).toBeChecked();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('radio', { name: 'Align centre' })).toBeChecked();
  });

  it('holds several at once with multiple selection', async () => {
    render(<Styles />);
    const group = screen.getByRole('toolbar', { name: 'Text style' });
    const bold = within(group).getByRole('button', { name: 'Bold' });
    const italic = within(group).getByRole('button', { name: 'Italic' });
    await userEvent.click(bold);
    await userEvent.click(italic);
    expect(bold).toHaveAttribute('aria-pressed', 'true');
    expect(italic).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(bold);
    expect(bold).toHaveAttribute('aria-pressed', 'false');
  });

  it('follows controlled selectedKeys', async () => {
    function Controlled() {
      const [keys, setKeys] = useState<Set<Key>>(new Set(['center']));
      return (
        <>
          <ToggleButtonGroup aria-label="Alignment" selectedKeys={keys} onSelectionChange={setKeys}>
            <ToggleButton id="left">Left</ToggleButton>
            <ToggleButton id="center">Centre</ToggleButton>
          </ToggleButtonGroup>
          <button
            type="button"
            onClick={() => {
              setKeys(new Set(['left']));
            }}
          >
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole('radio', { name: 'Centre' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
  });

  it('gives its look to its buttons, and joins them when attached', () => {
    render(
      <>
        <ToggleButtonGroup aria-label="Small" size="sm" tone="accent">
          <ToggleButton id="a">A</ToggleButton>
        </ToggleButtonGroup>
        <Styles />
      </>,
    );
    const small = screen.getByRole('radio', { name: 'A' });
    expect(small.getBoundingClientRect().height).toBe(32);
    expect(small).toHaveClass('data-selected:bg-accent-solid');
    const attached = screen.getByRole('toolbar', { name: 'Text style' });
    expect(getComputedStyle(attached).borderTopWidth).toBe('1px');
    const border = (name: string) =>
      getComputedStyle(within(attached).getByRole('button', { name })).borderInlineEndWidth;
    expect(border('Bold')).toBe('1px');
    expect(border('Underline')).toBe('0px');
  });

  it.each([
    ['labelled', false],
    ['icon-only', true],
  ] as const)(
    'keeps dividers between %s buttons when attached, rounding only the ends',
    (_, isIconOnly) => {
      const icons = { Bold, Italic, Underline };
      render(
        <ToggleButtonGroup aria-label="Text style" selectionMode="multiple" isAttached>
          {(['Bold', 'Italic', 'Underline'] as const).map((name) =>
            isIconOnly ? (
              <ToggleButton key={name} id={name} icon={icons[name]} isIconOnly>
                {name}
              </ToggleButton>
            ) : (
              <ToggleButton key={name} id={name} icon={icons[name]}>
                {name}
              </ToggleButton>
            ),
          )}
        </ToggleButtonGroup>,
      );
      const style = (name: string) => getComputedStyle(screen.getByRole('button', { name }));
      // Every button but the last has a divider after it.
      expect(style('Bold').borderInlineEndWidth).toBe('1px');
      expect(style('Italic').borderInlineEndWidth).toBe('1px');
      expect(style('Underline').borderInlineEndWidth).toBe('0px');
      // Only the outer corners are rounded.
      expect(style('Bold').borderTopLeftRadius).not.toBe('0px');
      expect(style('Bold').borderTopRightRadius).toBe('0px');
      expect(style('Italic').borderTopLeftRadius).toBe('0px');
      expect(style('Italic').borderTopRightRadius).toBe('0px');
      expect(style('Underline').borderTopLeftRadius).toBe('0px');
      expect(style('Underline').borderTopRightRadius).not.toBe('0px');
    },
  );

  it('disables every button with isDisabled', async () => {
    const onSelectionChange = vi.fn();
    render(
      <ToggleButtonGroup aria-label="Alignment" isDisabled onSelectionChange={onSelectionChange}>
        <ToggleButton id="left">Left</ToggleButton>
      </ToggleButtonGroup>,
    );
    const left = screen.getByRole('radio', { name: 'Left' });
    expect(left).toBeDisabled();
    await userEvent.click(left, { force: true });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it.runIf(hasTouch)('toggles on tap, with touch-sized targets', async () => {
    render(<Alignment />);
    await commands.tap('[aria-label="Alignment"] > span:last-child > button');
    expect(screen.getByRole('radio', { name: 'Align right' })).toBeChecked();
    const hitSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hit-size'),
    );
    for (const button of screen.getAllByRole('radio')) {
      const rect = button.getBoundingClientRect();
      const before = getComputedStyle(button, '::before');
      expect(
        rect.height - parseFloat(before.top) - parseFloat(before.bottom),
      ).toBeGreaterThanOrEqual(hitSize);
    }
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <>
        <Alignment />
        <Styles />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
