import type { ReactNode, Ref } from 'react';
import { Link as AriaLink, type LinkProps as AriaLinkProps } from 'react-aria-components';
import { useLinkComponent, useTimeZone } from '../provider/context';
import { cn } from '../utils/cn';
import type { FooterLink } from './types';
import { useShellMessages } from './messages';

export interface FooterProps {
  /** The app's version, for example from its package. */
  version?: string;
  /** A build id or commit. */
  build?: string;
  /** Shows which time zone times are in (`UIProvider`'s `timeZone`). Defaults to true. */
  hasTimeZoneNote?: boolean;
  links?: readonly FooterLink[];
  /** More content, at the end. */
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** The bottom of the app: version and build, the time zone times are shown in, and links. */
export function Footer({
  version,
  build,
  hasTimeZoneNote = true,
  links = [],
  children,
  className,
  ref,
}: FooterProps) {
  const messages = useShellMessages();
  const timeZone = useTimeZone();
  const LinkComponent = useLinkComponent();
  const render: NonNullable<AriaLinkProps['render']> = (props) =>
    'href' in props ? <LinkComponent {...props} /> : <span {...props} />;
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-xs text-fg-muted sm:px-6',
        className,
      )}
    >
      {(version !== undefined || build !== undefined) && (
        <p className="flex gap-3 tabular-nums">
          {version !== undefined && <span>{messages.version({ version })}</span>}
          {build !== undefined && <span>{messages.build({ build })}</span>}
        </p>
      )}
      {hasTimeZoneNote && <p>{messages.timeZoneNote({ zone: timeZone })}</p>}
      {links.length > 0 && (
        <nav aria-label={messages.footerLinks} className="sm:ms-auto">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {links.map((link) => (
              <li key={link.id}>
                <AriaLink
                  href={link.href}
                  render={render}
                  className="hit-area rounded-sm underline-offset-2 outline-none data-focus-visible:focus-ring data-hovered:text-fg data-hovered:underline"
                >
                  {link.label}
                </AriaLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children}
    </div>
  );
}
