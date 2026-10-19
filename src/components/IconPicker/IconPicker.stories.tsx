import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BatteryCharging,
  Building2,
  Factory,
  Flame,
  Gauge,
  Home,
  Plug,
  Sun,
  Thermometer,
  Warehouse,
  Wind,
  Zap,
} from 'lucide-react';
import { IconPicker, type IconOption } from './IconPicker';

const icons: IconOption[] = [
  { id: 'home', label: 'Home', icon: Home, keywords: ['house', 'residential'] },
  { id: 'office', label: 'Office', icon: Building2, keywords: ['commercial'] },
  { id: 'factory', label: 'Factory', icon: Factory, keywords: ['industrial', 'plant'] },
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { id: 'solar', label: 'Solar', icon: Sun, keywords: ['pv'] },
  { id: 'wind', label: 'Wind', icon: Wind, keywords: ['turbine'] },
  { id: 'battery', label: 'Battery', icon: BatteryCharging, keywords: ['storage'] },
  { id: 'ev', label: 'EV charger', icon: Plug, keywords: ['car'] },
  { id: 'gas', label: 'Gas', icon: Flame },
  { id: 'meter', label: 'Meter', icon: Gauge },
  { id: 'hvac', label: 'HVAC', icon: Thermometer, keywords: ['heating', 'cooling'] },
  { id: 'power', label: 'Power', icon: Zap, keywords: ['electricity'] },
];

const meta = {
  title: 'Inputs/IconPicker',
  component: IconPicker,
  args: { icons },
} satisfies Meta<typeof IconPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Closed, with and without a choice. */
export const States: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-5">
      <IconPicker label="Site icon" icons={icons} defaultValue="factory" />
      <IconPicker label="Category icon" icons={icons} description="Shown on the map and in lists" />
    </div>
  ),
};

/** The searchable grid: type to filter (by name or keyword); arrow keys move in two dimensions. */
export const Open: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-xs">
      <IconPicker label="Site icon" icons={icons} defaultValue="solar" defaultOpen />
    </div>
  ),
};
