import type { Meta, StoryObj } from '@storybook/react-vite';
import { flowsheetObservations, flowsheetTimes, flowsheetValues } from '../../test/flowsheet';
import { DescriptionList } from '../components/DescriptionList/DescriptionList';
import { Flowsheet } from './Flowsheet';
import { ObservationTrend } from './ObservationTrend';
import { ReferenceValue } from './ReferenceValue';

const meta = {
  title: 'Table/Flowsheet',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Six vital signs and twelve lab values over ten times, newest first. Out-of-range values show a flag letter and a
 * tone, critical ones a stronger tone and an icon; source flags (the hemolyzed potassium, the clumped platelets)
 * take priority over the ranges. Tab into the grid and move with the arrow keys: each cell's tooltip gives the flag,
 * range and note. A row header opens a trend chart. CCUX displays the flags; validating units, ranges and flags is
 * the app's job.
 */
export const VitalsAndLabs: Story = {
  render: () => (
    <Flowsheet
      aria-label="Observations"
      observations={flowsheetObservations}
      values={flowsheetValues}
      timeZone="UTC"
      maxHeight="36rem"
    />
  ),
};

/** Oldest first, for reading left to right; the sticky first column stays while the times scroll. */
export const OldestFirst: Story = {
  render: () => (
    <Flowsheet
      aria-label="Vital signs"
      observations={flowsheetObservations.filter((observation) => observation.group === 'Vitals')}
      values={flowsheetValues}
      order="oldest-first"
      timeZone="UTC"
    />
  ),
};

/** Fixed columns: times without values show empty cells. */
export const FixedColumns: Story = {
  render: () => (
    <Flowsheet
      aria-label="Chemistry"
      observations={flowsheetObservations.filter(
        (observation) => observation.group === 'Chemistry',
      )}
      values={flowsheetValues}
      columns={flowsheetTimes.slice(4)}
      timeZone="UTC"
    />
  ),
};

/** The trend chart on its own: the reference range as a band, critical limits dashed, flagged points larger. */
export const Trend: Story = {
  render: () => {
    const heartRate = flowsheetObservations.find((observation) => observation.id === 'hr');
    return (
      <div className="max-w-sm">
        {heartRate && (
          <ObservationTrend observation={heartRate} values={flowsheetValues} timeZone="UTC" />
        )}
      </div>
    );
  },
};

/** ReferenceValue on its own, here in a DescriptionList, with the reference range under each value. */
export const ReferenceValues: Story = {
  render: () => (
    <DescriptionList
      items={[
        {
          id: 'k',
          label: 'Potassium',
          value: (
            <ReferenceValue
              value={6.4}
              unit="mmol/L"
              referenceRange={{ low: 3.5, high: 5.1 }}
              criticalRange={{ low: 2.8, high: 6.2 }}
              formatOptions={{ minimumFractionDigits: 1 }}
              hasRange
            />
          ),
        },
        {
          id: 'na',
          label: 'Sodium',
          value: (
            <ReferenceValue
              value={133}
              unit="mmol/L"
              referenceRange={{ low: 135, high: 145 }}
              hasRange
            />
          ),
        },
        {
          id: 'glu',
          label: 'Glucose',
          value: (
            <ReferenceValue
              value={5.6}
              unit="mmol/L"
              referenceRange={{ low: 3.9, high: 7.8 }}
              formatOptions={{ minimumFractionDigits: 1 }}
              hasRange
            />
          ),
        },
        {
          id: 'culture',
          label: 'Culture',
          value: <ReferenceValue value="Positive" flag="A" note="Gram-positive cocci" />,
        },
      ]}
    />
  ),
};
