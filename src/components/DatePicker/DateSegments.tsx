import { DateInput, DateSegment } from 'react-aria-components';
import { cn } from '../../utils/cn';
import { dateInputClasses, largeSegmentClasses, segmentClasses } from './styles';

export interface DateSegmentsProps {
  /** `start` or `end` inside a date range picker. */
  slot?: 'start' | 'end';
  /** Larger segments with touch-sized targets on phones. */
  isLarge?: boolean;
  className?: string;
}

/**
 * The segmented entry (month, day, year, hour…) of a date or time field. Each segment is its own spin button: type
 * digits, or use the arrow keys to step it.
 */
export function DateSegments({ slot, isLarge = false, className }: DateSegmentsProps) {
  return (
    <DateInput slot={slot} className={cn(dateInputClasses, className)}>
      {(segment) => (
        <DateSegment
          segment={segment}
          className={cn(segmentClasses, isLarge && largeSegmentClasses)}
        />
      )}
    </DateInput>
  );
}
