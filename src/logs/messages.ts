// English defaults of the logs entry point's strings. They also use the core strings (`noData`, `loading`…).
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

/** Strings for LogViewer. */
export interface LogViewerMessages {
  /** The log's default accessible name. */
  logLabel: string;
  /** Names the toolbar of log actions. */
  logToolbar: string;
  /** The search field's accessible name. */
  logSearch: string;
  /** The search field's placeholder. */
  logSearchPlaceholder: string;
  /** Shown when a `/regex/` search doesn't compile. */
  logInvalidPattern: string;
  /** The position in the search results, shown next to the search field. */
  logMatchPosition: (params: { current: number; total: number }) => string;
  /** Announced when the number of search results changes. */
  logMatchCount: (params: { count: number }) => string;
  logPreviousMatch: string;
  logNextMatch: string;
  /** The level filter's button. */
  logLevels: string;
  /** The level filter's button while some levels are hidden. */
  logLevelsFiltered: (params: { count: number; total: number }) => string;
  logLevelTrace: string;
  logLevelDebug: string;
  logLevelInfo: string;
  logLevelWarn: string;
  logLevelError: string;
  logLevelFatal: string;
  /** The toggle that keeps the view on the newest line. */
  logFollow: string;
  logWrapLines: string;
  /** The toggle that announces new error and fatal lines to screen readers. */
  logAnnounceErrors: string;
  /** The download button: saves the visible (filtered) lines as a .log file. */
  logDownload: string;
  /** The button shown while following is paused. `count` is the number of lines that arrived since. */
  logJumpToLatest: (params: { count: number }) => string;
  /** The button that expands a line's structured fields. */
  logShowFields: string;
  /** Shown at the top while older lines load. */
  logLoadingOlder: string;
  /** Shown when there are no lines (or none at the visible levels). */
  logEmpty: string;
  /** Announces one new error line. */
  logNewError: (params: { level: string; message: string }) => string;
  /** Announces several new error lines at once (announcements are throttled). */
  logNewErrors: (params: { count: number; message: string }) => string;
}

export const defaultLogViewerMessages: LogViewerMessages = {
  logLabel: 'Log',
  logToolbar: 'Log tools',
  logSearch: 'Search the log',
  logSearchPlaceholder: 'Text or /regex/',
  logInvalidPattern: 'Invalid regular expression',
  logMatchPosition: ({ current, total }) =>
    total === 0 ? 'No matches' : `${String(current)} of ${String(total)}`,
  logMatchCount: ({ count }) =>
    count === 0 ? 'No matches' : count === 1 ? '1 match' : `${String(count)} matches`,
  logPreviousMatch: 'Previous match',
  logNextMatch: 'Next match',
  logLevels: 'Levels',
  logLevelsFiltered: ({ count, total }) => `Levels (${String(count)} of ${String(total)})`,
  logLevelTrace: 'TRACE',
  logLevelDebug: 'DEBUG',
  logLevelInfo: 'INFO',
  logLevelWarn: 'WARN',
  logLevelError: 'ERROR',
  logLevelFatal: 'FATAL',
  logFollow: 'Follow new lines',
  logWrapLines: 'Wrap lines',
  logAnnounceErrors: 'Announce errors',
  logDownload: 'Download visible lines',
  logJumpToLatest: ({ count }) =>
    count === 0 ? 'Jump to latest' : `Jump to latest (${String(count)} new)`,
  logShowFields: 'Show fields',
  logLoadingOlder: 'Loading older lines…',
  logEmpty: 'No log lines',
  logNewError: ({ level, message }) => `${level}: ${message}`,
  logNewErrors: ({ count, message }) => `${String(count)} new errors. Latest: ${message}`,
};

/** The strings `/logs` components read: the core strings and `/logs`' own. */
export type LogStrings = CommonMessages & LogViewerMessages;

/** `/logs`' strings, with the app's overrides from `UIProvider`. */
export function useLogMessages(): LogStrings {
  return useEntryMessages(defaultLogViewerMessages);
}
