// Commands for the CommandPalette stories and tests: pages about planets and moons, a few actions, and an async
// search over lab readings.
import { Download, FlaskConical, Globe, Moon, Orbit, Plus, SunMoon, Telescope } from 'lucide-react';
import type { CommandItem } from '../src/components/CommandPalette';

export const demoCommands: CommandItem[] = [
  { id: 'mercury', label: 'Mercury', section: 'Pages', icon: Globe, href: '#mercury' },
  { id: 'venus', label: 'Venus', section: 'Pages', icon: Globe, href: '#venus' },
  { id: 'earth', label: 'Earth', section: 'Pages', icon: Globe, href: '#earth' },
  { id: 'earth-moon', label: 'Earth › Moon', section: 'Pages', icon: Moon, href: '#earth/moon' },
  { id: 'mars', label: 'Mars', section: 'Pages', icon: Globe, href: '#mars' },
  {
    id: 'mars-atmosphere',
    label: 'Mars › Atmosphere',
    section: 'Pages',
    icon: Orbit,
    href: '#mars/atmosphere',
  },
  {
    id: 'mars-moons',
    label: 'Mars › Moons',
    section: 'Pages',
    description: 'Phobos and Deimos',
    icon: Moon,
    keywords: ['phobos', 'deimos', 'satellites'],
    href: '#mars/moons',
  },
  {
    id: 'jupiter-moons',
    label: 'Jupiter › Moons',
    section: 'Pages',
    description: 'Io, Europa, Ganymede and Callisto',
    icon: Moon,
    keywords: ['galilean', 'satellites'],
    href: '#jupiter/moons',
  },
  {
    id: 'observatories',
    label: 'Observatories',
    section: 'Pages',
    icon: Telescope,
    href: '#observatories',
  },
  {
    id: 'new-observation',
    label: 'New observation',
    section: 'Actions',
    icon: Plus,
    shortcut: ['N'],
  },
  { id: 'export', label: 'Export readings', section: 'Actions', icon: Download },
  {
    id: 'theme',
    label: 'Switch theme',
    section: 'Actions',
    icon: SunMoon,
    keywords: ['dark', 'light', 'appearance'],
  },
];

const readings = Array.from({ length: 40 }, (_, index) => ({
  id: `reading-${String(1040 + index)}`,
  label: `Lab reading #${String(1040 + index)}`,
  section: 'Lab readings',
  description: `Spectrometer run ${String(index + 1)}`,
  icon: FlaskConical,
}));

/** Searches the lab readings by number or "reading", after `delayMs`; rejects with an AbortError when aborted. */
export function loadDemoReadings(
  query: string,
  signal: AbortSignal,
  delayMs = 300,
): Promise<CommandItem[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      resolve(
        readings
          .filter((reading) => words.some((word) => reading.label.toLowerCase().includes(word)))
          .slice(0, 5),
      );
    }, delayMs);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}
