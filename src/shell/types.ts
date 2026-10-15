import type { ReactNode } from 'react';
import type { IconComponent } from '../utils/icon';

/** A navigation entry. Links render through `UIProvider`'s `LinkComponent`. */
export interface NavItem {
  /** Unique across the navigation. */
  id: string;
  /** Plain text: it also names the item in the icon rail's tooltip and flyout. */
  label: string;
  icon?: IconComponent;
  href: string;
  /** A count or short status shown beside the label. */
  badge?: ReactNode;
  children?: readonly NavItem[];
}

/** A group of navigation items, with an optional heading. */
export interface NavSection {
  id: string;
  title?: string;
  items: readonly NavItem[];
}

/**
 * Whether an item is the current page. By default an item is current when `currentPath` is its `href` or below it
 * (`/sites/12` is under `/sites`), and the item with the longest matching `href` wins.
 */
export type IsActive = (item: NavItem) => boolean;

/** An item of the phone bottom tab bar. */
export interface BottomTabItem {
  id: string;
  label: string;
  icon: IconComponent;
  href: string;
  badge?: ReactNode;
}

/** How a status category or alert is doing. */
export type Severity = 'ok' | 'warning' | 'error' | 'unknown';

/** One line in a status category's list. */
export interface StatusAlert {
  id: string;
  text: ReactNode;
  /** How many of this alert there are ("3 meters offline"). */
  count?: number;
  severity: Severity;
  /** When it was raised. */
  at?: Date | number | string;
  action?: { label: string; onPress: () => void };
}

/** A status bar button and the alerts it lists. */
export interface StatusCategory {
  id: string;
  label: string;
  icon?: IconComponent;
  severity: Severity;
  alerts: readonly StatusAlert[];
}

/** A level of a scope hierarchy, for example Organisation, Region or Location. */
export interface HierarchyLevel {
  id: string;
  /** Plain text: it heads the level's column and labels its search. */
  label: string;
}

/** A choice at one level. With a full `tree`, `children` hold the next level's choices. */
export interface HierarchyNode {
  id: string;
  label: string;
  /** Secondary text, such as an address or a code. */
  description?: string;
  children?: readonly HierarchyNode[];
}

/** A chosen scope: one node per level, from the top. */
export type HierarchyPath = readonly HierarchyNode[];

/** A footer link. */
export interface FooterLink {
  id: string;
  label: ReactNode;
  href: string;
}
