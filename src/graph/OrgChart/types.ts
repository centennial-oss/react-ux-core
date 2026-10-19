// OrgChart's data types.
import type { Tone } from '../../utils/types';

/** A short label on a person's card, such as their location, "New" or "Hiring". */
export interface OrgBadge {
  label: string;
  /** Defaults to `neutral`. */
  tone?: Tone;
}

export interface OrgPerson {
  id: string;
  /** Their manager's id. People without one (or whose manager isn't in `people`) are at the top. */
  managerId?: string | null;
  name: string;
  /** Their job title. */
  title?: string;
  /** A picture for their Avatar; without one it shows their initials. */
  avatarSrc?: string;
  badge?: OrgBadge;
  /**
   * Drawn beside their manager's line, above the manager's other reports (an executive assistant, a chief of staff).
   * Ignored for people with reports of their own.
   */
  isAssistant?: boolean;
}

/** What `renderPerson` knows about a person's place in the chart. */
export interface OrgPersonState {
  /** 0 for the people at the top. */
  depth: number;
  /** Their reports are shown. */
  isExpanded: boolean;
  isSelected: boolean;
  /** People who report to them directly. */
  reportCount: number;
  /** Everyone under them, at any depth. */
  totalReportCount: number;
}
