import { act, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import {
  CHAT_NOW,
  FIRST_UNREAD_ID,
  grace,
  manyMessages,
  observatoryMessages,
  skyGuide,
} from '../../test/chat';
import { MenuItem } from '../components/Menu/Menu';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { MessageList, type MessageListProps } from './MessageList';
import type { ChatMessages } from './messages';
import type { ChatMessage } from './types';

const isDesktop = window.innerWidth >= 1024;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

// React Aria's live announcer also uses `log` regions, so find ours by its `aria-live="off"`.
function getLog() {
  const log = document.querySelector<HTMLElement>('[role="log"][aria-live="off"]');
  if (!log) {
    throw new Error('No log region');
  }
  return log;
}

function messageElement(id: string) {
  return getLog().querySelector<HTMLElement>(`[data-message-id="${id}"]`);
}

/** The message element, which must be rendered. */
function getMessage(id: string) {
  const element = messageElement(id);
  if (!element) {
    throw new Error(`Message ${id} isn't rendered`);
  }
  return element;
}

function renderedMessages() {
  return [...getLog().querySelectorAll<HTMLElement>('[data-chat-row="message"]')];
}

function isAtBottom(element: HTMLElement) {
  return element.scrollHeight - element.clientHeight - element.scrollTop <= 2;
}

function scrollLog(top: number) {
  const log = getLog();
  log.scrollTop = top;
  log.dispatchEvent(new Event('scroll'));
}

function liveText() {
  return document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent ?? '';
}

const baseProps = {
  currentUserId: 'ada',
  now: CHAT_NOW,
  timeZone: 'UTC',
} satisfies Partial<MessageListProps>;

describe('MessageList', () => {
  it('is a named, silent log with day separators, the unread divider and grouped messages', () => {
    render(
      <MessageList
        {...baseProps}
        messages={observatoryMessages()}
        firstUnreadId={FIRST_UNREAD_ID}
        maxHeight="60rem"
      />,
    );
    const log = screen.getByRole('log', { name: 'Messages' });
    expect(log).toHaveAttribute('aria-live', 'off');
    expect(log).toHaveAttribute('tabindex', '0');
    expect(within(log).getByText('Yesterday')).toBeInTheDocument();
    expect(within(log).getByText('Today')).toBeInTheDocument();
    expect(within(log).getByText('New messages')).toBeInTheDocument();
    // A grouped message reads "author, time" before its text, even without the visible header.
    expect(messageElement('m9')?.textContent).toEqual(
      expect.stringContaining('Grace Hopper, 2:42 PM'),
    );
    expect(messageElement('m9')?.querySelector('time')).toBeNull();
    // The first of a group shows the author and time.
    const first = messageElement('m8');
    expect(first?.textContent).toEqual(expect.stringContaining('Grace Hopper'));
    expect(first?.querySelector('time')).toHaveAttribute('dateTime', '2026-10-16T14:40:00.000Z');
    // Markdown bodies render as rich text.
    expect(within(log).getByText('M51').tagName).toBe('STRONG');
    // System messages, edits and replies.
    expect(within(log).getByText('Edwin Hubble joined #dome-a')).toBeInTheDocument();
    expect(messageElement('m7')?.textContent).toEqual(expect.stringContaining('(edited)'));
    expect(messageElement('m7')?.textContent).toEqual(
      expect.stringContaining('In reply to Ada Lovelace:'),
    );
  });

  it('shows the current user’s delivery status and retries a failed message', async () => {
    const onRetry = vi.fn();
    render(
      <MessageList
        {...baseProps}
        messages={observatoryMessages()}
        onRetry={onRetry}
        maxHeight="60rem"
      />,
    );
    const failed = messageElement('m11');
    expect(failed?.textContent).toEqual(expect.stringContaining('Not sent'));
    expect(messageElement('m10')?.textContent).toEqual(expect.stringContaining('Delivered'));
    await userEvent.click(within(getMessage('m11')).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledWith('m11');
  });

  it('keeps only a window of 10,000 messages in the page, opening at the newest', async () => {
    const messages = manyMessages(10_000);
    render(<MessageList {...baseProps} messages={messages} maxHeight="24rem" />);
    const log = getLog();
    await expect.poll(() => isAtBottom(log)).toBe(true);
    expect(renderedMessages().length).toBeLessThan(60);
    await expect.poll(() => messageElement('g9999')).not.toBeNull();
    // Scrolling to the middle renders that window instead.
    scrollLog(log.scrollHeight / 2);
    await expect.poll(() => messageElement('g9999')).toBeNull();
    expect(renderedMessages().length).toBeLessThan(60);
  });

  it('loads older messages at the top and keeps the view in place', async () => {
    const onLoadOlder = vi.fn();
    const recent = manyMessages(150, 300);
    const { rerender } = render(
      <MessageList
        {...baseProps}
        messages={recent}
        hasOlder
        onLoadOlder={onLoadOlder}
        maxHeight="20rem"
      />,
    );
    const log = getLog();
    await expect.poll(() => isAtBottom(log)).toBe(true);
    // Scroll up in steps (as a user would), to near the top.
    scrollLog(log.scrollTop - 300);
    scrollLog(100);
    await expect.poll(() => onLoadOlder).toHaveBeenCalledTimes(1);
    const anchor = renderedMessages().find(
      (row) => row.getBoundingClientRect().top >= log.getBoundingClientRect().top,
    );
    const id = anchor?.querySelector<HTMLElement>('[data-message-id]')?.dataset.messageId;
    expect(id).toBeDefined();
    const before = messageElement(id ?? '')?.getBoundingClientRect().top ?? 0;

    const older = manyMessages(100, 200, recent[0] ? Number(recent[0].at) - 90_000 : CHAT_NOW);
    rerender(
      <MessageList
        {...baseProps}
        messages={[...older, ...recent]}
        hasOlder
        onLoadOlder={onLoadOlder}
        maxHeight="20rem"
      />,
    );
    await expect
      .poll(() => Math.abs((messageElement(id ?? '')?.getBoundingClientRect().top ?? 0) - before))
      .toBeLessThan(3);
    expect(log.scrollTop).toBeGreaterThan(1000);
  });

  it('offers "Load older messages" when the list is short', async () => {
    const onLoadOlder = vi.fn();
    render(
      <MessageList
        {...baseProps}
        messages={manyMessages(2)}
        hasOlder
        onLoadOlder={onLoadOlder}
        className="h-[30rem]"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load older messages' }));
    expect(onLoadOlder).toHaveBeenCalled();
  });

  it('keeps a streaming reply in view without jumping, and doesn’t move a scrolled-up view', async () => {
    const start = manyMessages(60);
    const reply = (body: string, isStreaming = true): ChatMessage => ({
      id: 'bot',
      author: skyGuide,
      at: CHAT_NOW,
      body,
      isStreaming,
    });
    const { rerender } = render(
      <MessageList {...baseProps} messages={[...start, reply('Checking')]} maxHeight="20rem" />,
    );
    const log = getLog();
    await expect.poll(() => isAtBottom(log)).toBe(true);
    const long = 'The temperature dropped four degrees. '.repeat(12);
    rerender(<MessageList {...baseProps} messages={[...start, reply(long)]} maxHeight="20rem" />);
    await expect.poll(() => isAtBottom(log)).toBe(true);

    // Scrolled up to read: growth below leaves the view where it is.
    scrollLog(log.scrollTop - 600);
    await expect
      .poll(() => screen.queryByRole('button', { name: /Jump to latest/ }))
      .not.toBeNull();
    const top = log.scrollTop;
    rerender(
      <MessageList {...baseProps} messages={[...start, reply(long.repeat(2))]} maxHeight="20rem" />,
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(Math.abs(log.scrollTop - top)).toBeLessThan(2);
  });

  it('counts new messages while scrolled up and jumps to the latest', async () => {
    const start = manyMessages(80);
    const { rerender } = render(<MessageList {...baseProps} messages={start} maxHeight="20rem" />);
    const log = getLog();
    await expect.poll(() => isAtBottom(log)).toBe(true);
    scrollLog(log.scrollTop - 500);
    expect(await screen.findByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
    const more: ChatMessage[] = [
      ...start,
      { id: 'n1', author: grace, at: CHAT_NOW + 1000, body: 'Clouds clearing.' },
      { id: 'n2', author: grace, at: CHAT_NOW + 2000, body: 'Dome opening.' },
    ];
    rerender(<MessageList {...baseProps} messages={more} maxHeight="20rem" />);
    await userEvent.click(screen.getByRole('button', { name: 'Jump to latest (2 new)' }));
    await expect.poll(() => isAtBottom(log)).toBe(true);
    expect(screen.queryByRole('button', { name: /Jump to latest/ })).toBeNull();
  });

  it('announces new messages from others (a streaming one once complete), and can be quiet', () => {
    const start = observatoryMessages();
    const { rerender } = render(<MessageList {...baseProps} messages={start} />);
    expect(liveText()).toBe('');
    const fromGrace: ChatMessage = {
      id: 'x1',
      author: grace,
      at: CHAT_NOW,
      body: 'Flats are **done**.',
    };
    rerender(<MessageList {...baseProps} messages={[...start, fromGrace]} />);
    expect(liveText()).toBe('Grace Hopper: Flats are done.');

    const streaming: ChatMessage = {
      id: 'x2',
      author: skyGuide,
      at: CHAT_NOW,
      body: 'Temper',
      isStreaming: true,
    };
    rerender(<MessageList {...baseProps} messages={[...start, fromGrace, streaming]} />);
    expect(liveText()).toBe('Grace Hopper: Flats are done.');
    expect(messageElement('x2')?.querySelector('[aria-busy="true"]')).not.toBeNull();
    rerender(
      <MessageList
        {...baseProps}
        messages={[
          ...start,
          fromGrace,
          { ...streaming, body: 'Temperature fell.', isStreaming: false },
        ]}
      />,
    );
    expect(liveText()).toBe('SkyGuide: Temperature fell.');

    // The current user's own messages aren't announced, and shouldAnnounce turns it off.
    const quiet = [...start, fromGrace, { ...streaming, isStreaming: false }];
    rerender(
      <MessageList
        {...baseProps}
        shouldAnnounce={false}
        messages={[...quiet, { id: 'x3', author: grace, at: CHAT_NOW, body: 'Quiet' }]}
      />,
    );
    expect(liveText()).toBe('SkyGuide: Temperature fell.');
  });

  it.skipIf(!isDesktop)(
    'moves between messages with the arrow keys and reaches their actions',
    async () => {
      const onReply = vi.fn();
      const onAction = vi.fn();
      render(
        <MessageList
          {...baseProps}
          messages={observatoryMessages()}
          onReply={onReply}
          onReact={vi.fn()}
          messageActions={(message) => (
            <MenuItem
              onAction={() => {
                onAction(message.id);
              }}
            >
              Copy link
            </MenuItem>
          )}
          maxHeight="40rem"
        />,
      );
      const log = getLog();
      act(() => {
        log.focus();
      });
      await userEvent.keyboard('{ArrowUp}');
      await expect.poll(() => document.activeElement).toBe(messageElement('m11'));
      await userEvent.keyboard('{ArrowUp}');
      await expect.poll(() => document.activeElement).toBe(messageElement('m10'));
      const m10 = getMessage('m10');
      // The focused message shows its toolbar: add reaction, reply, more actions.
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(
        within(m10).getByRole('button', { name: 'Add reaction' }),
      );
      await userEvent.keyboard('{Tab}{Enter}');
      expect(onReply).toHaveBeenCalledWith('m10');
      await userEvent.click(within(m10).getByRole('button', { name: 'Message actions' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Copy link' }));
      expect(onAction).toHaveBeenCalledWith('m10');
      // Home goes to the first message; Escape returns to the log.
      act(() => {
        messageElement('m10')?.focus();
      });
      await userEvent.keyboard('{Home}');
      await expect.poll(() => document.activeElement).toBe(messageElement('m1'));
      await userEvent.keyboard('{Escape}');
      expect(document.activeElement).toBe(log);
    },
  );

  it.skipIf(!isDesktop)('jumps from a reply’s quote to the quoted message', async () => {
    render(<MessageList {...baseProps} messages={observatoryMessages()} maxHeight="40rem" />);
    const quote = within(getMessage('m7')).getByRole('button', {
      name: /In reply to Ada Lovelace/,
    });
    await userEvent.click(quote);
    await expect.poll(() => document.activeElement).toBe(messageElement('m5'));
  });

  it('toggles reactions through onReact', async () => {
    const onReact = vi.fn();
    render(
      <MessageList
        {...baseProps}
        messages={observatoryMessages()}
        onReact={onReact}
        maxHeight="60rem"
      />,
    );
    const m3 = getMessage('m3');
    const thumbs = within(m3).getByRole('button', { name: '👍: 2 reactions' });
    expect(thumbs).toHaveAttribute('aria-pressed', 'true');
    if (isTouch) {
      thumbs.setAttribute('data-testid', 'thumbs');
      await commands.tap('[data-testid="thumbs"]');
    } else {
      await userEvent.click(thumbs);
    }
    expect(onReact).toHaveBeenCalledWith('m3', '👍');
  });

  it.skipIf(!isTouch)('shows a message’s actions when it’s tapped', async () => {
    render(
      <MessageList
        {...baseProps}
        messages={observatoryMessages()}
        onReply={vi.fn()}
        maxHeight="60rem"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
    await commands.tap('[data-message-id="m8"]');
    await expect
      .poll(() => within(getMessage('m8')).queryByRole('button', { name: 'Reply' }))
      .not.toBeNull();
  });

  it('shows who is typing', () => {
    const { rerender } = render(
      <MessageList {...baseProps} messages={[]} typing={[{ id: 'grace', name: 'Grace Hopper' }]} />,
    );
    expect(screen.getByRole('status').textContent).toBe('Grace Hopper is typing…');
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    rerender(
      <MessageList
        {...baseProps}
        messages={[]}
        typing={[
          { id: 'grace', name: 'Grace Hopper' },
          { id: 'edwin', name: 'Edwin Hubble' },
        ]}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe(
      'Grace Hopper and Edwin Hubble are typing…',
    );
  });

  it('has no axe violations and doesn’t scroll the page sideways', async () => {
    function Chat() {
      const [messages] = useState(observatoryMessages);
      return (
        <div className="p-2">
          <MessageList
            {...baseProps}
            messages={messages}
            firstUnreadId={FIRST_UNREAD_ID}
            onReact={vi.fn()}
            onReply={vi.fn()}
            onRetry={vi.fn()}
            typing={[{ id: 'grace', name: 'Grace Hopper' }]}
            maxHeight="60rem"
          />
        </div>
      );
    }
    const { container } = render(<Chat />);
    await expectNoAxeViolations(container);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes its strings from UIProvider', () => {
    const overrides: Partial<ChatMessages> = {
      chatLogLabel: 'Fil de discussion',
      chatToday: 'Aujourd’hui',
    };
    render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <MessageList {...baseProps} messages={observatoryMessages()} maxHeight="60rem" />
      </UIProvider>,
    );
    expect(screen.getByRole('log', { name: 'Fil de discussion' })).toBeInTheDocument();
    expect(screen.getByText('Aujourd’hui')).toBeInTheDocument();
  });
});
