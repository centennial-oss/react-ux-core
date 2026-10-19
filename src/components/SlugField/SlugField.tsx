// SlugField: a URL slug that follows its source text (a title) until it's edited by hand. "Reset" makes it follow
// again. Typing is cleaned as you go (lower case, accents transliterated, hyphens), and an optional async `validate`
// (an availability check) runs debounced, with stale checks aborted.
import { Check, Link2, Link2Off, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import { joinIds } from '../../utils/aria';
import { cn } from '../../utils/cn';
import { useDebouncedCallback } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { Button } from '../Button/Button';
import { LiveRegion } from '../LiveRegion/LiveRegion';
import { SpinnerIcon } from '../Spinner/SpinnerIcon';
import { TextField, type TextFieldProps } from '../TextField/TextField';
import { defaultSlugFieldMessages } from './messages';
import { slugify, slugifyPartial } from './slugify';

export interface SlugFieldProps extends Omit<
  TextFieldProps,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'prefix'
  | 'suffix'
  | 'isClearable'
  | 'validate'
  | 'ref'
> {
  value?: string;
  defaultValue?: string;
  onChange?: (slug: string) => void;
  /** The text the slug comes from, such as a title. Until the slug is edited by hand, it follows this text. */
  source?: string;
  /** Shown before the input, such as "https://blog.example.com/posts/". Long prefixes are cut with an ellipsis. */
  prefix?: string;
  /**
   * Checks the slug, such as its availability, resolving to an error message or undefined. Runs `validateDelay` ms
   * after the slug stops changing; `signal` aborts when a newer check starts.
   */
  validate?: (slug: string, signal: AbortSignal) => Promise<string | undefined>;
  /** Milliseconds to wait before validating. Defaults to 400. */
  validateDelay?: number;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

interface CheckResult {
  slug: string;
  error?: string;
  /** The check itself failed (a network error), so nothing is known about the slug. */
  hasFailed: boolean;
}

/** A URL slug input derived from a source text, with optional async validation. */
export function SlugField({
  value: valueProp,
  defaultValue,
  onChange,
  source,
  prefix,
  validate,
  validateDelay = 400,
  description,
  errorMessage,
  isInvalid,
  maxLength,
  onBlur,
  className,
  ref,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: SlugFieldProps) {
  const messages = useEntryMessages(defaultSlugFieldMessages);
  const statusId = useId();
  const [slug, setSlug] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const sourceSlug = source === undefined ? undefined : slugify(source, { maxLength });
  const [isLinked, setLinked] = useState(
    () => sourceSlug !== undefined && (slug === '' || slug === sourceSlug),
  );
  const isFollowing = isLinked && sourceSlug !== undefined;

  // Follow the source while linked.
  useEffect(() => {
    if (isFollowing && sourceSlug !== slug) {
      setSlug(sourceSlug);
    }
  }, [isFollowing, sourceSlug, slug, setSlug]);

  // Validation: debounced, with the latest `validate` from a ref so an inline function doesn't restart it.
  const validateRef = useRef(validate);
  useEffect(() => {
    validateRef.current = validate;
  }, [validate]);
  const [result, setResult] = useState<CheckResult | null>(null);
  const checkedSlug = slugify(slug, { maxLength });
  const hasValidate = validate !== undefined;
  const { run: scheduleCheck, cancel: cancelCheck } = useDebouncedCallback(
    (text: string, signal: AbortSignal) => {
      const check = validateRef.current;
      if (!check) {
        return;
      }
      check(text, signal).then(
        (error) => {
          if (!signal.aborted) {
            setResult({ slug: text, error, hasFailed: false });
          }
        },
        () => {
          if (!signal.aborted) {
            setResult({ slug: text, hasFailed: true });
          }
        },
      );
    },
    validateDelay,
  );
  useEffect(() => {
    if (!hasValidate || checkedSlug === '') {
      return;
    }
    const controller = new AbortController();
    scheduleCheck(checkedSlug, controller.signal);
    return () => {
      controller.abort();
      cancelCheck();
    };
  }, [hasValidate, checkedSlug, scheduleCheck, cancelCheck]);

  const current = result?.slug === checkedSlug ? result : undefined;
  const isChecking = hasValidate && checkedSlug !== '' && current === undefined;
  const checkError = current?.error;
  const isAvailable = current !== undefined && !current.hasFailed && current.error === undefined;
  const hasError = isInvalid === true || checkError !== undefined;

  const hasStatus = sourceSlug !== undefined || hasValidate;
  const suffix = isChecking ? (
    <SpinnerIcon className="size-4" />
  ) : isAvailable ? (
    <Check aria-hidden="true" className="size-4 text-success-fg" />
  ) : undefined;

  return (
    <div ref={ref} className={cn('relative flex min-w-0 flex-col', className)}>
      <TextField
        {...rest}
        type="text"
        value={slug}
        maxLength={maxLength}
        onChange={(text) => {
          const next = slugifyPartial(text);
          if (next !== sourceSlug) {
            setLinked(false);
          }
          setSlug(next);
        }}
        onBlur={(event) => {
          const finished = slugify(slug, { maxLength });
          if (finished !== slug) {
            setSlug(finished);
          }
          onBlur?.(event);
        }}
        autoComplete="off"
        prefix={
          prefix === undefined ? undefined : (
            // The prefix runs into the slug, like the URL it is.
            <span className="-me-2.5 block max-w-[45cqw] truncate">{prefix}</span>
          )
        }
        suffix={suffix}
        description={description}
        aria-describedby={joinIds(ariaDescribedBy, hasStatus && statusId)}
        isInvalid={hasError}
        errorMessage={isInvalid === true && errorMessage !== undefined ? errorMessage : checkError}
      />
      {hasStatus && (
        <div className="mt-1.5 flex min-h-6 min-w-0 flex-wrap items-center justify-between gap-x-2">
          <span
            id={statusId}
            className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted"
          >
            {sourceSlug !== undefined && (
              <span className="inline-flex items-center gap-1">
                {isFollowing ? (
                  <Link2 aria-hidden="true" className="size-3.5 shrink-0" />
                ) : (
                  <Link2Off aria-hidden="true" className="size-3.5 shrink-0" />
                )}
                {isFollowing ? messages.slugLinked : messages.slugUnlinked}
              </span>
            )}
            {isChecking && <span>{messages.slugChecking}</span>}
          </span>
          {sourceSlug !== undefined && !isFollowing && (
            <Button
              variant="link"
              size="sm"
              icon={RotateCcw}
              aria-label={messages.slugResetLabel}
              isDisabled={rest.isDisabled === true || rest.isReadOnly === true}
              onPress={() => {
                setLinked(true);
              }}
            >
              {messages.slugReset}
            </Button>
          )}
        </div>
      )}
      <LiveRegion>{isAvailable ? messages.slugAvailable : (checkError ?? '')}</LiveRegion>
    </div>
  );
}
