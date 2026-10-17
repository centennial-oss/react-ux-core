// useMidiInput: listens to MIDI input devices through the Web MIDI API and reports their notes. Access is asked for on
// demand: if the browser already granted it the hook connects straight away, otherwise `connect()` (from a button
// press) asks. Browsers without Web MIDI report `unsupported`, so callers can hide the feature instead of failing.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Where MIDI access stands. `idle` means access hasn't been asked for yet (call `connect`). */
export type MidiStatus = 'unsupported' | 'idle' | 'connecting' | 'ready' | 'denied';

/** A MIDI input device. */
export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  isConnected: boolean;
}

export interface UseMidiInputOptions {
  /** `auto` listens to every input, another string to the input with that id or name, and null to none (no access asked). */
  input: string | null;
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

export interface MidiInputState {
  status: MidiStatus;
  /** Every MIDI input the browser knows about, with whether it's connected. */
  devices: readonly MidiDevice[];
  /** The notes held on the listened-to inputs right now. */
  heldNotes: readonly number[];
  /** Asks for MIDI access (call it from a user action). */
  connect: () => void;
}

const EMPTY: readonly number[] = [];

/** Whether this browser has the Web MIDI API. */
export function isMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
}

function listDevices(access: MIDIAccess): MidiDevice[] {
  return [...access.inputs.values()].map((input) => ({
    id: input.id,
    name: input.name ?? input.id,
    manufacturer: input.manufacturer ?? '',
    isConnected: input.state === 'connected',
  }));
}

/** Listens to MIDI note messages from one input or all of them. */
export function useMidiInput({ input, onNoteOn, onNoteOff }: UseMidiInputOptions): MidiInputState {
  const isEnabled = input !== null;
  const [status, setStatus] = useState<MidiStatus>(() =>
    isMidiSupported() ? 'idle' : 'unsupported',
  );
  const [access, setAccess] = useState<MIDIAccess | null>(null);
  const [devices, setDevices] = useState<readonly MidiDevice[]>([]);
  const [heldNotes, setHeldNotes] = useState<readonly number[]>(EMPTY);
  const callbacks = useRef({ onNoteOn, onNoteOff });
  useLayoutEffect(() => {
    callbacks.current = { onNoteOn, onNoteOff };
  });
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const connect = useCallback(() => {
    if (!isMidiSupported()) {
      setStatus('unsupported');
      return;
    }
    setStatus('connecting');
    navigator.requestMIDIAccess({ sysex: false }).then(
      (granted) => {
        if (isMounted.current) {
          setAccess(granted);
          setStatus('ready');
        }
      },
      () => {
        if (isMounted.current) {
          setStatus('denied');
        }
      },
    );
  }, []);

  // When access was already granted (or blocked) for this site, there's nothing to ask: connect or report it.
  useEffect(() => {
    if (!isEnabled || access || !isMidiSupported()) {
      return;
    }
    let isCurrent = true;
    // Older browsers have no Permissions API (the types say it's always there).
    const permissions = 'permissions' in navigator ? navigator.permissions : null;
    permissions
      ?.query({ name: 'midi' })
      .then((result) => {
        if (!isCurrent) {
          return;
        }
        if (result.state === 'granted') {
          connect();
        } else if (result.state === 'denied') {
          setStatus('denied');
        }
      })
      .catch(() => {
        // The browser can't say; the connect button asks.
      });
    return () => {
      isCurrent = false;
    };
  }, [isEnabled, access, connect]);

  // Listen to the chosen inputs, and follow devices coming and going.
  useEffect(() => {
    if (!access || !isEnabled) {
      return;
    }
    const held = new Set<number>();
    const listened = new Set<MIDIInput>();
    const onMessage = (event: Event) => {
      const data = (event as MIDIMessageEvent).data;
      if (!data || data.length < 3) {
        return;
      }
      const command = (data[0] ?? 0) & 0xf0;
      const pitch = data[1] ?? 0;
      const velocity = data[2] ?? 0;
      if (command === 0x90 && velocity > 0) {
        held.add(pitch);
        callbacks.current.onNoteOn?.(pitch, velocity);
      } else if (command === 0x80 || command === 0x90) {
        held.delete(pitch);
        callbacks.current.onNoteOff?.(pitch);
      } else {
        return;
      }
      setHeldNotes([...held].sort((a, b) => a - b));
    };
    const attach = () => {
      setDevices(listDevices(access));
      for (const device of access.inputs.values()) {
        const isChosen = input === 'auto' || device.id === input || device.name === input;
        if (isChosen && !listened.has(device)) {
          device.addEventListener('midimessage', onMessage);
          listened.add(device);
        } else if (!isChosen && listened.has(device)) {
          device.removeEventListener('midimessage', onMessage);
          listened.delete(device);
        }
      }
    };
    attach();
    access.addEventListener('statechange', attach);
    return () => {
      access.removeEventListener('statechange', attach);
      for (const device of listened) {
        device.removeEventListener('midimessage', onMessage);
      }
      setHeldNotes(EMPTY);
    };
  }, [access, input, isEnabled]);

  return { status, devices, heldNotes, connect };
}
