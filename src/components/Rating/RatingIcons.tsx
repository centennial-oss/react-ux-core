// The pieces Rating and RatingDisplay share: the drawn icons and the value in words.

import { useEntryMessages } from '../../provider/context';
import { ratingStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useNumberFormat } from '../../utils/intl';
import { toneTextClasses } from '../../utils/toneClasses';
import type { Size, Tone } from '../../utils/types';
import { iconFill } from './ratingMath';

export const iconSizes: Record<Size, string> = { sm: 'size-4', md: 'size-5', lg: 'size-7' };

const defaultFormatOptions: Intl.NumberFormatOptions = { maximumFractionDigits: 1 };

/**
 * The icons: a full icon drawn filled, an empty one outlined, and a part-filled one outlined under a filled copy
 * clipped to its share of the value. Each icon is one svg, two only for the part-filled one.
 */
export function RatingIcons({
  value,
  maxValue,
  icon: Icon,
  size,
  tone,
  slotClassName,
}: {
  value: number;
  maxValue: number;
  icon: IconComponent;
  size: Size;
  tone: Tone;
  slotClassName?: string;
}) {
  const sizeClass = iconSizes[size];
  const filledClass = cn(sizeClass, 'fill-current', toneTextClasses[tone]);
  return Array.from({ length: maxValue }, (_, index) => {
    const fill = iconFill(value, index);
    return (
      <span key={index} className={cn('relative shrink-0', slotClassName)}>
        {fill === 1 ? (
          <Icon aria-hidden="true" className={filledClass} />
        ) : (
          <Icon aria-hidden="true" className={cn(sizeClass, 'text-border-strong')} />
        )}
        {fill > 0 && fill < 1 && (
          // Clipped from the start edge, so a part-filled icon fills from the right in right-to-left text.
          <span
            className="absolute inset-y-0 start-0 overflow-hidden"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the filled part of the icon
            style={{ width: `${String(fill * 100)}%` }}
          >
            <Icon aria-hidden="true" className={filledClass} />
          </span>
        )}
      </span>
    );
  });
}

/** The value in words: "3.5 out of 5", or "No rating". */
export function useRatingValueText(
  value: number | null,
  maxValue: number,
  formatOptions: Intl.NumberFormatOptions | undefined,
): string {
  const messages = useEntryMessages(ratingStrings);
  const format = useNumberFormat(formatOptions ?? defaultFormatOptions);
  return value === null
    ? messages.ratingNone
    : messages.ratingValue({ value: format.format(value), max: format.format(maxValue) });
}
