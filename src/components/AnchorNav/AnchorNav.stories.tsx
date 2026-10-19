import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { Markdown } from '../../markdown/Markdown';
import { Prose } from '../Prose';
import { AnchorNav, type AnchorNavItem } from './AnchorNav';

/** The sections of a deployment guide, as AnchorNav items. */
const GUIDE: AnchorNavItem[] = [
  { id: 'overview', label: 'Overview' },
  {
    id: 'requirements',
    label: 'Requirements',
    children: [
      { id: 'hardware', label: 'Hardware' },
      { id: 'network', label: 'Network access' },
    ],
  },
  {
    id: 'install',
    label: 'Installation',
    children: [
      { id: 'install-linux', label: 'Linux' },
      { id: 'install-docker', label: 'Docker' },
    ],
  },
  { id: 'configure', label: 'Configuration' },
  { id: 'upgrade', label: 'Upgrading' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
];

const TEXT: Record<string, string[]> = {
  overview: [
    'The edge gateway collects readings from meters on a site and forwards them to the platform. It buffers up to a week of readings when the uplink is down, and sends them in order once it returns.',
    'This guide covers a single gateway. For a fleet, use the rollout tools to stage the same configuration on every site.',
  ],
  requirements: ['Check the hardware and the network before you start.'],
  hardware: [
    'Any 64-bit machine with two cores, 2 GB of memory and 16 GB of disk will do. Industrial PCs without fans are a good fit for plant rooms.',
  ],
  network: [
    'The gateway needs outbound HTTPS to the platform, and Modbus TCP or MQTT to the meters. It never accepts inbound connections from the internet.',
  ],
  install: ['Install the gateway as a system service, or run it as a container.'],
  'install-linux': [
    'Download the package for your distribution, install it with the package manager, then enable and start the gateway service. It starts again after a reboot.',
  ],
  'install-docker': [
    'Run the published image with the configuration directory mounted as a volume, and restart it unless it was stopped by hand.',
  ],
  configure: [
    'The configuration file lists the meters, how often to read them, and where to send the readings. Changes take effect when the service reloads; nothing is lost while it does.',
    'Keep secrets such as the platform token in the system keychain rather than the file.',
  ],
  upgrade: [
    'Upgrades are in place: install the new package or pull the new image. The gateway finishes sending its buffer before it restarts.',
  ],
  troubleshoot: [
    'If readings stop, check the service log first. Most problems are a meter that changed its address, or a firewall that started blocking the uplink.',
    'The status page on the gateway shows each meter, its last reading and any errors, and is reachable from the site network only.',
  ],
};

/** The guide as Prose, with an id on each section heading. */
function GuideArticle({ items = GUIDE }: { items?: readonly AnchorNavItem[] }) {
  const sections = (list: readonly AnchorNavItem[], level: 2 | 3) =>
    list.map((item) => {
      const Heading = `h${String(level)}` as 'h2';
      return (
        <section key={item.id}>
          <Heading id={item.id}>{item.label}</Heading>
          {TEXT[item.id]?.map((text) => (
            <p key={text}>{text}</p>
          ))}
          {item.children && sections(item.children, 3)}
        </section>
      );
    });
  return <Prose>{sections(items, 2)}</Prose>;
}

const GUIDE_MARKDOWN = `
# Release notes

Version 4.2 of the gateway reads more meters, starts faster and is easier to run in a container.

# What's new

## Faster start-up

The gateway starts reading meters before it has reached the platform, and catches up from its buffer once it has.

## More meter protocols

Besides Modbus TCP and MQTT, the gateway now reads meters over BACnet/IP and M-Bus. Choose the protocol per meter in
the configuration file.

## Container images

The image is half the size, runs as an unprivileged user, and has a health check the container runtime can use.

# Changes

The \`poll_interval\` setting is now \`read_every\`, and takes a duration such as \`30s\`. The old name still works and
logs a warning.

# Fixed

- Readings sent twice after the uplink came back during a reload.
- The status page showing the wrong time zone for meters on another site.

# Upgrading

Install the new package, or pull the new image. The gateway finishes sending its buffer before it restarts, so no
readings are lost.
`;

const meta = {
  title: 'Display/AnchorNav',
  component: AnchorNav,
  args: { items: GUIDE },
  render: (args) => (
    <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
      <AnchorNav {...args} />
      <GuideArticle />
    </div>
  ),
} satisfies Meta<typeof AnchorNav>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A sticky sidebar beside the page's content, with nested levels. The section being read is marked as the page
 * scrolls; choosing a link scrolls to it and moves focus there. On phones it's a menu button above the content.
 */
export const Sidebar: Story = {};

/** A bar of jump links (the top level only) that sticks to the top of the page, above the content. */
export const JumpLinks: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <div className="flex flex-col gap-6">
      <AnchorNav {...args} />
      <GuideArticle />
    </div>
  ),
};

/**
 * Links gathered from the headings of a Markdown document through `contentRef`: no `items`. Headings nest by level
 * and get ids from their text, so the links follow the document as it changes.
 */
export const MarkdownDocument: Story = {
  render: function Render(args) {
    const contentRef = useRef<HTMLDivElement>(null);
    return (
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <AnchorNav {...args} items={undefined} contentRef={contentRef} />
        <Markdown ref={contentRef}>{GUIDE_MARKDOWN}</Markdown>
      </div>
    );
  },
};

/** Following a scroll container (`scrollRef`) rather than the page. */
export const InScrollContainer: Story = {
  render: function Render(args) {
    const scrollRef = useRef<HTMLDivElement>(null);
    return (
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <AnchorNav {...args} scrollRef={scrollRef} />
        <div
          ref={scrollRef}
          // A scroll box takes focus so keyboard users can scroll it.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          role="region"
          aria-label="Deployment guide"
          className="h-96 overflow-y-auto rounded-card border border-border p-4"
        >
          <GuideArticle />
        </div>
      </div>
    );
  },
};

/**
 * Under a sticky app header: `scrollOffset` is the header's height, so sections scroll to below it, count as read
 * only below it, and the nav sticks below it.
 */
export const UnderStickyHeader: Story = {
  args: { scrollOffset: 56, shouldUpdateHash: true },
  tags: ['!visual'],
  render: (args) => (
    <div className="flex flex-col gap-6">
      <header className="sticky top-0 z-sticky flex h-14 items-center border-b border-border bg-surface-2 px-4 font-semibold">
        Edge gateway
      </header>
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <AnchorNav {...args} />
        <GuideArticle />
      </div>
    </div>
  ),
};

/** The current section, controlled: the app keeps it in state and can show it elsewhere. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function Render(args) {
    const [currentId, setCurrentId] = useState<string | null>('install');
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-muted">Reading: {currentId ?? 'nothing yet'}</p>
        <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
          <AnchorNav {...args} currentId={currentId} onCurrentIdChange={setCurrentId} />
          <GuideArticle />
        </div>
      </div>
    );
  },
};
