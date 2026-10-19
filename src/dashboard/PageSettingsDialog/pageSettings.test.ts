import { describe, expect, it } from 'vitest';
import { DEFAULT_GRID_SPEC } from '../layout/metrics';
import type { DashboardDocument } from '../types';
import {
  gridSettingsOf,
  settingsIssues,
  withPageSettings,
  type PageSettings,
} from './pageSettings';

const typeOf = () => undefined;

function document(): DashboardDocument {
  return {
    schemaVersion: 1,
    id: 'd',
    title: 'D',
    pages: [
      {
        id: 'p',
        title: 'Page',
        widgets: [
          { id: 'a', type: 't', layout: { x: 0, y: 0, w: 6, h: 4 } },
          { id: 'b', type: 't', layout: { x: 6, y: 0, w: 6, h: 4 } },
          { id: 'c', type: 't', layout: { w: 4, h: 2 } },
        ],
      },
      {
        id: 'q',
        title: 'Other',
        grid: { columns: 16 },
        widgets: [{ id: 'z', type: 't', layout: { x: 0, y: 0, w: 8, h: 4 } }],
      },
      {
        id: 'r',
        title: 'Third',
        widgets: [{ id: 'y', type: 't', layout: { x: 3, y: 0, w: 3, h: 2 } }],
      },
    ],
  };
}

const settings = (change: Partial<PageSettings['grid']>, extra: Partial<PageSettings> = {}) => ({
  title: 'Page',
  grid: { ...gridSettingsOf(DEFAULT_GRID_SPEC), ...change },
  scope: 'page' as const,
  ...extra,
});

describe('withPageSettings (EDIT-26, GRID-03)', () => {
  it('stores settings on the page and rescales its widgets to the new column count (acceptance 20)', () => {
    const source = document();
    const next = withPageSettings(source, 'p', settings({ columns: 24 }), undefined, typeOf);
    const page = next.pages[0];
    expect(page?.grid?.columns).toBe(24);
    expect(page?.widgets.map((widget) => widget.layout)).toEqual([
      { x: 0, y: 0, w: 12, h: 4 },
      { x: 12, y: 0, w: 12, h: 4 },
      { w: 8, h: 2 },
    ]);
    // Other pages are untouched.
    expect(next.pages[1]).toBe(source.pages[1]);
    expect(next.pages[2]?.widgets[0]?.layout).toEqual({ x: 3, y: 0, w: 3, h: 2 });
    expect(next.grid).toBeUndefined();
  });

  it('stores dashboard defaults, clears the page’s own values, and rescales every page that follows them', () => {
    const source = document();
    const [first, ...rest] = source.pages;
    if (first) {
      source.pages = [{ ...first, grid: { columns: 12, rowsPerScreen: 6, gap: '1rem' } }, ...rest];
    }
    const next = withPageSettings(
      source,
      'p',
      settings({ columns: 6 }, { scope: 'dashboard', title: 'Renamed' }),
      undefined,
      typeOf,
    );
    expect(next.grid?.columns).toBe(6);
    // Only settings the dialog edits are cleared from the page.
    expect(next.pages[0]?.grid).toEqual({ gap: '1rem' });
    expect(next.pages[0]?.title).toBe('Renamed');
    expect(next.pages[0]?.widgets[0]?.layout).toMatchObject({ x: 0, w: 3 });
    // A page with its own column count keeps it and its layout; one that follows the defaults is rescaled.
    expect(next.pages[1]?.widgets[0]?.layout).toEqual({ x: 0, y: 0, w: 8, h: 4 });
    expect(next.pages[2]?.widgets[0]?.layout).toMatchObject({ x: 2, w: 2 });
  });

  it('keeps a page without other grid settings free of an empty grid', () => {
    const next = withPageSettings(
      document(),
      'r',
      settings({}, { scope: 'dashboard' }),
      undefined,
      typeOf,
    );
    expect('grid' in (next.pages[2] ?? {})).toBe(false);
  });
});

describe('settingsIssues', () => {
  it('needs a title, whole column and row counts from 1 to 48, and a row height of at least 1.5rem', () => {
    expect(settingsIssues(settings({})).size).toBe(0);
    expect(
      [
        ...settingsIssues(
          settings({ columns: 0, rowsPerScreen: 49, rowHeight: '1rem' }, { title: ' ' }),
        ),
      ].sort(),
    ).toEqual(['columns', 'rowHeight', 'rowsPerScreen', 'title']);
    expect(settingsIssues(settings({ columns: 12.5, rowHeight: 'wide' })).size).toBe(2);
    expect(settingsIssues(settings({ rowHeight: '64px' })).size).toBe(0);
  });
});
