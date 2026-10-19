import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UIProvider } from '../../provider/UIProvider';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import { markdownTextWidget } from '../markdown/markdownTextWidget';
import { textWidget } from './textWidget';

describe('text widget (§10.6)', () => {
  it('shows plain text with its line breaks, scaled up by its size', () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={textWidget}
          title="Note"
          displayOptions={{ body: 'Maintenance tonight\nFrom 22:00 UTC', size: 'xl' }}
          height="10rem"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Note' });
    const text = within(region).getByText(/Maintenance tonight/);
    expect(text.textContent).toBe('Maintenance tonight\nFrom 22:00 UTC');
    expect(getComputedStyle(text).whiteSpace).toBe('pre-line');
    expect(text.parentElement?.style.zoom).toBe('2.25');
  });

  it('renders Markdown with the same type and options (/dashboard/markdown)', async () => {
    expect(markdownTextWidget.type).toBe(textWidget.type);
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={markdownTextWidget}
          title="Runbook"
          displayOptions={{ body: '# Steps\n\n1. **Check** the queue' }}
          height="14rem"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Runbook' });
    expect(await within(region).findByRole('heading', { name: 'Steps', level: 4 })).toBeTruthy();
    expect(within(region).getByText('Check').tagName).toBe('STRONG');
  });
});
