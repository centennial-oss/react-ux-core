import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
  Disclosure as AriaDisclosure,
  DisclosurePanel,
  Link as AriaLink,
  useLocale,
  type LinkProps as AriaLinkProps,
} from 'react-aria-components';
import { useEntryMessages, useLinkComponent, useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useNow } from '../../utils/timers';
import type { HeadingLevel, Tone } from '../../utils/types';
import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import { RelativeTime } from '../RelativeTime/RelativeTime';
import { Heading } from '../Text/Text';
import { dayKey, groupByDay, previousDayKey } from './days';
import { defaultActivityTimelineMessages } from './messages';

/** One event on the timeline. */
export interface ActivityItem {
  /** Unique within the timeline. */
  id: string;
  /** When it happened: a Date, epoch milliseconds or an ISO 8601 string. */
  at: Date | number | string;
  /** Who did it. Shown as an Avatar (in the rail when there's no `icon`) and the name in bold. */
  actor?: { name: string; avatarSrc?: string };
  /** What happened, after the actor's name: "updated the cache policy on", "deployed", "commented on". */
  action: ReactNode;
  /** What it happened to, after the action. A link with `href`. */
  target?: { label: string; href?: string };
  /** The rail marker's colour. Defaults to `neutral`. */
  tone?: Tone;
  /** The rail marker's icon. */
  icon?: IconComponent;
  /** Detail that expands inline, such as a DiffViewer or a comment body. */
  detail?: ReactNode;
}

export interface ActivityTimelineProps {
  /** The events, newest first (the order is kept). */
  items: readonly ActivityItem[];
  /** Groups the items under day headings ("Today", "Yesterday", "Oct 14"). Defaults to true. */
  isGroupedByDay?: boolean;
  /** Asks for older items: from the "Load more" button, and when the end of the list scrolls into view. */
  onLoadMore?: () => void;
  /** Whether there are older items to load. */
  hasMore?: boolean;
  /** Older items are on their way: the button shows a spinner and scrolling doesn't ask again. */
  isLoadingMore?: boolean;
  /** Asks for more when the end of the list scrolls into view, as well as from the button. Defaults to true. */
  shouldLoadOnScroll?: boolean;
  /** Shown when there are no items. Defaults to an EmptyState saying "No activity yet". */
  emptyState?: ReactNode;
  /** IANA time zone for the day headings and timestamps. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** The day headings' level. Defaults to 3. */
  headingLevel?: HeadingLevel;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const markerToneClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-bg text-neutral-fg',
  accent: 'bg-accent-bg text-accent-fg',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
};

const markerDotClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-border',
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
};

type LinkRender = NonNullable<AriaLinkProps['render']>;

function Marker({ item }: { item: ActivityItem }) {
  const tone = item.tone ?? 'neutral';
  if (item.icon) {
    const Icon = item.icon;
    return (
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          markerToneClasses[tone],
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
    );
  }
  if (item.actor) {
    // The name is in the sentence beside it, so the rail's avatar is just a picture.
    return (
      <Avatar name={item.actor.name} src={item.actor.avatarSrc} size="sm" aria-hidden="true" />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center">
      <span className={cn('size-2.5 rounded-full', markerDotClasses[tone])} />
    </span>
  );
}

function Entry({
  item,
  timeZone,
  renderLink,
  detailsLabel,
}: {
  item: ActivityItem;
  timeZone: string;
  renderLink: LinkRender;
  detailsLabel: string;
}) {
  const sentenceId = useId();
  const { actor, target } = item;
  return (
    <li className="group/entry flex min-w-0 gap-3">
      {/* The rail: the marker, then a line down to the next item (the last item in a list has none). */}
      <div aria-hidden="true" className="flex shrink-0 flex-col items-center">
        <Marker item={item} />
        <span className="mt-1 w-px flex-1 bg-border group-last/entry:hidden" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5 pb-4 text-sm group-last/entry:pb-0">
        <p id={sentenceId} className="min-w-0 text-fg [overflow-wrap:anywhere]">
          {actor && item.icon && (
            <Avatar
              name={actor.name}
              src={actor.avatarSrc}
              size="xs"
              aria-hidden="true"
              className="me-1.5 -mt-0.5"
            />
          )}
          {actor && <span className="font-semibold">{actor.name}</span>}
          {actor && ' '}
          <span className="text-fg-muted">{item.action}</span>
          {target && ' '}
          {target?.href !== undefined ? (
            <AriaLink
              href={target.href}
              render={renderLink}
              className="cursor-pointer rounded-sm font-medium text-accent-fg underline-offset-2 outline-none data-focus-visible:focus-ring data-hovered:underline"
            >
              {target.label}
            </AriaLink>
          ) : (
            target && <span className="font-medium">{target.label}</span>
          )}
        </p>
        <span className="text-xs text-fg-muted">
          <RelativeTime value={item.at} timeZone={timeZone} />
        </span>
        {item.detail !== undefined && (
          <AriaDisclosure className="group/detail mt-1 min-w-0">
            <AriaButton
              slot="trigger"
              aria-describedby={sentenceId}
              className={cn(
                'hit-area inline-flex cursor-pointer items-center gap-1 rounded-control text-xs font-medium text-fg-muted outline-none',
                'data-focus-visible:focus-ring data-hovered:text-fg',
              )}
            >
              {detailsLabel}
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform duration-(--duration-fast) group-data-expanded/detail:rotate-180"
              />
            </AriaButton>
            {/* Padding lives on an inner element: the collapsed panel (hidden="until-found") must take no space. */}
            <DisclosurePanel>
              <div className="mt-2 min-w-0">{item.detail}</div>
            </DisclosurePanel>
          </AriaDisclosure>
        )}
      </div>
    </li>
  );
}

/**
 * A history of events (audit logs, deploys, account history, incidents): a vertical rail of icons or avatars, each
 * event as "actor action target" with a relative timestamp (the exact time on hover or focus) and detail that
 * expands inline. Grouped under day headings in the given time zone; older items load from a "Load more" button
 * or when the end scrolls into view.
 */
export function ActivityTimeline({
  items,
  isGroupedByDay = true,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  shouldLoadOnScroll = true,
  emptyState,
  timeZone,
  headingLevel = 3,
  className,
  ref,
}: ActivityTimelineProps) {
  const messages = useEntryMessages(defaultActivityTimelineMessages);
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;
  const LinkComponent = useLinkComponent();
  const renderLink = useMemo<LinkRender>(
    () => (domProps) =>
      'href' in domProps ? <LinkComponent {...domProps} /> : <span {...domProps} />,
    [LinkComponent],
  );
  const now = useNow();
  const today = dayKey(new Date(now), zone);
  const yesterday = previousDayKey(today);
  const groups = useMemo(
    () =>
      isGroupedByDay
        ? groupByDay(items, (item) => new Date(item.at), zone)
        : [{ key: 'all', date: new Date(Number.NaN), items: [...items] }],
    [isGroupedByDay, items, zone],
  );
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: zone }),
    [locale, zone],
  );
  const dayWithYearFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: zone,
      }),
    [locale, zone],
  );

  const dayLabel = (key: string, date: Date): string => {
    if (key === today) {
      return messages.activityToday;
    }
    if (key === yesterday) {
      return messages.activityYesterday;
    }
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return key.slice(0, 4) === today.slice(0, 4)
      ? dayFormat.format(date)
      : dayWithYearFormat.format(date);
  };

  // Infinite loading: ask once per batch when the end of the list scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canLoadMore = hasMore && onLoadMore !== undefined;
  const askedAtRef = useRef<number | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!canLoadMore || !shouldLoadOnScroll || isLoadingMore || !sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && askedAtRef.current !== items.length) {
          askedAtRef.current = items.length;
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [canLoadMore, shouldLoadOnScroll, isLoadingMore, items.length, onLoadMore]);

  if (items.length === 0 && !canLoadMore) {
    return (
      <div ref={ref} className={className}>
        {emptyState ?? <EmptyState title={messages.activityEmpty} headingLevel={headingLevel} />}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-4', className)}>
      {groups.map((group, index) => {
        const label = isGroupedByDay ? dayLabel(group.key, group.date) : '';
        return (
          // Unsorted items can bring a day back later in the list, so the key includes the position.
          <div key={`${group.key}-${String(index)}`} className="flex min-w-0 flex-col gap-3">
            {label !== '' && (
              <Heading level={headingLevel} size="sm" tone="muted">
                {label}
              </Heading>
            )}
            <ol className="flex min-w-0 list-none flex-col">
              {group.items.map((item) => (
                <Entry
                  key={item.id}
                  item={item}
                  timeZone={zone}
                  renderLink={renderLink}
                  detailsLabel={messages.details}
                />
              ))}
            </ol>
          </div>
        );
      })}
      {canLoadMore && (
        <div ref={sentinelRef} className="flex justify-center">
          <Button variant="outline" size="sm" isPending={isLoadingMore} onPress={onLoadMore}>
            {messages.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
