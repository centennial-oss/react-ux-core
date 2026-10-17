import type { Meta, StoryObj } from '@storybook/react-vite';
import { PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import { ListBox } from 'react-aria-components';
import { Button } from '../Button';
import { DescriptionList } from '../DescriptionList';
import { listBoxClasses, Option } from '../ListBox';
import { Heading, Text } from '../Text';
import { SplitView } from './SplitView';

const meta = {
  title: 'Display/SplitView',
  component: SplitView,
  parameters: { layout: 'padded' },
  args: { children: null },
} satisfies Meta<typeof SplitView>;
export default meta;
type Story = StoryObj<typeof meta>;

interface Planet {
  id: string;
  name: string;
  order: number;
  moons: number;
  day: string;
  note: string;
}

const planets: readonly Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    order: 1,
    moons: 0,
    day: '176 days',
    note: 'The smallest planet.',
  },
  { id: 'venus', name: 'Venus', order: 2, moons: 0, day: '117 days', note: 'The hottest planet.' },
  {
    id: 'earth',
    name: 'Earth',
    order: 3,
    moons: 1,
    day: '24 hours',
    note: 'The only one with oceans.',
  },
  { id: 'mars', name: 'Mars', order: 4, moons: 2, day: '24.6 hours', note: 'The red planet.' },
  {
    id: 'jupiter',
    name: 'Jupiter',
    order: 5,
    moons: 95,
    day: '9.9 hours',
    note: 'The largest planet.',
  },
];

function PlanetList({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <ListBox
      aria-label="Planets"
      items={planets}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[selected]}
      onSelectionChange={(keys) => {
        const [key] = keys === 'all' ? [] : keys;
        if (key !== undefined) {
          onSelect(String(key));
        }
      }}
      className={listBoxClasses}
    >
      {(planet) => <Option id={planet.id}>{planet.name}</Option>}
    </ListBox>
  );
}

function PlanetDetail({ id }: { id: string }) {
  const planet = planets.find((entry) => entry.id === id) ?? planets[0];
  if (!planet) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3 p-4">
      <Heading level={2}>{planet.name}</Heading>
      <Text variant="muted">{planet.note}</Text>
      <DescriptionList
        columns={1}
        items={[
          { id: 'order', label: 'Order from the Sun', value: planet.order },
          { id: 'moons', label: 'Moons', value: planet.moons },
          { id: 'day', label: 'Length of a day', value: planet.day },
        ]}
      />
    </div>
  );
}

/**
 * A list and detail view. Drag the handle (mouse or touch), or focus it and use the arrow keys, Home and End; Enter
 * or a double-click collapses the detail pane. In a container narrower than 48rem (phones), the detail moves into
 * a drawer that opens when a planet is chosen.
 */
export const ListAndDetail: Story = {
  render: function Render() {
    const [selected, setSelected] = useState('earth');
    const [isOpen, setOpen] = useState(false);
    const [isStacked, setStacked] = useState(false);
    return (
      <div className="flex h-96 flex-col gap-2">
        {isStacked && (
          <Button
            variant="outline"
            icon={PanelRightOpen}
            className="self-start"
            onPress={() => {
              setOpen(true);
            }}
          >
            Show details
          </Button>
        )}
        <div className="min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-1">
          <SplitView
            paneLabels={['Planets', 'Planet details']}
            defaultSizes={[35, 65]}
            minSizes={['10rem', '16rem']}
            collapsibleIndexes={[1]}
            isSecondaryOpen={isOpen}
            onSecondaryOpenChange={setOpen}
            onStackedChange={setStacked}
          >
            <PlanetList
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
                setOpen(true);
              }}
            />
            <PlanetDetail id={selected} />
          </SplitView>
        </div>
      </div>
    );
  },
};

/** Three panes, the first collapsible; the app keeps the sizes it's told about (shown under the view). */
export const ThreePanes: Story = {
  render: function Render() {
    const [sizes, setSizes] = useState([20, 35, 45]);
    return (
      <div className="flex flex-col gap-2">
        <div className="h-80 overflow-hidden rounded-card border border-border bg-surface-1">
          <SplitView
            paneLabels={['Observatories', 'Nights', 'Readings']}
            sizes={sizes}
            onSizesChange={setSizes}
            minSizes={[15, 20, 20]}
            collapsibleIndexes={[0]}
            secondaryPresentation="stack"
          >
            <div className="p-3 text-sm">Mauna Kea · La Palma · Paranal</div>
            <div className="p-3 text-sm">Clear nights this month: 18</div>
            <div className="p-3 text-sm">Seeing 0.6″ · Humidity 12% · Wind 4 m/s</div>
          </SplitView>
        </div>
        <Text variant="small">{`Sizes: ${sizes.map((size) => `${String(Math.round(size))}%`).join(' · ')}`}</Text>
      </div>
    );
  },
};

/** Top and bottom panes, such as notes over a log. It stays split at every width (`stackBelow="0px"`). */
export const Vertical: Story = {
  render: () => (
    <div className="h-96 overflow-hidden rounded-card border border-border bg-surface-1">
      <SplitView
        orientation="vertical"
        paneLabels={['Notes', 'Log']}
        defaultSizes={[65, 35]}
        minSizes={['6rem', '4rem']}
        secondaryPresentation="stack"
        stackBelow="0px"
      >
        <div className="p-3 text-sm">Observation notes for the night of the transit.</div>
        <pre className="p-3 font-mono text-xs text-fg-muted">
          {'21:04 dome open\n21:10 focus check passed\n21:32 target acquired'}
        </pre>
      </SplitView>
    </div>
  ),
};
