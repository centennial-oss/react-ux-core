// A design tool's layers for the Tree drag-and-drop stories and tests: two pages of frames, groups and shapes,
// three levels deep, with visibility and lock toggles.
import { Circle, Eye, EyeOff, File, Frame, Group, Lock, Square, Type, Unlock } from 'lucide-react';
import type { TreeNode, TreeRowToggle } from '../src/components/Tree';

export const demoLayers: TreeNode[] = [
  {
    id: 'page-1',
    label: 'Page 1',
    icon: File,
    children: [
      {
        id: 'header',
        label: 'Header',
        icon: Frame,
        children: [
          { id: 'logo', label: 'Logo', icon: Circle },
          { id: 'title', label: 'Title', icon: Type },
        ],
      },
      {
        id: 'hero',
        label: 'Hero',
        icon: Group,
        children: [
          { id: 'backdrop', label: 'Backdrop', icon: Square },
          { id: 'tagline', label: 'Tagline', icon: Type },
        ],
      },
    ],
  },
  {
    id: 'page-2',
    label: 'Page 2',
    icon: File,
    children: [{ id: 'footer', label: 'Footer', icon: Frame }],
  },
];

export const demoLayerToggles: readonly TreeRowToggle[] = [
  { id: 'visible', label: 'Visible', icon: Eye, offIcon: EyeOff, defaultValue: true },
  { id: 'locked', label: 'Locked', icon: Lock, offIcon: Unlock },
];
