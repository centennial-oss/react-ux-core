// Page templates (§11.6): a template becomes a page with fresh ids (MOD-02), filled by the host's
// `instantiateTemplate` when it has one (NAV-13).

import type { DashboardPage, PageTemplate } from '../types';
import { createPage, duplicatePage } from './document';

/** The host's way to fill a template, for example choosing sources from the user's earlier answers (NAV-13). */
export type InstantiateTemplate = (
  template: PageTemplate,
  args: { context: unknown },
) => Promise<DashboardPage>;

/** A new page from a template: its widgets copied with fresh ids, unplaced ones left for auto-placement (GRID-06). */
export function pageFromTemplate(template: PageTemplate, title: string): DashboardPage {
  const page = createPage({ title, widgets: template.widgets });
  return template.grid ? { ...page, grid: structuredClone(template.grid) } : page;
}

/**
 * A page from a template: the host's page when `instantiate` is given (its title, or `title` when it has none), else
 * `pageFromTemplate`. Either way every id is new.
 */
export async function instantiatePage(
  template: PageTemplate,
  title: string,
  { instantiate, context }: { instantiate?: InstantiateTemplate; context?: unknown } = {},
): Promise<DashboardPage> {
  if (!instantiate) {
    return pageFromTemplate(template, title);
  }
  const page = await instantiate(template, { context });
  return duplicatePage(page, page.title.trim() === '' ? title : page.title);
}
