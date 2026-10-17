import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { logLine, logLines, nightLog } from '../../test/logs';
import type { LogLine } from './format';
import { LogViewer } from './LogViewer';

const meta = {
  title: 'Logs/LogViewer',
  component: LogViewer,
  args: { lines: nightLog, timeZone: 'UTC', 'aria-label': 'Night run log' },
} satisfies Meta<typeof LogViewer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A night's observing run: level badges, sources, ANSI colours as theme colours, and a line without a level. */
export const NightRun: Story = {};

/** Structured fields expand into a description list. */
export const ExpandedFields: Story = {
  args: { defaultExpandedIds: ['n7'] },
};

/** A text search highlights every match (ignoring case); Enter and Shift+Enter step through them. */
export const Search: Story = {
  args: { defaultSearch: 'exposure' },
};

/** A `/regex/` search, with flags. */
export const RegexSearch: Story = {
  args: { defaultSearch: '/shutter|mount fault/i' },
};

/** An invalid regular expression is flagged. */
export const InvalidPattern: Story = {
  args: { defaultSearch: '/(unclosed/' },
};

/** Only warnings and worse; lines without a level still show. */
export const LevelFilter: Story = {
  args: { defaultLevels: ['warn', 'error', 'fatal'] },
};

/** Long lines wrap instead of scrolling sideways (rows are measured). */
export const Wrapped: Story = {
  args: { defaultWrap: true },
};

/** Following paused: "Jump to latest" returns to the newest line and resumes. */
export const Paused: Story = {
  args: { lines: logLines(200), defaultFollowing: false, maxHeight: '16rem' },
};

const hundredThousand = logLines(100_000);

/** 100,000 lines: only the visible window is in the page. */
export const HundredThousandLines: Story = {
  name: '100k lines',
  args: { lines: hundredThousand, maxHeight: '28rem' },
};

/** No lines yet. */
export const Empty: Story = {
  args: { lines: [] },
};

/** Without the toolbar, as a compact output panel. */
export const NoToolbar: Story = {
  args: { hasToolbar: false, maxHeight: '12rem' },
};

/** 50 lines a second, capped at 20,000 lines. Scroll up to pause; the button counts what arrived since. */
export const Streaming: Story = {
  tags: ['!visual'],
  render: function StreamingStory(args) {
    const [lines, setLines] = useState<LogLine[]>(() => logLines(500));
    useEffect(() => {
      let next = 500;
      const handle = setInterval(() => {
        const batch = Array.from({ length: 5 }, () => {
          next += 1;
          return logLine(next);
        });
        setLines((current) => {
          const combined = current.concat(batch);
          return combined.length > 20_000 ? combined.slice(combined.length - 20_000) : combined;
        });
      }, 100);
      return () => {
        clearInterval(handle);
      };
    }, []);
    return <LogViewer {...args} lines={lines} maxHeight="28rem" />;
  },
};

/** Scrolling to the top loads 200 older lines at a time, keeping the view in place. */
export const LoadOlder: Story = {
  tags: ['!visual'],
  render: function LoadOlderStory(args) {
    const [lines, setLines] = useState<LogLine[]>(() => logLines(200, 2000));
    const [isLoading, setLoading] = useState(false);
    const loadOlder = () => {
      const first = Number(lines[0]?.id.replace('line-', '') ?? 0);
      if (first <= 0) {
        return;
      }
      setLoading(true);
      setTimeout(() => {
        setLines((current) => [
          ...logLines(Math.min(200, first), Math.max(0, first - 200)),
          ...current,
        ]);
        setLoading(false);
      }, 600);
    };
    return (
      <LogViewer
        {...args}
        lines={lines}
        onLoadOlder={loadOlder}
        isLoadingOlder={isLoading}
        maxHeight="20rem"
      />
    );
  },
};

/** Timestamps in another time zone, with the date. */
export const TimeZone: Story = {
  args: {
    timeZone: 'Pacific/Honolulu',
    timeFormat: {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  },
};
