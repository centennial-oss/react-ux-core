import React, { useEffect, useState } from 'react';
import { addons, types } from 'storybook/manager-api';
import { create } from 'storybook/theming';

const version = process.env.STORYBOOK_RELEASE_VERSION ?? 'dev';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: `react-ux-core v${version}`,
    brandUrl: 'https://github.com/centennial-oss/react-ux-core',
  }),
});

// The published site keeps every version in its own folder, with /versions.json at the root. The switcher reads it and links to the same page in another version's folder. It stays
// hidden when versions.json isn't there, for example in local development.
interface VersionsFile {
  latest?: string;
  next?: string | null;
  versions: string[];
}

function VersionSwitcher() {
  const [versions, setVersions] = useState<VersionsFile | null>(null);

  useEffect(() => {
    fetch('../versions.json')
      .then((response) => (response.ok ? (response.json() as Promise<VersionsFile>) : null))
      .then(setVersions)
      .catch(() => {
        setVersions(null);
      });
  }, []);

  if (!versions) {
    return null;
  }

  const options = [
    ...(versions.latest ? [{ folder: 'latest', label: `latest (${versions.latest})` }] : []),
    ...(versions.next ? [{ folder: 'next', label: `next (${versions.next})` }] : []),
    ...versions.versions.map((v) => ({ folder: `v${v}`, label: `v${v}` })),
  ];
  const currentFolder = window.location.pathname.split('/').filter(Boolean).at(-1) ?? '';

  return (
    <select
      aria-label="Documentation version"
      value={options.some((option) => option.folder === currentFolder) ? currentFolder : ''}
      onChange={(event) => {
        window.location.assign(`../${event.target.value}/${window.location.search}`);
      }}
      style={{ margin: '0 8px', font: 'inherit', fontSize: 12 }}
    >
      {currentFolder && !options.some((option) => option.folder === currentFolder) && (
        <option value="">{`v${version}`}</option>
      )}
      {options.map((option) => (
        <option key={option.folder} value={option.folder}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

addons.register('react-ux-core/version', () => {
  addons.add('react-ux-core/version/switcher', {
    type: types.TOOL,
    title: 'Version',
    render: () => <VersionSwitcher />,
  });
});
