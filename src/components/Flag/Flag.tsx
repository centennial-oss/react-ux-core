// Flag: a country's flag, found by code or name among the countries the app registered (FlagProvider), optionally with
// its name, native name, code or languages beside it.

import { Flag as FlagIcon } from 'lucide-react';
import { useMemo, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { cn } from '../../utils/cn';
import { listFormat } from '../../utils/intl';
import type { Size } from '../../utils/types';
import { flagImageSrc, type CountryInfo } from './countries';
import { useCountry, useFlags } from './FlagProvider';

/** What Flag can show beside the image. */
export type FlagDetail = 'name' | 'nativeName' | 'code' | 'languages';

const imageSizeClasses: Record<Size, string> = { sm: 'w-5', md: 'w-8', lg: 'w-12' };

/** A flag image at 4:3 with a hairline edge, so white flags show on white surfaces. Decorative unless `alt` is set. */
export function FlagImage({
  src,
  alt = '',
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      draggable={false}
      className={cn(
        'aspect-[4/3] shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_var(--color-border)]',
        className,
      )}
    />
  );
}

/** A country's languages by name in the user's locale, for example "French and German". */
export function useLanguageNames(country: CountryInfo | undefined): string {
  const { locale } = useLocale();
  return useMemo(() => {
    if (!country || country.languages.length === 0) {
      return '';
    }
    const names = new Intl.DisplayNames(locale, { type: 'language' });
    return listFormat(locale, { type: 'conjunction' }).format(
      country.languages.map((tag) => names.of(tag) ?? tag),
    );
  }, [country, locale]);
}

export interface FlagProps {
  /** The country's code (`fr`), English name (`France`) or native name. */
  country: string;
  /** Shown beside the flag, in this order. Defaults to none: the flag alone, named for screen readers. */
  details?: readonly FlagDetail[];
  /** Defaults to `md`. */
  size?: Size;
  /** Overrides FlagProvider's image path for this flag. */
  basePath?: string;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A country's flag from the registered countries (see FlagProvider), with any of its name, native name, code and
 * languages beside it. An unknown country shows a generic flag icon.
 */
export function Flag({ country, details = [], size = 'md', basePath, className, ref }: FlagProps) {
  const info = useCountry(country);
  const flags = useFlags();
  const languages = useLanguageNames(details.includes('languages') ? info : undefined);
  const describe = (detail: FlagDetail): string => {
    if (!info) {
      return detail === 'name' ? country : '';
    }
    switch (detail) {
      case 'name':
        return info.name;
      case 'nativeName':
        return info.nativeName;
      case 'code':
        return info.code.toUpperCase();
      case 'languages':
        return languages;
    }
  };
  const text = details
    .map((detail) => ({ detail, part: describe(detail) }))
    .filter(({ part }) => part !== '');
  // Named by its text when shown; otherwise the image (or icon) carries the name.
  const imageName = text.length > 0 ? '' : (info?.name ?? country);

  return (
    <span ref={ref} className={cn('inline-flex min-w-0 items-center gap-2 text-sm', className)}>
      {info ? (
        <FlagImage
          src={flagImageSrc(info, basePath ?? flags.basePath)}
          alt={imageName}
          className={imageSizeClasses[size]}
        />
      ) : (
        <FlagIcon
          role={imageName ? 'img' : undefined}
          aria-label={imageName || undefined}
          aria-hidden={imageName ? undefined : true}
          className={cn('shrink-0 text-fg-muted', imageSizeClasses[size], 'h-auto')}
        />
      )}
      {text.length > 0 && (
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          {text.map(({ detail, part }, index) => (
            <span
              key={detail}
              className={cn('truncate', index === 0 ? 'text-fg' : 'text-fg-muted')}
            >
              {part}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
