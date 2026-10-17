// Sample data for the DiffViewer and PlanReview stories and tests: an observatory's configuration (a 400-line JSON
// document with three changes), small before/after snippets, and a 40-change provisioning plan.
import type { PlannedChange } from '../src/diff/plan';

const FILTERS = ['U', 'B', 'V', 'R', 'I'];
const SITES = ['north-ridge', 'south-dome', 'east-array', 'west-field'];

/** One instrument of the observatory, deterministic from its index. */
function instrument(index: number) {
  return {
    id: `cam-${String(index + 1).padStart(2, '0')}`,
    site: SITES[index % SITES.length],
    filter: FILTERS[index % FILTERS.length],
    exposureSeconds: 30 + (index % 6) * 15,
    gain: 1 + (index % 4),
    isCooled: index % 3 !== 0,
    targetTempC: -20 - (index % 5) * 5,
    binning: (index % 2) + 1,
  };
}

/** The live configuration: 40 instruments (each 10 lines), about 400 lines of JSON. */
function observatory() {
  return {
    name: 'Ridge Observatory',
    latitude: 31.9583,
    longitude: -111.5967,
    instruments: Array.from({ length: 40 }, (_, index) => instrument(index)),
    schedule: { opensAt: '19:30', closesAt: '05:45', timeZone: 'America/Phoenix' },
  };
}

const live = observatory();
const proposed = observatory();
// Three changes, far enough apart to make three hunks.
if (proposed.instruments[2]) {
  proposed.instruments[2].exposureSeconds = 120;
}
if (proposed.instruments[19]) {
  proposed.instruments[19].filter = 'H-alpha';
}
if (proposed.instruments[37]) {
  proposed.instruments[37].isCooled = false;
  proposed.instruments[37].targetTempC = 0;
}

export const observatoryLive = JSON.stringify(live, null, 2);
export const observatoryProposed = JSON.stringify(proposed, null, 2);

/** The proposed configuration with its top-level keys in a different order (the same data). */
export const observatoryReordered = JSON.stringify(
  {
    schedule: proposed.schedule,
    instruments: proposed.instruments,
    longitude: proposed.longitude,
    latitude: proposed.latitude,
    name: proposed.name,
  },
  null,
  2,
);

export const telescopeYamlBefore = `telescope:
  name: Ridge 1.2 m
  aperture_mm: 1200
  focal_ratio: 8
  mount: equatorial
  guiding: off
cameras:
  - id: cam-01
    filter: V
    exposure_s: 60
  - id: cam-02
    filter: R
    exposure_s: 60
`;

export const telescopeYamlAfter = `telescope:
  name: Ridge 1.2 m
  aperture_mm: 1200
  focal_ratio: 6.5
  mount: equatorial
  guiding: on
  guide_star_mag_limit: 12.5
cameras:
  - id: cam-01
    filter: V
    exposure_s: 90
`;

export const longLineBefore = `observe --target "NGC 7000" --filters U,B,V --exposure 60 --repeat 12 --dither 5 --site north-ridge --notify ada@example.com`;
export const longLineAfter = `observe --target "NGC 7000" --filters U,B,V,H-alpha --exposure 90 --repeat 12 --dither 5 --site north-ridge --notify grace@example.com`;

// A provisioning plan: 40 changes, including 2 replacements and 3 destroys.

const bucket = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  region: 'region-1',
  versioning: true,
  tags: { project: 'sky-survey', owner: 'ada' },
  ...extra,
});

function generatedChanges(): PlannedChange[] {
  const changes: PlannedChange[] = [];
  for (let index = 0; index < 22; index++) {
    const name = `frames-${String(index + 1).padStart(2, '0')}`;
    changes.push({
      id: `create-${name}`,
      address: `storage_bucket.${name.replace('-', '_')}`,
      type: 'storage_bucket',
      action: 'create',
      after: bucket(name, { lifecycleDays: 30 + index }),
      unknownAfter: ['id', 'endpoint'],
    });
  }
  for (let index = 0; index < 10; index++) {
    const name = `pipeline-${index + 1}`;
    changes.push({
      id: `update-${name}`,
      address: `compute_instance.${name.replace('-', '_')}`,
      type: 'compute_instance',
      action: 'update',
      before: { name, size: 'medium', image: 'reducer-2.3', labels: { stage: 'calibration' } },
      after: {
        name,
        size: index % 2 === 0 ? 'large' : 'medium',
        image: 'reducer-2.4',
        labels: { stage: 'calibration' },
      },
    });
  }
  return changes;
}

/** A 40-change plan: 23 creates, 11 updates, 2 replacements, 3 destroys and a read. */
export const sampleChanges: readonly PlannedChange[] = [
  {
    id: 'replace-archive',
    address: 'storage_bucket.archive',
    type: 'storage_bucket',
    action: 'replace',
    before: bucket('archive', { region: 'region-1', id: 'bkt-0193' }),
    after: bucket('archive', { region: 'region-2' }),
    forcesReplacement: ['region'],
    unknownAfter: ['id'],
  },
  {
    id: 'replace-db',
    address: 'database_instance.catalog',
    type: 'database_instance',
    action: 'replace',
    before: { name: 'catalog', engine: 'postgres', version: '15', storageGb: 200, zone: 'zone-a' },
    after: { name: 'catalog', engine: 'postgres', version: '17', storageGb: 400, zone: 'zone-b' },
    forcesReplacement: ['version', 'zone'],
  },
  {
    id: 'delete-scratch',
    address: 'storage_bucket.scratch',
    type: 'storage_bucket',
    action: 'delete',
    before: bucket('scratch', { versioning: false }),
  },
  {
    id: 'delete-legacy-dns',
    address: 'dns_record.legacy',
    type: 'dns_record',
    action: 'delete',
    before: { name: 'legacy.example.com', type: 'CNAME', value: 'old.example.com', ttl: 300 },
  },
  {
    id: 'delete-old-key',
    address: 'access_key.ci_old',
    type: 'access_key',
    action: 'delete',
    before: { user: 'ci', secret: 'k3y-0ld-v4lue' },
    isSensitive: true,
  },
  {
    id: 'create-images',
    address: 'storage_bucket.images',
    type: 'storage_bucket',
    action: 'create',
    after: bucket('images'),
    unknownAfter: ['id', 'endpoint'],
  },
  {
    id: 'update-db-password',
    address: 'database_user.reducer',
    type: 'database_user',
    action: 'update',
    before: { name: 'reducer', password: 'hunter2-old', roles: ['read'] },
    after: { name: 'reducer', password: 'n3w-s3cret', roles: ['read', 'write'] },
    isSensitive: true,
  },
  {
    id: 'read-image',
    address: 'data.machine_image.reducer',
    type: 'machine_image',
    action: 'read',
    after: { family: 'reducer', version: '2.4' },
    unknownAfter: ['id'],
  },
  ...generatedChanges(),
];

/** A small plan with no destroys or replacements. */
export const safeChanges: readonly PlannedChange[] = [
  {
    id: 'create-images',
    address: 'storage_bucket.images',
    type: 'storage_bucket',
    action: 'create',
    after: bucket('images'),
    unknownAfter: ['id', 'endpoint'],
  },
  {
    id: 'update-dns',
    address: 'dns_record.www',
    type: 'dns_record',
    action: 'update',
    before: { name: 'www.example.com', type: 'A', value: '192.0.2.10', ttl: 3600 },
    after: { name: 'www.example.com', type: 'A', value: '192.0.2.20', ttl: 300 },
  },
];
