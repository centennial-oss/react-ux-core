import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import type { DashboardDocument, GridSettingsPolicy } from '../types';
import type { PageSettings } from './pageSettings';
import { PageSettingsDialog } from './PageSettingsDialog';

const document: DashboardDocument = {
  schemaVersion: 1,
  id: 'd',
  title: 'D',
  pages: [
    {
      id: 'p',
      title: 'Overview',
      widgets: [
        { id: 'a', type: 't', title: 'Requests', layout: { x: 0, y: 0, w: 6, h: 4 } },
        { id: 'b', type: 't', title: 'Errors', layout: { x: 6, y: 0, w: 6, h: 4 } },
      ],
    },
  ],
};
const typeOf = () => undefined;

function Host({
  onApply,
  policy,
}: {
  onApply: (settings: PageSettings) => void;
  policy?: GridSettingsPolicy;
}) {
  const [isOpen, setOpen] = useState(true);
  const page = document.pages[0];
  return page ? (
    <UIProvider locale="en-US">
      <PageSettingsDialog
        document={document}
        page={page}
        typeOf={typeOf}
        policy={policy}
        isOpen={isOpen}
        onOpenChange={setOpen}
        onApply={onApply}
      />
    </UIProvider>
  ) : null;
}

const dialog = () => screen.getByRole('dialog', { name: 'Page settings' });

describe('PageSettingsDialog (EDIT-26)', () => {
  it('edits the title and grid settings, previews a custom column count, and applies them', async () => {
    const onApply = vi.fn<(settings: PageSettings) => void>();
    render(<Host onApply={onApply} />);
    const title = await screen.findByRole('textbox', { name: 'Page title' });
    await userEvent.clear(title);
    expect(within(dialog()).getByText('A page needs a title.')).toBeTruthy();
    expect(within(dialog()).getByRole('button', { name: 'Apply' })).toHaveAttribute(
      'data-disabled',
      'true',
    );
    await userEvent.type(title, 'Traffic');
    await userEvent.click(within(dialog()).getByRole('button', { name: /Columns/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Custom' }));
    const count = within(dialog()).getByRole('textbox', { name: 'Number of columns' });
    await userEvent.clear(count);
    await userEvent.type(count, '8');
    await userEvent.tab();
    expect(
      within(dialog()).getByRole('img', {
        name: 'Layout preview. Widgets are rescaled from 12 to 8 columns, as shown.',
      }),
    ).toBeTruthy();
    await userEvent.click(within(dialog()).getByText('Fixed row height'));
    const height = within(dialog()).getByRole('textbox', { name: 'Row height' });
    await userEvent.clear(height);
    await userEvent.type(height, '1rem');
    expect(
      within(dialog()).getByText('Enter a length of at least 1.5rem, such as 4rem or 64px.'),
    ).toBeTruthy();
    await userEvent.clear(height);
    await userEvent.type(height, '80px');
    await userEvent.click(within(dialog()).getByText('Move widgets up to fill gaps'));
    await userEvent.click(within(dialog()).getByText('Every page of this dashboard'));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith({
      title: 'Traffic',
      scope: 'dashboard',
      grid: {
        columns: 8,
        rowSizing: 'fixed',
        rowsPerScreen: 12,
        rowHeight: '80px',
        density: 'auto',
        compaction: 'none',
      },
    });
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('locks the fields the policy names', async () => {
    render(<Host onApply={vi.fn()} policy={{ lockedFields: ['columns', 'density', 'scope'] }} />);
    await screen.findByRole('dialog');
    expect(within(dialog()).getByRole('button', { name: /Columns/ })).toBeDisabled();
    expect(within(dialog()).getByRole('button', { name: /Density/ })).toBeDisabled();
    expect(within(dialog()).getByRole('radio', { name: 'This page' })).toBeDisabled();
    expect(within(dialog()).getByRole('radio', { name: 'Fit rows to the screen' })).toBeEnabled();
  });

  it('fits a phone without sideways scrolling, and passes axe', async () => {
    render(<Host onApply={vi.fn()} />);
    await screen.findByRole('dialog');
    expect(dialog().scrollWidth).toBeLessThanOrEqual(dialog().clientWidth + 1);
    await expectNoAxeViolations(dialog());
  });
});
