import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { demoCountries } from '../../../test/flags';
import { UIProvider } from '../../provider/UIProvider';
import { findCountry, mergeCountries, stockCountries } from './countries';
import { Flag } from './Flag';
import { FlagProvider, useCountry } from './FlagProvider';

describe('countries', () => {
  it('finds a country by code, English name or native name, ignoring case', () => {
    const countries = mergeCountries(new Map(), stockCountries);
    expect(findCountry(countries, 'BR')?.name).toBe('Brazil');
    expect(findCountry(countries, ' brazil ')?.code).toBe('br');
    expect(findCountry(countries, '中国')?.code).toBe('cn');
    expect(findCountry(countries, 'Atlantis')).toBeUndefined();
  });

  it('merges registrations by code, adding fields to known countries', () => {
    const base = mergeCountries(new Map(), stockCountries);
    const merged = mergeCountries(base, [
      { code: 'FR', languages: ['fr', 'oc'] },
      { code: 'de', name: 'Germany', nativeName: 'Deutschland', languages: ['de'] },
      { code: 'xx' },
    ]);
    expect(merged.get('fr')).toMatchObject({ name: 'France', languages: ['fr', 'oc'] });
    expect(merged.get('de')?.nativeName).toBe('Deutschland');
    // A new code needs at least a name.
    expect(merged.has('xx')).toBe(false);
  });
});

describe('Flag', () => {
  it('shows the stock flag from /images/flags, named for screen readers', () => {
    render(<Flag country="France" />);
    const image = screen.getByRole('img', { name: 'France' });
    expect(image).toHaveAttribute('src', '/images/flags/fr.svg');
  });

  it('takes the image path from FlagProvider, the prop, or the country', () => {
    render(
      <FlagProvider
        basePath="/static/flags/"
        countries={[{ code: 'cn', imageSrc: '/custom/china.svg' }]}
      >
        <Flag country="us" />
        <Flag country="br" basePath="/other" />
        <Flag country="China" />
      </FlagProvider>,
    );
    expect(screen.getByRole('img', { name: 'United States' })).toHaveAttribute(
      'src',
      '/static/flags/us.svg',
    );
    expect(screen.getByRole('img', { name: 'Brazil' })).toHaveAttribute('src', '/other/br.svg');
    expect(screen.getByRole('img', { name: 'China' })).toHaveAttribute('src', '/custom/china.svg');
  });

  it('shows the details asked for, with languages named in the user’s locale', () => {
    const { container } = render(
      <UIProvider locale="fr-FR">
        <Flag country="br" details={['nativeName', 'name', 'code', 'languages']} />
      </UIProvider>,
    );
    expect(container.textContent).toBe('BrasilBrazilBRportugais brésilien');
    // The text names the flag, so the image is decorative.
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('shows registered countries and their fields', () => {
    function Currency({ country }: { country: string }) {
      const info = useCountry(country) as (typeof demoCountries)[number] | undefined;
      return <span>{info?.currency}</span>;
    }
    render(
      <FlagProvider countries={demoCountries}>
        <Flag country="Deutschland" details={['name']} />
        <Currency country="jp" />
        <Currency country="us" />
      </FlagProvider>,
    );
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('JPY')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('shows a generic flag for an unknown country', () => {
    render(<Flag country="Atlantis" />);
    expect(screen.getByRole('img', { name: 'Atlantis' }).tagName.toLowerCase()).toBe('svg');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Flag country="fr" />
        <Flag country="cn" details={['name', 'nativeName', 'languages']} />
        <Flag country="Atlantis" details={['name']} />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
