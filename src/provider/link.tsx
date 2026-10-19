import type { AnchorHTMLAttributes, ComponentType, Ref } from 'react';

/**
 * Props the library passes to `LinkComponent`. They are ordinary anchor props (including event handlers from React
 * Aria) plus `ref`. A `LinkComponent` must render an `<a>`, spread every prop onto it, and attach `ref`.
 */
export type LinkComponentProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
};

/**
 * The component that renders links, so `href` props use the app's router. For React Router:
 *
 *   const AppLink = ({ href, ...props }: LinkComponentProps) => <RouterLink to={href} {...props} />;
 */
export type LinkComponentType = ComponentType<LinkComponentProps>;

/** The default `LinkComponent`: a plain anchor, for apps without client-side routing. */
export function DefaultLink({ children, ...props }: LinkComponentProps) {
  return <a {...props}>{children}</a>;
}
