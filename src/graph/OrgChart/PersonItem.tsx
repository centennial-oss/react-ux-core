// One person in OrgChart: a treeitem placed in world units showing a card (Avatar, name, title and badge, or the
// app's own content), named by that content; and, for people with reports, a button on the card's edge that shows or
// hides them, with how many people are under them. The button is drawn beside the treeitem rather than inside it, so
// the card alone names the person. Both are memoised, and their pointer and key events are handled by the chart, so
// panning, zooming and moving focus re-render only the people whose props change.
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import type { CanvasRect } from '../../canvas/geometry';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { cn } from '../../utils/cn';
import { useNumberFormat } from '../../utils/intl';
import type { LayoutDirection } from '../layout';
import { useOrgChartMessages } from './messages';
import type { OrgPerson, OrgPersonState } from './types';

export interface PersonItemProps {
  person: OrgPerson;
  /** The person's index in `people`, which events read back from `data-org-node`. */
  node: number;
  rect: CanvasRect;
  depth: number;
  /** Their place among their manager's reports (0-based) and how many there are. */
  position: number;
  setSize: number;
  reportCount: number;
  totalReportCount: number;
  isExpanded: boolean;
  isSelected: boolean;
  /** Takes Tab focus for the tree (the roving tab stop). */
  isTabStop: boolean;
  /** The current search result. */
  isMatch: boolean;
  /** Drawn only while focused: zoomed far out, the tab stop stays in the tree but the drawing shows a box for it. */
  isHiddenUntilFocused: boolean;
  managerName: string | undefined;
  /** Prefix for the id that describes the item. */
  idBase: string;
  renderPerson?: (person: OrgPerson, state: OrgPersonState) => ReactNode;
}

/** The default card: Avatar, name, title and badge, each on its own line. */
function PersonCard({ person }: { person: OrgPerson }) {
  return (
    <div className="flex size-full items-center gap-3 overflow-hidden rounded-card border border-border bg-surface-1 px-3 shadow-raised">
      <Avatar name={person.name} src={person.avatarSrc} size="lg" aria-hidden="true" />
      <div className="flex min-w-0 flex-col items-start">
        <div className="max-w-full truncate text-sm leading-5 font-semibold text-fg">
          {person.name}
        </div>
        {person.title !== undefined && (
          <div className="max-w-full truncate text-xs leading-4 text-fg-muted">{person.title}</div>
        )}
        {person.badge && (
          <div className="mt-1 flex max-w-full">
            <Badge tone={person.badge.tone} className="max-w-full overflow-hidden">
              {person.badge.label}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export const PersonItem = memo(function PersonItem({
  person,
  node,
  rect,
  depth,
  position,
  setSize,
  reportCount,
  totalReportCount,
  isExpanded,
  isSelected,
  isTabStop,
  isMatch,
  isHiddenUntilFocused,
  managerName,
  idBase,
  renderPerson,
}: PersonItemProps) {
  const messages = useOrgChartMessages();
  const aboutId = `${idBase}-${String(node)}`;
  const description = [
    managerName === undefined ? '' : messages.orgChartReportsTo({ name: managerName }),
    reportCount > 0
      ? messages.orgChartReportCount({ direct: reportCount, total: totalReportCount })
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      role="treeitem"
      data-org-node={node}
      data-match={isMatch || undefined}
      aria-describedby={description ? aboutId : undefined}
      aria-level={depth + 1}
      aria-posinset={position + 1}
      aria-setsize={setSize}
      aria-expanded={reportCount > 0 ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={isTabStop ? 0 : -1}
      className={cn(
        'absolute top-0 left-0 rounded-card outline-none focus-visible:focus-ring',
        'aria-selected:ring-2 aria-selected:ring-accent-solid aria-selected:ring-offset-2 aria-selected:ring-offset-surface-1',
        'data-match:outline-2 data-match:outline-offset-4 data-match:outline-accent-solid data-match:outline-dashed',
        isHiddenUntilFocused && 'opacity-0 focus:opacity-100',
      )}
      // Dynamic geometry: the person's place in the world.
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{
        transform: `translate(${String(rect.x)}px, ${String(rect.y)}px)`,
        width: rect.width,
        height: rect.height,
      }}
    >
      {renderPerson ? (
        renderPerson(person, { depth, isExpanded, isSelected, reportCount, totalReportCount })
      ) : (
        <PersonCard person={person} />
      )}
      {description && (
        <span id={aboutId} hidden>
          {description}
        </span>
      )}
    </div>
  );
});

export interface PersonToggleProps {
  person: OrgPerson;
  node: number;
  rect: CanvasRect;
  totalReportCount: number;
  isExpanded: boolean;
  direction: LayoutDirection;
  isMirrored: boolean;
  /** Called when assistive technology presses the button (pointers go through the chart, which pans on a drag). */
  onToggle: (node: number) => void;
}

/** The button on the edge of a manager's card that shows or hides the people under them. */
export const PersonToggle = memo(function PersonToggle({
  person,
  node,
  rect,
  totalReportCount,
  isExpanded,
  direction,
  isMirrored,
  onToggle,
}: PersonToggleProps) {
  const messages = useOrgChartMessages();
  const formattedCount = useNumberFormat().format(totalReportCount);
  // On the edge facing the person's reports; the chevron points toward them while they're hidden.
  const isDown = direction === 'down';
  const x = isDown ? rect.x + rect.width / 2 : isMirrored ? rect.x : rect.x + rect.width;
  const y = isDown ? rect.y + rect.height : rect.y + rect.height / 2;
  const pointsRight = isMirrored ? isExpanded : !isExpanded;
  const Chevron = isDown
    ? isExpanded
      ? ChevronUp
      : ChevronDown
    : pointsRight
      ? ChevronRight
      : ChevronLeft;
  return (
    <button
      type="button"
      // Out of the tab order: the arrow keys show and hide reports.
      tabIndex={-1}
      data-org-toggle={node}
      aria-label={(isExpanded ? messages.orgChartHideReports : messages.orgChartShowReports)({
        name: person.name,
        count: totalReportCount,
        formattedCount,
      })}
      className="hit-area absolute top-0 left-0 inline-flex h-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-0.5 rounded-full border border-border-strong bg-surface-1 ps-1 pe-2 text-xs font-medium whitespace-nowrap text-fg-muted tabular-nums shadow-raised hover:bg-surface-3"
      // Dynamic geometry: the button sits on the card's edge.
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{ left: x, top: y }}
      onClick={(event) => {
        if (event.detail === 0) {
          onToggle(node);
        }
      }}
    >
      <Chevron aria-hidden="true" className="size-3.5 shrink-0" />
      {formattedCount}
    </button>
  );
});
