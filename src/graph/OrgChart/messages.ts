// OrgChart's strings and their English defaults. Apps override them through `UIProvider`'s `messages`. OrgChart is
// drawn on a Canvas, so it also reads `/canvas`'s strings (zoom controls, canvas instructions); it doesn't ship
// NodeGraph's.
import { useEntryMessages } from '../../provider/context';
import type { CommonMessages } from '../../provider/coreStrings';
import { defaultCanvasMessages, type CanvasMessages } from '../../canvas/messages';

export interface OrgChartMessages {
  /** The chart's accessible name when it has no title or label. */
  orgChartLabel: string;
  /** Describes the chart: how many people are in it. */
  orgChartSummary: (params: { count: number }) => string;
  /** How to move around the chart, when it runs top to bottom and when it runs across. */
  orgChartInstructionsTopDown: string;
  orgChartInstructionsAcross: string;
  /** Sentences in a person's description (their card's text names them). */
  orgChartReportsTo: (params: { name: string }) => string;
  orgChartReportCount: (params: { direct: number; total: number }) => string;
  /**
   * The button on a card that shows or hides the people under them. `formattedCount` is `count` as the button shows
   * it, formatted for the locale.
   */
  orgChartShowReports: (params: { name: string; count: number; formattedCount: string }) => string;
  orgChartHideReports: (params: { name: string; count: number; formattedCount: string }) => string;
  /** The search field's accessible name and placeholder. */
  orgChartSearch: string;
  orgChartSearchPlaceholder: string;
  /** The position in the search results, shown next to the search field. */
  orgChartMatchPosition: (params: { current: number; total: number }) => string;
  /** Announced when a search finds people. */
  orgChartMatchCount: (params: { count: number }) => string;
  orgChartPreviousMatch: string;
  orgChartNextMatch: string;
}

export const defaultOrgChartMessages: OrgChartMessages = {
  orgChartLabel: 'Org chart',
  orgChartSummary: ({ count }) => (count === 1 ? '1 person.' : `${String(count)} people.`),
  orgChartInstructionsTopDown:
    'Down Arrow shows a person’s reports and moves to them, Up Arrow hides them and moves to their manager, Left and Right Arrow move along the level. Enter opens a person, Space selects them.',
  orgChartInstructionsAcross:
    'Right Arrow shows a person’s reports and moves to them, Left Arrow hides them and moves to their manager, Up and Down Arrow move along the level. Enter opens a person, Space selects them.',
  orgChartReportsTo: ({ name }) => `Reports to ${name}.`,
  orgChartReportCount: ({ direct, total }) =>
    `${direct === 1 ? '1 direct report' : `${String(direct)} direct reports`}${total > direct ? `, ${String(total)} people in all` : ''}.`,
  orgChartShowReports: ({ name, count, formattedCount }) =>
    count === 1
      ? `Show the person under ${name}`
      : `Show the ${formattedCount} people under ${name}`,
  orgChartHideReports: ({ name, count, formattedCount }) =>
    count === 1
      ? `Hide the person under ${name}`
      : `Hide the ${formattedCount} people under ${name}`,
  orgChartSearch: 'Search people',
  orgChartSearchPlaceholder: 'Name or title',
  orgChartMatchPosition: ({ current, total }) =>
    total === 0 ? 'No matches' : `${String(current)} of ${String(total)}`,
  orgChartMatchCount: ({ count }) =>
    count === 0 ? 'No matches' : count === 1 ? '1 match' : `${String(count)} matches`,
  orgChartPreviousMatch: 'Previous match',
  orgChartNextMatch: 'Next match',
};

/** The strings OrgChart reads: the core strings, `/canvas`'s and its own. */
export type OrgChartStrings = CommonMessages & CanvasMessages & OrgChartMessages;

const defaults: CanvasMessages & OrgChartMessages = {
  ...defaultCanvasMessages,
  ...defaultOrgChartMessages,
};

/** OrgChart's strings, with the app's overrides from `UIProvider`. */
export function useOrgChartMessages(): OrgChartStrings {
  return useEntryMessages(defaults);
}
