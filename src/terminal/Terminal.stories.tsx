import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { ansiSample, createEchoShell, jobLog, shellGreeting } from '../../test/terminal';
import { Terminal, type TerminalConnectionStatus, type TerminalHandle } from './Terminal';

const meta = {
  title: 'Terminal/Terminal',
  component: Terminal,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Terminal>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A terminal wired to a fake echo shell (it stands in for a socket): what's typed comes back. */
function EchoTerminal({ status }: { status?: TerminalConnectionStatus }) {
  const handle = useRef<TerminalHandle>(null);
  const [connection, setConnection] = useState<TerminalConnectionStatus>(status ?? 'open');
  const shell = useRef<((data: string) => void) | null>(null);
  useEffect(() => {
    handle.current?.write(shellGreeting);
  }, []);
  return (
    <Terminal
      title="ada@observatory"
      handleRef={handle}
      onData={(data) => {
        shell.current ??= createEchoShell((reply) => {
          handle.current?.write(reply);
        });
        shell.current(data);
      }}
      connection={
        status === undefined
          ? undefined
          : {
              status: connection,
              onReconnect: () => {
                setConnection('open');
              },
            }
      }
    />
  );
}

/**
 * An interactive shell: type a command and press Enter. Text is copied when selected, pasting several lines asks
 * first, and the hint below says how to leave (Ctrl+Shift+Esc), since Tab stays in the terminal.
 */
export const Shell: Story = {
  tags: ['!visual'],
  render: () => <EchoTerminal status="open" />,
};

/** The connection's status in the header. When it drops, input pauses and Reconnect appears. */
export const Disconnected: Story = {
  tags: ['!visual'],
  render: () => <EchoTerminal status="closed" />,
};

/** While connecting, input waits. */
export const Connecting: Story = {
  tags: ['!visual'],
  render: () => <EchoTerminal status="connecting" />,
};

function OutputTerminal({ output, title }: { output: string; title: string }) {
  const handle = useRef<TerminalHandle>(null);
  useEffect(() => {
    handle.current?.write(output);
  }, [output]);
  return <Terminal title={title} handleRef={handle} height="14rem" />;
}

/** Read-only output (no `onData`): a job's log. Tab moves past it as usual, and search finds lines. */
export const ReadOnly: Story = {
  tags: ['!visual'],
  render: () => <OutputTerminal title="Jupiter imaging job" output={jobLog} />,
};

/**
 * The 16 ANSI colours, mapped from the theme's tokens so each reads on the terminal background in light, dark and
 * high contrast. Switch the theme to see them change live.
 */
export const AnsiColours: Story = {
  name: 'ANSI colours',
  tags: ['!visual'],
  render: () => <OutputTerminal title="Colours" output={ansiSample} />,
};
