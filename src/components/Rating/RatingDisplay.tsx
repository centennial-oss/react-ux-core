// RatingDisplay: a rating to look at, not to set. One inline element (role img, named "3.7 out of 5") with the exact
// value filled, not focusable, and cheap enough for every row of a table or a list. For a read-only rating in a form,
// which stays in the tab order, use Rating with `isReadOnly`.

import { Star } from 'lucide-react';
import type { Ref } from 'react';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { Size, Tone } from '../../utils/types';
import { RatingIcons, useRatingValueText } from './RatingIcons';

export interface RatingDisplayProps {
  /** The rating; fractions fill exactly (3.7 fills 3.7 icons). `null` is no rating. */
  value: number | null;
  /** The highest rating: the number of icons. Defaults to 5. */
  maxValue?: number;
  /** Defaults to a star. */
  icon?: IconComponent;
  /** Defaults to `md`. */
  size?: Size;
  /** The filled icons' colour. Defaults to `warning` (gold). */
  tone?: Tone;
  /** `Intl.NumberFormat` options for the accessible name. Defaults to at most one decimal ("3.7 out of 5"). */
  formatOptions?: Intl.NumberFormatOptions;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/** A read-only star rating for tables, lists and summaries: the exact value filled, named "3.7 out of 5". */
export function RatingDisplay({
  value,
  maxValue = 5,
  icon = Star,
  size = 'md',
  tone = 'warning',
  formatOptions,
  className,
  ref,
}: RatingDisplayProps) {
  const valueText = useRatingValueText(value, maxValue, formatOptions);
  return (
    <span
      ref={ref}
      role="img"
      aria-label={valueText}
      className={cn('inline-flex w-max max-w-full items-center align-middle', className)}
    >
      <RatingIcons value={value ?? 0} maxValue={maxValue} icon={icon} size={size} tone={tone} />
    </span>
  );
}
