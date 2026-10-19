// The counter under TextField and TextArea: "count / maxLength", and with `recommendedLength` a warning tone (never an
// error) once the text is longer than recommended, such as an SEO title past about 60 characters.
import { TriangleAlert } from 'lucide-react';
import { useEntryMessages } from '../../provider/context';
import { textFieldStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { LiveRegion } from '../LiveRegion/LiveRegion';
import { defaultTextFieldMessages } from './messages';

// Its own defaults plus the core character-count string.
const characterCountStrings = { ...textFieldStrings, ...defaultTextFieldMessages };

export interface CharacterCountOptions {
  count: number;
  maxLength?: number;
  recommendedLength?: number;
  hasCharacterCount: boolean;
}

/**
 * Whether the counter shows: with `hasCharacterCount` and a limit (`maxLength` or `recommendedLength`), and always
 * once the text is past the recommended length.
 */
export function characterCountState({
  count,
  maxLength,
  recommendedLength,
  hasCharacterCount,
}: CharacterCountOptions) {
  const isOver = recommendedLength !== undefined && count > recommendedLength;
  const isShown =
    isOver || (hasCharacterCount && (maxLength !== undefined || recommendedLength !== undefined));
  return { isShown, isOver };
}

/** The counter, linked to the input with aria-describedby through `id`. */
export function CharacterCount({
  id,
  count,
  maxLength,
  recommendedLength,
  isOver,
}: {
  id: string;
  count: number;
  maxLength?: number;
  recommendedLength?: number;
  isOver: boolean;
}) {
  const messages = useEntryMessages(characterCountStrings);
  const recommended = recommendedLength ?? 0;
  const text = isOver
    ? maxLength === undefined
      ? messages.overRecommendedLength({ count, recommended })
      : messages.overRecommendedWithMax({ count, max: maxLength, recommended })
    : maxLength === undefined
      ? messages.recommendedCharacterCount({ count, recommended })
      : messages.characterCount({ count, max: maxLength });
  return (
    <span
      id={id}
      data-over-recommended={isOver || undefined}
      className={cn(
        'inline-flex items-center gap-1 self-end text-xs tabular-nums',
        isOver ? 'font-medium text-warning-fg' : 'text-fg-muted',
      )}
    >
      {isOver && <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />}
      {text}
    </span>
  );
}

/** Announces crossing the recommended length once (its text doesn't change while the text stays too long). */
export function RecommendedLengthAnnouncer({
  recommendedLength,
  isOver,
}: {
  recommendedLength?: number;
  isOver: boolean;
}) {
  const messages = useEntryMessages(characterCountStrings);
  if (recommendedLength === undefined) {
    return null;
  }
  return (
    <LiveRegion>
      {isOver ? messages.recommendedLengthExceeded({ recommended: recommendedLength }) : ''}
    </LiveRegion>
  );
}
