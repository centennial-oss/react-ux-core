// Brand: an app's logo mark and name as a home link, for the Header's `brand` slot and the Sidebar's drawer header.
// The header takes any node for the brand; this gives it a consistent size, focus ring and touch target.
import type { Ref } from 'react';
import { useLinkComponent } from '../provider/context';
import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';
import { useShellMessages } from './messages';

export interface BrandProps {
  /** The product name, shown beside the mark (hidden on the narrowest screens when `isCompact`). */
  name: string;
  /** The logo mark. */
  icon: IconComponent;
  /** Where the brand links. */
  href: string;
  /** The link's accessible name. Defaults to the `brandHome` message ("<name> home"). */
  homeLabel?: string;
  /** Shows only the mark below 1024px wide (phones and tablets, where the header is crowded); the name stays for screen readers. */
  isCompact?: boolean;
  className?: string;
  ref?: Ref<HTMLAnchorElement>;
}

/** The app's mark and name, linking home. */
export function Brand({
  name,
  icon: Icon,
  href,
  homeLabel,
  isCompact,
  className,
  ref,
}: BrandProps) {
  const messages = useShellMessages();
  const Link = useLinkComponent();
  return (
    // The link component comes from UIProvider's context and is the same on every render.
    // eslint-disable-next-line react-hooks/static-components
    <Link
      ref={ref}
      href={href}
      aria-label={homeLabel ?? messages.brandHome({ name })}
      className={cn(
        'inline-flex min-h-hit items-center gap-2 rounded-control px-1 text-fg outline-none focus-visible:focus-ring',
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-control bg-accent-solid text-accent-on-solid shadow-raised">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className={cn('text-base font-semibold tracking-tight', isCompact && 'max-lg:sr-only')}>
        {name}
      </span>
    </Link>
  );
}
