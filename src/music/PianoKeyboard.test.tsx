import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { UIProvider } from '../provider/UIProvider';
import { PianoKeyboard } from './PianoKeyboard';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = window.innerWidth >= 1024;

function keyboard(): HTMLElement {
  return screen.getByRole('group', { name: 'Piano keyboard' });
}

function key(name: string): HTMLElement {
  return within(keyboard()).getByRole('button', { name });
}

/** Dispatches a pointer event at a point inside an element (as a share of its width and height). */
function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  {
    x = 0.5,
    y = 0.5,
    pointerId = 1,
    pointerType = 'mouse',
    at = target,
  }: {
    x?: number;
    y?: number;
    pointerId?: number;
    pointerType?: string;
    at?: Element;
  } = {},
) {
  const rect = at.getBoundingClientRect();
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId,
      pointerType,
      isPrimary: pointerId === 1,
      button: type === 'pointermove' ? -1 : 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + rect.width * x,
      clientY: rect.top + rect.height * y,
    }),
  );
}

class FakeMidiInput extends EventTarget {
  readonly id = 'keys-1';
  readonly name = 'Observatory Keys';
  readonly manufacturer = 'Example';
  readonly state = 'connected';
  send(data: number[]) {
    this.dispatchEvent(Object.assign(new Event('midimessage'), { data: new Uint8Array(data) }));
  }
}

class FakeMidiAccess extends EventTarget {
  readonly inputs: Map<string, FakeMidiInput>;
  constructor(input: FakeMidiInput) {
    super();
    this.inputs = new Map([[input.id, input]]);
  }
}

afterEach(() => {
  // The stubs are own properties over Navigator.prototype's method; deleting them restores it.
  Reflect.deleteProperty(navigator, 'requestMIDIAccess');
  vi.restoreAllMocks();
});

describe('PianoKeyboard', () => {
  it('has a button per key, named by pitch, from C3 to C5 by default', async () => {
    const { container } = render(<PianoKeyboard />);
    const keys = within(keyboard()).getAllByRole('button');
    expect(keys).toHaveLength(25);
    expect(keys[0]).toHaveAccessibleName('C3');
    expect(keys[1]).toHaveAccessibleName('C sharp 3');
    expect(keys.at(-1)).toHaveAccessibleName('C5');
    // One tab stop: middle C.
    expect(keys.filter((element) => element.tabIndex === 0)).toEqual([key('C4')]);
    expect(key('C4')).toHaveAttribute('aria-pressed', 'false');
    // C labels show by default.
    expect(
      [...keyboard().querySelectorAll('[data-label]')].map((label) =>
        label.getAttribute('data-label'),
      ),
    ).toEqual(['C3', 'C4', 'C5']);
    await expectNoAxeViolations(container);
  });

  it('plays while pressed, louder further down the key, and glides across keys', async () => {
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    render(<PianoKeyboard onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
    const c4 = key('C4');
    pointer(c4, 'pointerdown', { y: 0.9 });
    expect(onNoteOn).toHaveBeenLastCalledWith(60, expect.any(Number));
    const loud = onNoteOn.mock.lastCall?.[1] as number;
    await expect.poll(() => c4.getAttribute('aria-pressed')).toBe('true');
    // Dragging onto D4 releases C4 and plays D4.
    pointer(c4, 'pointermove', { y: 0.9, at: key('D4') });
    expect(onNoteOff).toHaveBeenLastCalledWith(60);
    expect(onNoteOn).toHaveBeenLastCalledWith(62, expect.any(Number));
    pointer(c4, 'pointerup', { at: key('D4') });
    expect(onNoteOff).toHaveBeenLastCalledWith(62);
    await expect.poll(() => key('D4').getAttribute('aria-pressed')).toBe('false');
    // A press near the back of the key is softer.
    pointer(key('E4'), 'pointerdown', { y: 0.82 * 0.1 });
    expect(onNoteOn.mock.lastCall?.[1]).toBeLessThan(loud);
    pointer(key('E4'), 'pointerup');
  });

  it('plays chords with several pointers at once', async () => {
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    render(<PianoKeyboard onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
    pointer(key('C4'), 'pointerdown', { pointerId: 11, pointerType: 'touch' });
    pointer(key('E4'), 'pointerdown', { pointerId: 12, pointerType: 'touch' });
    pointer(key('G4'), 'pointerdown', { pointerId: 13, pointerType: 'touch' });
    expect(onNoteOn.mock.calls.map(([pitch]) => pitch as number)).toEqual([60, 64, 67]);
    await expect
      .poll(() => within(keyboard()).queryAllByRole('button', { pressed: true }))
      .toHaveLength(3);
    pointer(key('E4'), 'pointerup', { pointerId: 12, pointerType: 'touch' });
    expect(onNoteOff).toHaveBeenCalledWith(64);
    await expect
      .poll(() => within(keyboard()).queryAllByRole('button', { pressed: true }))
      .toHaveLength(2);
  });

  it.runIf(hasTouch)('plays a note on a real touch tap', async () => {
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    render(<PianoKeyboard onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
    await commands.tap('[data-pitch="62"]');
    expect(onNoteOn).toHaveBeenCalledWith(62, expect.any(Number));
    expect(onNoteOff).toHaveBeenCalledWith(62);
  });

  it.runIf(isDesktop)('plays with Space and moves between keys with the arrow keys', async () => {
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    render(<PianoKeyboard onNoteOn={onNoteOn} onNoteOff={onNoteOff} keyboardVelocity={90} />);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(key('C4'));
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(key('C sharp 4'));
    await userEvent.keyboard('{ >}');
    expect(onNoteOn).toHaveBeenCalledWith(61, 90);
    expect(key('C sharp 4')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{/ }');
    expect(onNoteOff).toHaveBeenCalledWith(61);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(key('C5'));
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(key('C3'));
  });

  it('shows active and highlighted keys, with highlights in the key names', async () => {
    const { container } = render(
      <PianoKeyboard
        activeNotes={[60]}
        labels="all"
        highlightedNotes={[
          { pitch: 60, tone: 'accent', label: 'root' },
          { pitch: 63, tone: 'success', label: 'minor third' },
          { pitch: 67, tone: 'warning' },
        ]}
      />,
    );
    expect(key('C4, root')).toHaveAttribute('aria-pressed', 'true');
    expect(key('D sharp 4, minor third')).toBeInTheDocument();
    expect(key('G4, highlighted')).toBeInTheDocument();
    expect(keyboard().querySelector('[data-pitch="63"] [data-label]')).toHaveAttribute(
      'data-label',
      'D♯4',
    );
    await expectNoAxeViolations(container);
  });

  it.runIf(isDesktop)(
    'plays from the computer keyboard, changes octave, and can be turned off',
    async () => {
      const onNoteOn = vi.fn();
      const onNoteOff = vi.fn();
      render(<PianoKeyboard hasQwertyInput onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
      const toggle = screen.getByRole('switch', { name: 'Play with the computer keyboard' });
      expect(toggle).toBeChecked();
      expect(toggle.getAttribute('aria-describedby')).toBeTruthy();
      expect(
        document.getElementById(toggle.getAttribute('aria-describedby') ?? '')?.textContent,
      ).toContain('keys A to K play C3 to C4');
      await userEvent.keyboard('{a>}{e>}');
      expect(onNoteOn.mock.calls.map(([pitch]) => pitch as number)).toEqual([48, 51]);
      await expect.poll(() => key('C3').getAttribute('aria-pressed')).toBe('true');
      await userEvent.keyboard('{/a}{/e}');
      expect(onNoteOff).toHaveBeenCalledWith(48);
      await userEvent.keyboard('x');
      await expect
        .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
        .toContain('C4 to C5');
      await userEvent.keyboard('k');
      expect(onNoteOn).toHaveBeenLastCalledWith(72, 100);
      await userEvent.click(screen.getByText('Play with the computer keyboard'));
      expect(toggle).not.toBeChecked();
      await expect
        .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
        .toBe('Computer keyboard playing is off.');
      onNoteOn.mockClear();
      await userEvent.keyboard('a');
      expect(onNoteOn).not.toHaveBeenCalled();
    },
  );

  it('connects to a MIDI device on demand, lists it, and lights its notes', async () => {
    const input = new FakeMidiInput();
    const requestMIDIAccess = vi.fn(() => Promise.resolve(new FakeMidiAccess(input)));
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      value: requestMIDIAccess,
      configurable: true,
    });
    vi.spyOn(navigator.permissions, 'query').mockResolvedValue({
      state: 'prompt',
    } as PermissionStatus);
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    const { container } = render(
      <PianoKeyboard midiInput="auto" onNoteOn={onNoteOn} onNoteOff={onNoteOff} />,
    );
    expect(requestMIDIAccess).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Connect MIDI device' }));
    expect(requestMIDIAccess).toHaveBeenCalled();
    expect(await screen.findByText('Observatory Keys: connected')).toBeInTheDocument();
    // A chord from the device lights its keys and raises the callbacks.
    input.send([0x90, 60, 100]);
    input.send([0x91, 64, 90]);
    expect(onNoteOn).toHaveBeenCalledWith(60, 100);
    expect(onNoteOn).toHaveBeenCalledWith(64, 90);
    await expect.poll(() => key('E4').getAttribute('aria-pressed')).toBe('true');
    input.send([0x80, 60, 0]);
    input.send([0x90, 64, 0]);
    expect(onNoteOff).toHaveBeenCalledWith(60);
    expect(onNoteOff).toHaveBeenCalledWith(64);
    await expect.poll(() => key('E4').getAttribute('aria-pressed')).toBe('false');
    await expectNoAxeViolations(container);
  });

  it('says when MIDI isn’t available', async () => {
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: undefined, configurable: true });
    render(<PianoKeyboard midiInput="auto" />);
    expect(await screen.findByText('MIDI isn’t available in this browser.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect MIDI device' })).not.toBeInTheDocument();
  });

  it('scrolls a wide range inside itself on narrow screens', async () => {
    render(
      <div className="w-[320px]">
        <PianoKeyboard range={{ low: 36, high: 84 }} />
      </div>,
    );
    const lower = screen.getByRole('button', { name: 'Show lower keys' });
    const higher = screen.getByRole('button', { name: 'Show higher keys' });
    expect(lower).toBeEnabled();
    expect(higher).toBeEnabled();
    // It opens on middle C.
    const scroller = keyboard().parentElement;
    if (!scroller) {
      throw new Error('No scroller');
    }
    const c4 = key('C4').getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    expect(c4.left).toBeGreaterThanOrEqual(box.left);
    expect(c4.right).toBeLessThanOrEqual(box.right);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    const before = scroller.scrollLeft;
    await userEvent.click(higher);
    await expect.poll(() => scroller.scrollLeft).toBeGreaterThan(before);
  });

  it('draws a vertical keyboard for a piano roll', () => {
    render(
      <div className="h-96">
        <PianoKeyboard orientation="vertical" range={{ low: 60, high: 72 }} />
      </div>,
    );
    const keys = within(keyboard()).getAllByRole('button');
    // Highest first, one row each.
    expect(keys[0]).toHaveAccessibleName('C5');
    expect(keys.at(-1)).toHaveAccessibleName('C4');
    const top = key('C5').getBoundingClientRect();
    const below = key('B4').getBoundingClientRect();
    expect(below.top).toBeCloseTo(top.bottom, 0);
  });

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          pianoKeyboardLabel: 'Klaviatur',
          musicPitchName: ({ letter, octave }: { letter: string; octave: number }) =>
            `${letter === 'B' ? 'H' : letter}${String(octave)}`,
        }}
      >
        <PianoKeyboard range={{ low: 59, high: 60 }} />
      </UIProvider>,
    );
    const group = screen.getByRole('group', { name: 'Klaviatur' });
    expect(within(group).getByRole('button', { name: 'H3' })).toBeInTheDocument();
  });
});
