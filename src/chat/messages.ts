// English defaults of the chat entry point's strings. They also use the core strings (`retry`, `remove`, `loading`…).
import { useEntryMessages } from '../provider/context';
import type { CoreMessages } from '../provider/messages';

/** Strings for MessageList, Composer, EmojiPicker and ReactionBar. */
export interface ChatMessages {
  // MessageList
  /** The message log's default accessible name. */
  chatLogLabel: string;
  /** Read with the log: how to move between messages. */
  chatNavigationHint: string;
  /** Shown when there are no messages. */
  chatEmpty: string;
  /** Day separators for today and yesterday (other days show the date). */
  chatToday: string;
  chatYesterday: string;
  /** The divider above the first unread message. */
  chatNewMessages: string;
  /** The button shown when scrolled up. `count` is the number of messages from others that arrived since. */
  chatJumpToLatest: (params: { count: number }) => string;
  /** The button at the top that loads older messages (they also load when scrolled to the top). */
  chatLoadOlder: string;
  chatLoadingOlder: string;
  /** Read before a grouped message (whose name and time aren't shown): "Ada Lovelace, 10:42 AM". */
  chatMessageMeta: (params: { author: string; time: string }) => string;
  /** Marks an edited message. */
  chatEdited: string;
  /** Read before a reply's quote. */
  chatInReplyTo: (params: { author: string }) => string;
  /** Delivery status of the current user's messages. */
  chatStatusSending: string;
  chatStatusSent: string;
  chatStatusDelivered: string;
  chatStatusRead: string;
  chatStatusFailed: string;
  /** Message actions. */
  chatReply: string;
  chatAddReaction: string;
  chatMessageActions: string;
  /** Names a message's list of attachments. */
  chatAttachments: string;
  /** Announces a new message from someone else (`text` may be empty for a custom body). */
  chatAnnounceMessage: (params: { author: string; text: string }) => string;
  /** Announces several messages that arrived together, with the latest. */
  chatAnnounceMessages: (params: { count: number; author: string; text: string }) => string;
  /** The typing indicator. `names` is already joined ("Ada and Grace"). */
  chatTyping: (params: { names: string; count: number }) => string;
  /** Stands for the current user in a reaction's list of names. */
  chatYou: string;
  // ReactionBar
  /** Names the group of reactions. */
  reactionsLabel: string;
  /** A reaction button's name. `name` is the emoji's name (or the emoji). */
  reactionLabel: (params: { name: string; count: number }) => string;
  /** Who reacted, in the tooltip and the button's description. `names` is already joined. */
  reactionNames: (params: { names: string }) => string;
  /** Announced after toggling a reaction. */
  reactionAdded: (params: { name: string; count: number }) => string;
  reactionRemoved: (params: { name: string; count: number }) => string;
  // EmojiPicker
  /** The picker's accessible name (and its popover's). */
  emojiPicker: string;
  /** The emoji button in the Composer. */
  emojiButton: string;
  emojiSearch: string;
  emojiNoResults: string;
  /** Announced as search results change. */
  emojiResultCount: (params: { count: number }) => string;
  emojiSearchResults: string;
  /** Names the category buttons. */
  emojiCategories: string;
  emojiRecent: string;
  emojiGroupSmileys: string;
  emojiGroupPeople: string;
  emojiGroupAnimals: string;
  emojiGroupFood: string;
  emojiGroupTravel: string;
  emojiGroupActivities: string;
  emojiGroupObjects: string;
  emojiGroupSymbols: string;
  emojiGroupFlags: string;
  emojiSkinTone: string;
  emojiSkinTone1: string;
  emojiSkinTone2: string;
  emojiSkinTone3: string;
  emojiSkinTone4: string;
  emojiSkinTone5: string;
  emojiSkinTone6: string;
  emojiLoading: string;
  emojiLoadFailed: string;
  // Composer
  /** The message box's default accessible name. */
  composerLabel: string;
  composerPlaceholder: string;
  composerSend: string;
  composerAttach: string;
  /** Names the list of files to send. */
  composerAttachments: string;
  /** The context bar for a reply, and its cancel button. */
  composerReplyingTo: (params: { author: string }) => string;
  composerCancelReply: string;
  /** Announced when files are attached (chosen, dropped or pasted). */
  composerAttached: (params: { count: number }) => string;
  /** Names the suggestion lists. */
  composerMentionSuggestions: string;
  composerCommandSuggestions: string;
  /** Announced while suggestions show. */
  composerSuggestionCount: (params: { count: number }) => string;
  /** Shown when sending fails; the text stays. */
  composerSendFailed: string;
  /** The drop target's name while files are dragged over the composer. */
  composerDropFiles: string;
  /** The shortcuts help. */
  composerShortcuts: string;
  composerShortcutSend: string;
  composerShortcutNewLine: string;
  composerShortcutMention: string;
  composerShortcutCommand: string;
  composerShortcutClose: string;
  /** Key names in the shortcuts help. */
  keyEnter: string;
  keyShift: string;
  /** The platform's command key: ⌘ on Apple devices, Ctrl elsewhere. */
  keyModApple: string;
  keyModOther: string;
  keyEscape: string;
}

export const defaultChatMessages: ChatMessages = {
  chatLogLabel: 'Messages',
  chatNavigationHint: 'Up and down arrows move between messages.',
  chatEmpty: 'No messages yet',
  chatToday: 'Today',
  chatYesterday: 'Yesterday',
  chatNewMessages: 'New messages',
  chatJumpToLatest: ({ count }) =>
    count === 0 ? 'Jump to latest' : `Jump to latest (${String(count)} new)`,
  chatLoadOlder: 'Load older messages',
  chatLoadingOlder: 'Loading older messages…',
  chatMessageMeta: ({ author, time }) => `${author}, ${time}`,
  chatEdited: '(edited)',
  chatInReplyTo: ({ author }) => `In reply to ${author}:`,
  chatStatusSending: 'Sending…',
  chatStatusSent: 'Sent',
  chatStatusDelivered: 'Delivered',
  chatStatusRead: 'Read',
  chatStatusFailed: 'Not sent',
  chatReply: 'Reply',
  chatAddReaction: 'Add reaction',
  chatMessageActions: 'Message actions',
  chatAttachments: 'Attachments',
  chatAnnounceMessage: ({ author, text }) =>
    text === '' ? `New message from ${author}` : `${author}: ${text}`,
  chatAnnounceMessages: ({ count, author, text }) =>
    `${String(count)} new messages. Latest from ${author}${text === '' ? '' : `: ${text}`}`,
  chatTyping: ({ names, count }) =>
    count === 1
      ? `${names} is typing…`
      : count <= 3
        ? `${names} are typing…`
        : 'Several people are typing…',
  chatYou: 'you',
  reactionsLabel: 'Reactions',
  reactionLabel: ({ name, count }) =>
    `${name}: ${String(count)} ${count === 1 ? 'reaction' : 'reactions'}`,
  reactionNames: ({ names }) => `${names} reacted`,
  reactionAdded: ({ name, count }) =>
    `Added ${name}. ${String(count)} ${count === 1 ? 'reaction' : 'reactions'}`,
  reactionRemoved: ({ name, count }) =>
    `Removed ${name}. ${String(count)} ${count === 1 ? 'reaction' : 'reactions'}`,
  emojiPicker: 'Emoji',
  emojiButton: 'Add emoji',
  emojiSearch: 'Search emoji',
  emojiNoResults: 'No emoji found',
  emojiResultCount: ({ count }) =>
    count === 0 ? 'No emoji found' : count === 1 ? '1 emoji' : `${String(count)} emoji`,
  emojiSearchResults: 'Search results',
  emojiCategories: 'Categories',
  emojiRecent: 'Recently used',
  emojiGroupSmileys: 'Smileys & emotion',
  emojiGroupPeople: 'People & body',
  emojiGroupAnimals: 'Animals & nature',
  emojiGroupFood: 'Food & drink',
  emojiGroupTravel: 'Travel & places',
  emojiGroupActivities: 'Activities',
  emojiGroupObjects: 'Objects',
  emojiGroupSymbols: 'Symbols',
  emojiGroupFlags: 'Flags',
  emojiSkinTone: 'Skin tone',
  emojiSkinTone1: 'Default skin tone',
  emojiSkinTone2: 'Light skin tone',
  emojiSkinTone3: 'Medium-light skin tone',
  emojiSkinTone4: 'Medium skin tone',
  emojiSkinTone5: 'Medium-dark skin tone',
  emojiSkinTone6: 'Dark skin tone',
  emojiLoading: 'Loading emoji…',
  emojiLoadFailed: 'Couldn’t load the emoji.',
  composerLabel: 'Message',
  composerPlaceholder: 'Write a message…',
  composerSend: 'Send',
  composerAttach: 'Attach files',
  composerAttachments: 'Files to send',
  composerReplyingTo: ({ author }) => `Replying to ${author}`,
  composerCancelReply: 'Cancel reply',
  composerAttached: ({ count }) =>
    count === 1 ? '1 file attached' : `${String(count)} files attached`,
  composerMentionSuggestions: 'People',
  composerCommandSuggestions: 'Commands',
  composerSuggestionCount: ({ count }) =>
    `${String(count)} ${count === 1 ? 'suggestion' : 'suggestions'}. Up and down arrows to choose, Enter to insert, Escape to close.`,
  composerSendFailed: 'Couldn’t send the message. It’s still here, so you can try again.',
  composerDropFiles: 'Drop files to attach them',
  composerShortcuts: 'Keyboard shortcuts',
  composerShortcutSend: 'Send',
  composerShortcutNewLine: 'New line',
  composerShortcutMention: 'Mention someone',
  composerShortcutCommand: 'Commands (at the start)',
  composerShortcutClose: 'Close suggestions',
  keyEnter: 'Enter',
  keyShift: 'Shift',
  keyModApple: '⌘',
  keyModOther: 'Ctrl',
  keyEscape: 'Esc',
};

/** The strings `/chat` components read: the core strings and `/chat`'s own. */
export type ChatStrings = CoreMessages & ChatMessages;

/** `/chat`'s strings, with the app's overrides from `UIProvider`. */
export function useChatMessages(): ChatStrings {
  return useEntryMessages(defaultChatMessages);
}
