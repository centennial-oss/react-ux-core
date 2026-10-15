import type { ComponentType } from 'react';

/**
 * An icon component, such as one from lucide-react (`icon={Save}`). Components take the component itself, never a
 * string name.
 */
export type IconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;
