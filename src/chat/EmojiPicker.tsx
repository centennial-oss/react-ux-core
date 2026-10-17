// EmojiPicker: a searchable grid of emoji by category, with recent emoji and a skin-tone choice. The data (CLDR
// names and keywords) loads on first use (see emojiData.ts). EmojiPickerButton opens it in a popover, or a bottom
// sheet on phones.
//
// Keyboard: the grid is one tab stop (a roving tabindex across every category); arrow keys move by cell and row,
// crossing into the next or previous category, Home and End go to the row's ends, Ctrl+Home and Ctrl+End to the
// first and last emoji. Down from the search field enters the results, and Enter there picks the first one.
import {
  Apple,
  Clock,
  Flag,
  Hand,
  Heart,
  Leaf,
  Lightbulb,
  Plane,
  Smile,
  SmilePlus,
  Trophy,
} from 'lucide-react';
import {
  memo,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { RadioButton, RadioField, RadioGroup } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { Popover, PopoverTrigger } from '../components/Popover/Popover';
import { SearchField } from '../components/SearchField/SearchField';
import { Spinner } from '../components/Spinner/Spinner';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';
import type { Size } from '../utils/types';
import { useControllableState } from '../utils/useControllableState';
import {
  EMOJI_GROUPS,
  emojiKey,
  loadEmojiData,
  peekEmojiData,
  searchEmoji,
  SKIN_TONES,
  withSkinTone,
  type EmojiData,
  type EmojiDataLoader,
  type EmojiEntry,
  type EmojiGroup,
  type SkinTone,
} from './emojiData';
import { useChatMessages, type ChatStrings } from './messages';

/** Cells per row: the grid's arrow-key geometry. */
const COLUMNS = 8;

const groupIcons: Record<EmojiGroup, IconComponent> = {
  smileys: Smile,
  people: Hand,
  animals: Leaf,
  food: Apple,
  travel: Plane,
  activities: Trophy,
  objects: Lightbulb,
  symbols: Heart,
  flags: Flag,
};

export function emojiGroupLabel(group: EmojiGroup, messages: ChatStrings): string {
  const labels: Record<EmojiGroup, string> = {
    smileys: messages.emojiGroupSmileys,
    people: messages.emojiGroupPeople,
    animals: messages.emojiGroupAnimals,
    food: messages.emojiGroupFood,
    travel: messages.emojiGroupTravel,
    activities: messages.emojiGroupActivities,
    objects: messages.emojiGroupObjects,
    symbols: messages.emojiGroupSymbols,
    flags: messages.emojiGroupFlags,
  };
  return labels[group];
}

function skinToneLabel(tone: SkinTone, messages: ChatStrings): string {
  const labels: Record<SkinTone, string> = {
    1: messages.emojiSkinTone1,
    2: messages.emojiSkinTone2,
    3: messages.emojiSkinTone3,
    4: messages.emojiSkinTone4,
    5: messages.emojiSkinTone5,
    6: messages.emojiSkinTone6,
  };
  return labels[tone];
}

/** Stand-in swatches for the skin-tone choice before the data (and its ✋ variants) has loaded. */
const toneHands = ['✋', '✋🏻', '✋🏼', '✋🏽', '✋🏾', '✋🏿'];

export interface EmojiPickerProps {
  /** Called with the chosen emoji (in the chosen skin tone). */
  onSelect: (emoji: string) => void;
  /** Recently used emoji, persisted by the app, shown first. */
  recent?: readonly string[];
  /** The skin tone for emoji that have them. Controlled. */
  skinTone?: SkinTone;
  /** The skin tone at first, uncontrolled. Defaults to 1 (the default yellow). */
  defaultSkinTone?: SkinTone;
  onSkinToneChange?: (tone: SkinTone) => void;
  /** Loads the emoji list. Defaults to emojibase's English compact dataset (the optional peer `emojibase-data`). */
  loadData?: EmojiDataLoader;
  /** Focuses the search field when the picker appears. Defaults to true. */
  shouldAutoFocus?: boolean;
  /** Names the picker. Defaults to the `emojiPicker` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface PickerItem {
  key: string;
  emoji: string;
  label: string;
}

interface PickerSection {
  id: string;
  label: string;
  /** The category this section is, for the category buttons. */
  group?: EmojiGroup | 'recent';
  items: PickerItem[];
  /** Index of the section's first item in the flat list. */
  start: number;
}

interface CellProps {
  item: PickerItem;
  index: number;
  isActive: boolean;
  onPick: (emoji: string) => void;
  onActivate: (index: number) => void;
  register: (index: number, element: HTMLButtonElement | null) => void;
}

/** One emoji button. Memoised: moving the roving focus re-renders two cells, not two thousand. */
const EmojiCell = memo(function EmojiCell({
  item,
  index,
  isActive,
  onPick,
  onActivate,
  register,
}: CellProps) {
  return (
    <div role="gridcell" className="flex">
      <button
        ref={(element) => {
          register(index, element);
        }}
        type="button"
        tabIndex={isActive ? 0 : -1}
        aria-label={item.label}
        data-emoji-index={index}
        onClick={() => {
          onPick(item.emoji);
        }}
        onFocus={() => {
          onActivate(index);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') {
            onActivate(index);
          }
        }}
        className={cn(
          'flex aspect-square w-full cursor-pointer items-center justify-center rounded-control text-2xl leading-none outline-none select-none',
          'hover:bg-surface-3 focus-visible:focus-ring',
          isActive && 'bg-surface-3',
        )}
      >
        <span aria-hidden="true">{item.emoji}</span>
      </button>
    </div>
  );
});

/** Next cell for an arrow key in a grid of sections, or undefined to stay put. */
export function moveInSections(
  sizes: readonly number[],
  flat: number,
  key: string,
  isCtrl = false,
): number | undefined {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total === 0) {
    return undefined;
  }
  // Locate the section and position.
  let section = 0;
  let start = 0;
  while (section < sizes.length - 1 && flat >= start + (sizes[section] ?? 0)) {
    start += sizes[section] ?? 0;
    section += 1;
  }
  const size = sizes[section] ?? 0;
  const position = flat - start;
  const column = position % COLUMNS;
  const rowStart = position - column;
  switch (key) {
    case 'ArrowRight':
      return Math.min(flat + 1, total - 1);
    case 'ArrowLeft':
      return Math.max(flat - 1, 0);
    case 'Home':
      return isCtrl ? 0 : start + rowStart;
    case 'End':
      return isCtrl ? total - 1 : start + Math.min(rowStart + COLUMNS, size) - 1;
    case 'ArrowDown': {
      if (position + COLUMNS < size) {
        return flat + COLUMNS;
      }
      // A shorter last row below: go to its end.
      if (rowStart + COLUMNS < size) {
        return start + size - 1;
      }
      // Into the next non-empty section, same column.
      let next = section + 1;
      let nextStart = start + size;
      while (next < sizes.length && (sizes[next] ?? 0) === 0) {
        next += 1;
      }
      if (next >= sizes.length) {
        return undefined;
      }
      for (let index = section + 1; index < next; index += 1) {
        nextStart += sizes[index] ?? 0;
      }
      return nextStart + Math.min(column, (sizes[next] ?? 1) - 1);
    }
    case 'ArrowUp': {
      if (position - COLUMNS >= 0) {
        return flat - COLUMNS;
      }
      let previous = section - 1;
      while (previous >= 0 && (sizes[previous] ?? 0) === 0) {
        previous -= 1;
      }
      if (previous < 0) {
        return undefined;
      }
      let previousStart = 0;
      for (let index = 0; index < previous; index += 1) {
        previousStart += sizes[index] ?? 0;
      }
      const previousSize = sizes[previous] ?? 0;
      const lastRowStart = Math.floor((previousSize - 1) / COLUMNS) * COLUMNS;
      return previousStart + Math.min(lastRowStart + column, previousSize - 1);
    }
    default:
      return undefined;
  }
}

/**
 * A searchable emoji grid by category, with recent emoji, a skin-tone choice and a preview of the focused emoji's
 * CLDR name. Each emoji is a button named by its CLDR name ("thumbs up").
 */
export function EmojiPicker({
  onSelect,
  recent,
  skinTone: skinToneProp,
  defaultSkinTone = 1,
  onSkinToneChange,
  loadData,
  shouldAutoFocus = true,
  'aria-label': ariaLabel,
  className,
  ref,
}: EmojiPickerProps) {
  const messages = useChatMessages();
  const [tone, setTone] = useControllableState(skinToneProp, defaultSkinTone, onSkinToneChange);
  const [data, setData] = useState<EmojiData | undefined>(() => peekEmojiData(loadData));
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [currentGroup, setCurrentGroup] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<number, HTMLButtonElement>());
  const pendingFocus = useRef<number | null>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const baseId = useId();

  useEffect(() => {
    if (data) {
      return;
    }
    let isCurrent = true;
    loadEmojiData(loadData).then(
      (loadedData) => {
        if (isCurrent) {
          setData(loadedData);
          setLoadError(false);
        }
      },
      () => {
        if (isCurrent) {
          setLoadError(true);
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [data, loadData, attempt]);

  const trimmed = query.trim();
  const sections = useMemo<PickerSection[]>(() => {
    if (!data) {
      return [];
    }
    const toItem = (entry: EmojiEntry): PickerItem => {
      const emoji = withSkinTone(entry, tone);
      return { key: entry.emoji, emoji, label: entry.label };
    };
    const list: Omit<PickerSection, 'start'>[] = [];
    if (trimmed !== '') {
      list.push({
        id: 'results',
        label: messages.emojiSearchResults,
        items: searchEmoji(data, trimmed).map(toItem),
      });
    } else {
      if (recent && recent.length > 0) {
        const seen = new Set<string>();
        const items: PickerItem[] = [];
        for (const emoji of recent) {
          const key = emojiKey(emoji);
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          items.push({ key: `recent-${key}`, emoji, label: data.byEmoji.get(key)?.label ?? emoji });
        }
        list.push({ id: 'recent', label: messages.emojiRecent, group: 'recent', items });
      }
      for (const group of EMOJI_GROUPS) {
        list.push({
          id: group,
          label: emojiGroupLabel(group, messages),
          group,
          items: data.entries.filter((entry) => entry.group === group).map(toItem),
        });
      }
    }
    let start = 0;
    return list.map((section) => {
      const withStart = { ...section, start };
      start += section.items.length;
      return withStart;
    });
  }, [data, trimmed, recent, tone, messages]);

  const sizes = useMemo(() => sections.map((section) => section.items.length), [sections]);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const activeIndex = Math.min(active, Math.max(total - 1, 0));
  const activeItem = useMemo(() => {
    for (const section of sections) {
      const item = section.items[activeIndex - section.start];
      if (item) {
        return item;
      }
    }
    return undefined;
  }, [sections, activeIndex]);

  // Announce the number of results as the search changes.
  useEffect(() => {
    const live = liveRef.current;
    if (live) {
      live.textContent = trimmed === '' ? '' : messages.emojiResultCount({ count: total });
    }
  }, [trimmed, total, messages]);

  // Move focus to a cell once it's rendered.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === null) {
      return;
    }
    const element = cells.current.get(target);
    if (element) {
      pendingFocus.current = null;
      element.focus();
      element.scrollIntoView({ block: 'nearest' });
    }
  });

  const register = useMemo(
    () => (index: number, element: HTMLButtonElement | null) => {
      if (element) {
        cells.current.set(index, element);
      } else {
        cells.current.delete(index);
      }
    },
    [],
  );
  const pick = useMemo(
    () => (emoji: string) => {
      onSelect(emoji);
    },
    [onSelect],
  );

  const focusCell = (index: number) => {
    setActive(index);
    pendingFocus.current = index;
    const element = cells.current.get(index);
    if (element) {
      pendingFocus.current = null;
      element.focus();
      element.scrollIntoView({ block: 'nearest' });
    }
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.emojiIndex === undefined) {
      return;
    }
    const next = moveInSections(
      sizes,
      Number(target.dataset.emojiIndex),
      event.key,
      event.ctrlKey || event.metaKey,
    );
    if (
      ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) &&
      next !== undefined
    ) {
      event.preventDefault();
      focusCell(next);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && total > 0) {
      event.preventDefault();
      focusCell(0);
    } else if (event.key === 'Enter' && trimmed !== '') {
      const first = sections[0]?.items[0];
      if (first) {
        event.preventDefault();
        onSelect(first.emoji);
      }
    }
  };

  const jumpTo = (sectionId: string) => {
    if (trimmed !== '') {
      setQuery('');
    }
    setCurrentGroup(sectionId);
    // After a cleared search re-renders the categories, scroll to the section.
    requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      const heading = scroller?.querySelector<HTMLElement>(
        `[data-section="${CSS.escape(sectionId)}"]`,
      );
      if (scroller && heading) {
        scroller.scrollTop = heading.offsetTop - scroller.offsetTop;
      }
      const section = sections.find((candidate) => candidate.id === sectionId);
      if (section) {
        setActive(section.start);
      }
    });
  };

  // Which category is in view, for the category buttons' current state.
  const onScroll = () => {
    const scroller = scrollRef.current;
    if (!scroller || trimmed !== '') {
      return;
    }
    let current: string | undefined;
    for (const heading of scroller.querySelectorAll<HTMLElement>('[data-section]')) {
      if (heading.offsetTop - scroller.offsetTop <= scroller.scrollTop + 8) {
        current = heading.dataset.section;
      }
    }
    setCurrentGroup(current);
  };

  const toneEntry = data?.byEmoji.get('✋');
  const categoryIds = [
    ...(recent && recent.length > 0 ? (['recent'] as const) : []),
    ...EMOJI_GROUPS,
  ];
  const visibleGroup = currentGroup ?? categoryIds[0];

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.emojiPicker}
      className={cn('flex w-full min-w-0 flex-col gap-2 bg-surface-2 sm:w-[22rem]', className)}
    >
      <SearchField
        aria-label={messages.emojiSearch}
        placeholder={messages.emojiSearch}
        size="sm"
        value={query}
        onChange={(value) => {
          setQuery(value);
          setActive(0);
          if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
          }
        }}
        onKeyDown={onSearchKeyDown}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the picker opens for searching; the app can turn it off.
        autoFocus={shouldAutoFocus}
      />
      <span ref={liveRef} className="sr-only" aria-live="polite" />
      <div
        role="toolbar"
        aria-label={messages.emojiCategories}
        className="flex items-center justify-between"
      >
        {categoryIds.map((id) => {
          const label = id === 'recent' ? messages.emojiRecent : emojiGroupLabel(id, messages);
          const isCurrent = trimmed === '' && visibleGroup === id;
          return (
            <Tooltip key={id} content={label}>
              <IconButton
                icon={id === 'recent' ? Clock : groupIcons[id]}
                aria-label={label}
                size="sm"
                isDisabled={!data}
                onPress={() => {
                  jumpTo(id);
                }}
                className={cn('size-8', isCurrent ? 'text-accent-fg' : 'text-fg-muted')}
              />
            </Tooltip>
          );
        })}
      </div>
      {/* Arrow keys from the grid's buttons bubble up to this handler (one listener for every cell). */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see above. */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onKeyDown={onGridKeyDown}
        className="relative h-72 overflow-y-auto overscroll-contain rounded-control"
      >
        {!data ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-fg-muted">
            {loadError ? (
              <>
                <p className="m-0">{messages.emojiLoadFailed}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setLoadError(false);
                    setAttempt((count) => count + 1);
                  }}
                >
                  {messages.retry}
                </Button>
              </>
            ) : (
              <Spinner label={messages.emojiLoading} />
            )}
          </div>
        ) : total === 0 ? (
          <p className="m-0 p-6 text-center text-sm text-fg-muted">{messages.emojiNoResults}</p>
        ) : (
          sections.map((section) =>
            section.items.length === 0 ? null : (
              <section key={section.id} aria-labelledby={`${baseId}-${section.id}`}>
                <h3
                  id={`${baseId}-${section.id}`}
                  data-section={section.id}
                  className="sticky top-0 z-[1] m-0 bg-surface-2 px-1 py-1 text-xs font-semibold text-fg-muted"
                >
                  {section.label}
                </h3>
                <div role="grid" aria-labelledby={`${baseId}-${section.id}`}>
                  {Array.from({ length: Math.ceil(section.items.length / COLUMNS) }, (_, row) => (
                    <div key={row} role="row" className="grid grid-cols-8">
                      {section.items
                        .slice(row * COLUMNS, row * COLUMNS + COLUMNS)
                        .map((item, column) => {
                          const index = section.start + row * COLUMNS + column;
                          return (
                            <EmojiCell
                              key={item.key}
                              item={item}
                              index={index}
                              isActive={index === activeIndex}
                              onPick={pick}
                              onActivate={setActive}
                              register={register}
                            />
                          );
                        })}
                    </div>
                  ))}
                </div>
              </section>
            ),
          )
        )}
      </div>
      <div className="flex min-h-10 items-center gap-2 border-t border-border pt-2">
        <span aria-hidden="true" className="w-8 shrink-0 text-center text-2xl leading-none">
          {activeItem?.emoji}
        </span>
        <span aria-hidden="true" className="min-w-0 flex-1 truncate text-xs text-fg-muted">
          {activeItem?.label}
        </span>
        <RadioGroup
          aria-label={messages.emojiSkinTone}
          orientation="horizontal"
          value={String(tone)}
          onChange={(value) => {
            setTone(Number(value) as SkinTone);
          }}
          className="flex shrink-0 items-center gap-0.5"
        >
          {SKIN_TONES.map((option) => (
            <RadioField
              key={option}
              value={String(option)}
              aria-label={skinToneLabel(option, messages)}
              className="flex"
            >
              <RadioButton
                className={cn(
                  'hit-area relative flex size-7 cursor-pointer items-center justify-center rounded-full text-base leading-none outline-none',
                  'data-hovered:bg-surface-3 data-selected:bg-accent-bg data-selected:ring-2 data-selected:ring-accent-solid',
                  'data-focus-visible:focus-ring',
                )}
              >
                <span aria-hidden="true">
                  {toneEntry ? withSkinTone(toneEntry, option) : toneHands[option - 1]}
                </span>
              </RadioButton>
            </RadioField>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

export interface EmojiPickerButtonProps extends Omit<EmojiPickerProps, 'className' | 'ref'> {
  /** The button's name. Defaults to the `emojiButton` message ("Add emoji"). */
  label?: string;
  /** Defaults to a smiley with a plus. */
  icon?: IconComponent;
  size?: Size;
  isDisabled?: boolean;
  /** Controlled open state. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Keeps the picker open after choosing, for picking several. Defaults to false. */
  shouldStayOpen?: boolean;
  className?: string;
}

/** An icon button that opens an EmojiPicker in a popover (a bottom sheet on phones); choosing closes it. */
export function EmojiPickerButton({
  label,
  icon = SmilePlus,
  size = 'sm',
  isDisabled,
  isOpen: isOpenProp,
  onOpenChange,
  shouldStayOpen = false,
  onSelect,
  className,
  ...pickerProps
}: EmojiPickerButtonProps) {
  const messages = useChatMessages();
  const [isOpen, setOpen] = useControllableState(isOpenProp, false, onOpenChange);
  const name = label ?? messages.emojiButton;
  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Tooltip content={name}>
        <IconButton
          icon={icon}
          aria-label={name}
          size={size}
          isDisabled={isDisabled}
          className={className}
        />
      </Tooltip>
      <Popover aria-label={messages.emojiPicker} placement="top" className="p-2">
        <EmojiPicker
          {...pickerProps}
          onSelect={(emoji) => {
            onSelect(emoji);
            if (!shouldStayOpen) {
              setOpen(false);
            }
          }}
        />
      </Popover>
    </PopoverTrigger>
  );
}
