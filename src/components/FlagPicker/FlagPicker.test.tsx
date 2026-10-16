import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { demoCountries, demoFlagRows, type DemoCountry } from '../../../test/flags';
import { FlagProvider } from '../Flag/FlagProvider';
import { FlagPicker } from './FlagPicker';

function renderPicker(onChange?: (value: string | null, country: DemoCountry | null) => void) {
  return render(
    <FlagProvider countries={demoCountries}>
      <FlagPicker<DemoCountry> label="Country" rows={demoFlagRows} onChange={onChange} />
    </FlagProvider>,
  );
}

describe('FlagPicker', () => {
  it('shows flags in titled rows, by code or name, leaving out unknown countries', async () => {
    render(
      <FlagPicker
        label="Country"
        rows={[
          { id: 'mixed', title: 'Mixed', countries: ['fr', 'Brazil', 'Atlantis'] },
          { id: 'asia', title: 'Asia', countries: ['中国'] },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Country/ }));
    const mixed = await screen.findByRole('group', { name: 'Mixed' });
    expect(
      within(mixed)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['France', 'Brazil']);
    expect(screen.getByRole('group', { name: 'Asia' }).textContent).toContain('China');
  });

  it('hands back the chosen country’s registered data', async () => {
    const onChange = vi.fn();
    renderPicker(onChange);
    const trigger = screen.getByRole('button', { name: /Country/ });
    expect(trigger).toHaveTextContent('No country');
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: 'Japan' }));
    expect(onChange).toHaveBeenLastCalledWith(
      'jp',
      expect.objectContaining({ code: 'jp', nativeName: '日本', currency: 'JPY' }),
    );
    expect(screen.getByRole('button', { name: /Country/ })).toHaveTextContent('Japan');
    expect(
      screen
        .getByRole('button', { name: /Country/ })
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/images/flags/jp.svg');
  });

  it('searches by native name', async () => {
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: /Country/ }));
    await userEvent.type(
      await screen.findByRole('searchbox', { name: 'Search countries' }),
      'deutsch',
    );
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Germany']);
  });

  it('can hide the names, which screen readers still hear', async () => {
    render(
      <FlagProvider countries={demoCountries}>
        <FlagPicker label="Country" rows={demoFlagRows} hasLabels={false} isSearchable={false} />
      </FlagProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Country/ }));
    const peru = await screen.findByRole('option', { name: 'Peru' });
    expect(within(peru).getByText('Peru')).toHaveClass('sr-only');
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('has no accessibility violations, open', async () => {
    const { baseElement } = render(
      <FlagProvider countries={demoCountries}>
        <FlagPicker label="Country" rows={demoFlagRows} defaultValue="fr" defaultOpen />
      </FlagProvider>,
    );
    await screen.findByRole('listbox');
    await expectNoAxeViolations(baseElement);
  });
});
