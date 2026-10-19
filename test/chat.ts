// An observatory team's chat for the `/chat` stories and tests: Ada, Grace and Edwin, and SkyGuide, an assistant
// whose reply streams in. Everything is deterministic and made in code (a canvas PNG, a CSV as a data URL).
import type { ChatCommand, ChatMention, ChatMessage } from '../src/chat';
import { people } from './people';

/** The instant the chat stories and tests treat as "now": Oct 16, 2026, 3:00 PM UTC. */
export const CHAT_NOW = Date.UTC(2026, 9, 16, 15, 0, 0);

const MINUTE = 60_000;
const at = (minutesBeforeNow: number) => CHAT_NOW - minutesBeforeNow * MINUTE;

export const ada = { id: 'ada', name: 'Ada Lovelace', avatarSrc: people[0].src };
export const grace = { id: 'grace', name: 'Grace Hopper' };
export const edwin = { id: 'edwin', name: 'Edwin Hubble', avatarSrc: people[2].src };
export const skyGuide = { id: 'skyguide', name: 'SkyGuide' };
export const system = { id: 'system', name: 'Observatory' };

/** A small night-sky PNG (drawn on a canvas) as a data URL. */
export function skyImageUrl(width = 240, height = 150): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0b1d3a');
  sky.addColorStop(1, '#2b4a78');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#f2d39b';
  context.beginPath();
  context.arc(width * 0.62, height * 0.45, height * 0.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffffff';
  for (let star = 0; star < 30; star += 1) {
    context.fillRect((star * 47) % width, (star * 31) % height, 1.5, 1.5);
  }
  return canvas.toDataURL('image/png');
}

/** A screenshot-like PNG File, as pasting one would give. */
export async function screenshotFile(name = 'guider-screenshot.png'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 40;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#123456';
    context.fillRect(0, 0, 64, 40);
    context.fillStyle = '#f2c14e';
    context.fillRect(28, 16, 8, 8);
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  return new File([blob ?? new Blob()], name, { type: 'image/png' });
}

const seeingCsv = 'time,seeing_arcsec\n21:00,1.4\n22:00,1.1\n23:00,0.9\n';

/** The team's chat over yesterday and today: groups, a reply, reactions, statuses, a system notice, attachments. */
export function observatoryMessages(): ChatMessage[] {
  return [
    {
      id: 'm1',
      author: system,
      at: at(26 * 60),
      body: 'Edwin Hubble joined #dome-a',
      isSystem: true,
    },
    {
      id: 'm2',
      author: edwin,
      at: at(25 * 60 + 50),
      body: 'Evening all. Dome A is open and the mirror is at ambient.',
    },
    {
      id: 'm3',
      author: grace,
      at: at(25 * 60 + 47),
      body: 'Great. I queued the **M51** mosaic for after midnight.',
      reactions: [{ emoji: '👍', count: 2, isMine: true, names: ['Ada Lovelace', 'Edwin Hubble'] }],
    },
    {
      id: 'm4',
      author: grace,
      at: at(25 * 60 + 46),
      body: 'Seeing log from the last run, for reference:',
      attachments: [
        {
          name: 'seeing-log.csv',
          url: `data:text/csv,${encodeURIComponent(seeingCsv)}`,
          type: 'text/csv',
          size: seeingCsv.length,
        },
      ],
    },
    {
      id: 'm5',
      author: ada,
      at: at(95),
      body: 'Morning! Focus drifted around 3 AM; I think the temperature dropped faster than forecast.',
      status: 'read',
    },
    {
      id: 'm6',
      author: ada,
      at: at(94),
      body: 'Here’s the last frame before the drift:',
      attachments: [
        { name: 'frame-0412.png', url: skyImageUrl(), type: 'image/png', size: 48_213 },
      ],
      status: 'read',
    },
    {
      id: 'm7',
      author: edwin,
      at: at(60),
      body: 'Could be the secondary. Try an autofocus run every `30 min` tonight:\n\n1. Enable temperature compensation\n2. Refocus after each filter change',
      replyTo: {
        id: 'm5',
        author: 'Ada Lovelace',
        excerpt: 'Focus drifted around 3 AM; I think the temperature dropped faster than forecast.',
      },
      reactions: [
        { emoji: '🔭', count: 1, isMine: false, names: ['Grace Hopper'] },
        {
          emoji: '❤️',
          count: 3,
          isMine: false,
          names: ['Grace Hopper', 'Edwin Hubble', 'SkyGuide'],
        },
      ],
      isEdited: true,
    },
    {
      id: 'm8',
      author: grace,
      at: at(20),
      body: 'Weather update: clouds clear by 22:00, humidity under 70%.',
    },
    {
      id: 'm9',
      author: grace,
      at: at(18),
      body: 'So we should get a full night on M51.',
    },
    {
      id: 'm10',
      author: ada,
      at: at(6),
      body: 'Perfect, I’ll prep the flats.',
      status: 'delivered',
    },
    {
      id: 'm11',
      author: ada,
      at: at(5),
      body: 'And the darks at -10 °C.',
      status: 'failed',
    },
  ];
}

/** The first unread message in `observatoryMessages()`. */
export const FIRST_UNREAD_ID = 'm8';

const chatter = [
  'Guiding RMS is down to 0.6″.',
  'Switching to the H-alpha filter.',
  'Clouds on the western horizon, keep an eye on it.',
  'Frame 120 of 180 done.',
  'Dew heater on the finder is set to 40%.',
  'Seeing improved after the wind dropped.',
  'Can someone check the dome slit alignment?',
  'Flats look even across the field.',
];
const team = [ada, grace, edwin];

/** `count` generated messages, one every 90 seconds, ending at `end` (ids `g{start}…`). */
export function manyMessages(count: number, start = 0, end = CHAT_NOW): ChatMessage[] {
  return Array.from({ length: count }, (_, offset) => {
    const index = start + offset;
    // Authors change every few messages, so groups form.
    const author = team[Math.floor(index / 3) % team.length] ?? ada;
    return {
      id: `g${String(index)}`,
      author,
      at: end - (start + count - 1 - index) * 90_000,
      body: `${chatter[index % chatter.length] ?? ''} (#${String(index + 1)})`,
    };
  });
}

/** The people the Composer can mention. */
export const mentionPeople: ChatMention[] = [
  { id: 'ada', label: 'Ada', avatarSrc: people[0].src },
  { id: 'grace', label: 'Grace' },
  { id: 'edwin', label: 'Edwin', avatarSrc: people[2].src },
  { id: 'skyguide', label: 'SkyGuide' },
];

/** Finds people whose name contains the query, as an app's search would (resolves on the next tick). */
export function loadMentions(query: string, signal: AbortSignal): Promise<readonly ChatMention[]> {
  return new Promise((resolve, reject) => {
    queueMicrotask(() => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const lower = query.toLowerCase();
      resolve(mentionPeople.filter((person) => person.label.toLowerCase().includes(lower)));
    });
  });
}

export const chatCommands: ChatCommand[] = [
  { id: 'weather', label: 'weather', description: 'Post the latest weather report' },
  { id: 'schedule', label: 'schedule', description: 'Show tonight’s observing schedule' },
  { id: 'poll', label: 'poll', description: 'Ask the team a question' },
];

/** SkyGuide's reply, streamed a few words at a time. */
export const skyGuideReply =
  'Temperature dropped **4 °C** between 02:00 and 03:30, which matches the focus drift. I suggest:\n\n- Autofocus every 30 minutes\n- Temperature compensation at 18 µm/°C';
