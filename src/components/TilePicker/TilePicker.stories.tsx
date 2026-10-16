import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BatteryCharging,
  Building2,
  Factory,
  Flame,
  Home,
  Sun,
  Warehouse,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { TileGrid, type TileOption, type TileRow } from './TileGrid';
import { TilePicker } from './TilePicker';

type IconTile = TileOption<{ icon: LucideIcon }>;

const tile = (id: string, label: string, icon: LucideIcon, keywords?: string[]): IconTile => ({
  id,
  label,
  data: { icon },
  ...(keywords ? { keywords } : {}),
});

const rows: TileRow<IconTile>[] = [
  {
    id: 'buildings',
    title: 'Buildings',
    items: [
      tile('home', 'Home', Home, ['house']),
      tile('office', 'Office', Building2),
      tile('factory', 'Factory', Factory, ['plant']),
      tile('warehouse', 'Warehouse', Warehouse),
    ],
  },
  {
    id: 'energy',
    title: 'Energy',
    items: [
      tile('solar', 'Solar', Sun, ['pv']),
      tile('wind', 'Wind', Wind),
      tile('battery', 'Battery', BatteryCharging, ['storage']),
      tile('gas', 'Gas', Flame),
    ],
  },
];

function renderTile(option: IconTile) {
  const Icon = option.data?.icon;
  return (
    <>
      {Icon && <Icon aria-hidden="true" className="size-5" />}
      <span className="w-full truncate text-center text-xs">{option.label}</span>
    </>
  );
}

const meta = {
  title: 'Inputs/TilePicker',
  component: TilePicker<IconTile>,
} satisfies Meta<typeof TilePicker<IconTile>>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The base of IconPicker and FlagPicker: rows with titles, tiles the app draws, and a search. Arrow keys move across
 * rows; `onChange` receives the option with its `data`.
 */
export const Open: Story = {
  tags: ['visual-page'],
  args: { rows, renderTile },
  render: () => (
    <div className="max-w-xs">
      <TilePicker
        label="Site type"
        rows={rows}
        renderTile={renderTile}
        searchLabel="Search site types"
        placeholder="None"
        defaultValue="solar"
        defaultOpen
      />
    </div>
  ),
};

/** TileGrid on its own, inline: the same rows and keyboard, without the trigger and popover. */
export const InlineGrid: Story = {
  args: { rows, renderTile },
  render: () => (
    <div className="max-w-sm">
      <TileGrid
        aria-label="Site type"
        rows={rows}
        renderTile={renderTile}
        selectionMode="single"
        defaultSelectedKeys={['factory']}
      />
    </div>
  ),
};
