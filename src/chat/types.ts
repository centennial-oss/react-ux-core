// The data model shared by MessageList, Composer and ReactionBar.
import type { ReactNode } from 'react';

/** Who wrote a message. */
export interface ChatAuthor {
  id: string;
  name: string;
  /** A picture for the avatar; without one it shows initials. */
  avatarSrc?: string;
}

/** An attachment that's already uploaded somewhere. */
export interface ChatAttachmentLink {
  name: string;
  url: string;
  /** The MIME type, such as `image/png`. */
  type: string;
  /** Size in bytes. */
  size?: number;
}

/** A file attached to a message: a local `File` (being sent) or one that's stored at a URL. */
export type ChatAttachment = File | ChatAttachmentLink;

/** One emoji's reactions on a message. */
export interface ChatReaction {
  emoji: string;
  count: number;
  /** Whether the current user is one of them. */
  isMine: boolean;
  /** Who reacted, for the tooltip and the accessible description. */
  names?: readonly string[];
}

/** Where a message the current user sent has got to. */
export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** The message a reply quotes. */
export interface ChatReplyTo {
  id: string;
  author: string;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  /** When it was sent: a Date, epoch milliseconds or an ISO 8601 string. */
  at: Date | number | string;
  /** Markdown (rendered with `Markdown`) or a custom node. */
  body: string | ReactNode;
  /**
   * Plain text for announcements when `body` is a node (a string body is announced as it is). Without it, a node
   * body is announced by its author alone.
   */
  text?: string;
  attachments?: readonly ChatAttachment[];
  reactions?: readonly ChatReaction[];
  /** Delivery status, shown on the current user's own messages. `failed` offers a retry. */
  status?: ChatMessageStatus;
  replyTo?: ChatReplyTo;
  isEdited?: boolean;
  /** A notice such as "Ada joined the channel": centred, without an author line. */
  isSystem?: boolean;
  /**
   * The body is still arriving (an assistant's reply streaming in). It's marked busy, and announced once it's
   * complete rather than as it grows.
   */
  isStreaming?: boolean;
}

/** Someone who's typing. */
export interface ChatTypist {
  id: string;
  name: string;
}

/** A person (or thing) the Composer can @-mention. */
export interface ChatMention {
  id: string;
  label: string;
  avatarSrc?: string;
}

/** A Composer `/command`. */
export interface ChatCommand {
  id: string;
  /** What's typed after the slash, such as `poll`. */
  label: string;
  description?: string;
}

/** What the Composer sends. */
export interface ChatSubmission {
  text: string;
  attachments: File[];
  /** The ids of the people mentioned (whose `@label` is still in the text). */
  mentions: string[];
  /** The id of the `/command` the text starts with, if any. */
  command?: string;
}
