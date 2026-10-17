// English defaults of Avatar's and AvatarGroup's strings.

/** Strings for Avatar and AvatarGroup. */
export interface AvatarMessages {
  /** An avatar's name when it shows a presence, for example "Ada Lovelace, Online". */
  avatarWithPresence: (params: { name: string; presence: string }) => string;
  /** Names an AvatarGroup, for example "6 people". */
  avatarGroupLabel: (params: { count: number }) => string;
  /** The visible text of the overflow button, for example "+3". */
  avatarGroupMore: (params: { count: number }) => string;
  /** The overflow button's and its popover's name, for example "+3 more people". It starts with the visible text. */
  avatarGroupMoreLabel: (params: { count: number }) => string;
}

export const defaultAvatarMessages: AvatarMessages = {
  avatarWithPresence: ({ name, presence }) => `${name}, ${presence}`,
  avatarGroupLabel: ({ count }) => (count === 1 ? '1 person' : `${count} people`),
  avatarGroupMore: ({ count }) => `+${count}`,
  avatarGroupMoreLabel: ({ count }) => (count === 1 ? '+1 more person' : `+${count} more people`),
};
