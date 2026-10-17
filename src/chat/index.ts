// Public API for @centennial-oss/react-ux-core/chat: MessageList (needs the optional peers @tanstack/react-virtual,
// react-markdown and remark-gfm), Composer, EmojiPicker and ReactionBar (whose emoji data, from the optional peer
// emojibase-data, loads on first use).
export { MessageList, type MessageListProps } from './MessageList';
export { TypingIndicator, type TypingIndicatorProps } from './TypingIndicator';
export {
  Composer,
  ComposerReplyContext,
  type ComposerProps,
  type ComposerReplyContextProps,
} from './Composer';
export {
  EmojiPicker,
  EmojiPickerButton,
  type EmojiPickerButtonProps,
  type EmojiPickerProps,
} from './EmojiPicker';
export { ReactionBar, DEFAULT_QUICK_REACTIONS, type ReactionBarProps } from './ReactionBar';
export {
  EMOJI_GROUPS,
  SKIN_TONES,
  emojiName,
  loadEmojiData,
  normalizeEmojiData,
  searchEmoji,
  withSkinTone,
  type EmojiData,
  type EmojiDataLoader,
  type EmojiEntry,
  type EmojiGroup,
  type EmojiSourceEntry,
  type SkinTone,
} from './emojiData';
export { GROUP_WINDOW_MS } from './rows';
export type {
  ChatAttachment,
  ChatAttachmentLink,
  ChatAuthor,
  ChatCommand,
  ChatMention,
  ChatMessage,
  ChatMessageStatus,
  ChatReaction,
  ChatReplyTo,
  ChatSubmission,
  ChatTypist,
} from './types';
export { defaultChatMessages, useChatMessages, type ChatMessages } from './messages';
