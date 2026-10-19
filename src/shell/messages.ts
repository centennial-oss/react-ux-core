// English defaults of the shell entry point's strings (see `Messages` in provider/messages.ts).
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';
import type { ShellMessages } from '../provider/messages';
import { defaultNotificationMessages, type NotificationMessages } from './notificationMessages';
import { defaultSettingsMessages } from './settingsMessages';

export const defaultShellMessages: ShellMessages & NotificationMessages = {
  skipToContent: 'Skip to content',
  mainNavigation: 'Main',
  quickNavigation: 'Quick navigation',
  footerLinks: 'Footer',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  collapseSidebar: 'Collapse sidebar',
  expandSidebar: 'Expand sidebar',
  subPages: ({ label }) => `${label} pages`,
  accountMenu: ({ name }) => `Account: ${name}`,
  ...defaultSettingsMessages,
  more: 'More',
  pathSeparator: ' / ',
  currentScope: ({ path }) => `Scope: ${path}`,
  chooseScope: 'Choose a scope',
  searchAll: 'Search all',
  searchLevel: ({ level }) => `Search ${level}`,
  recent: 'Recent',
  backTo: ({ label }) => `Back to ${label}`,
  resultCount: ({ count }) => (count === 1 ? '1 result' : `${count} results`),
  status: 'Status',
  severityOk: 'OK',
  severityWarning: 'Warning',
  severityError: 'Error',
  severityUnknown: 'Unknown',
  statusCategory: ({ label, severity, count }) =>
    count === 0
      ? `${label}: ${severity}`
      : `${label}: ${severity}, ${count === 1 ? '1 alert' : `${count} alerts`}`,
  overallStatus: ({ severity }) => `Status: ${severity}`,
  noAlerts: 'No alerts',
  asOf: ({ time }) => `As of ${time}`,
  timeZoneNote: ({ zone }) => `Times are shown in ${zone}.`,
  version: ({ version }) => `Version ${version}`,
  build: ({ build }) => `Build ${build}`,
  pageSections: 'Page sections',
  brandHome: ({ name }) => `${name} home`,
  ...defaultNotificationMessages,
};

/** The strings `/shell` components read: the core strings and `/shell`'s own. */
export type ShellStrings = CommonMessages & ShellMessages & NotificationMessages;

/** `/shell`'s strings, with the app's overrides from `UIProvider`. */
export function useShellMessages(): ShellStrings {
  return useEntryMessages(defaultShellMessages);
}
