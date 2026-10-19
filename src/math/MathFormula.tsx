// MathFormula: TeX notation rendered as native MathML (through Temml), which browsers lay out and screen readers read
// as maths, with no maths fonts or layout script. Colours come from the surrounding text, so formulas follow the
// theme. A formula that doesn't parse shows its source with the parser's message instead of failing the page.

import { useMemo, type ClipboardEvent, type ReactNode, type Ref } from 'react';
import { Code } from '../components/Code/Code';
import { InfoTip } from '../components/InfoTip/InfoTip';
import { ScrollRegion } from '../components/ScrollRegion/ScrollRegion';
import { cn } from '../utils/cn';
import { useIsOverflowing } from '../utils/useIsOverflowing';
import { useMathMessages } from './messages';
import { convertTex } from './tex';

/**
 * Styles for Temml's MathML, from its stylesheet: the maths font stack, column alignment in `aligned` and similar
 * environments (MathML Core has no `columnalign`; Chromium needs the -webkit- values), row spacing, line breaks in
 * long inline formulas (Chromium wraps flex items, not MathML), and small italic corrections. Tailwind's reset
 * removes the browser's MathML padding (table cells, fractions), so that comes back too.
 */
export const mathContentClasses = [
  "[&_math]:[font-family:'Cambria_Math','STIX_Two_Math','Noto_Sans_Math',math]",
  '[&_math]:font-normal [&_math]:not-italic [&_math]:[line-height:normal] [&_math]:[direction:ltr]',
  '[&_math:not(.tml-display)]:inline-flex [&_math:not(.tml-display)]:flex-wrap [&_math:not(.tml-display)]:items-baseline',
  '[&_math>mrow]:py-[0.5ex] [&_math_*]:border-current [&_mtd]:px-[0.4em] [&_mtd]:py-[0.5ex] [&_mfrac]:px-px',
  '[&_.tml-right]:text-right [&_.tml-right]:[text-align:-webkit-right]',
  '[&_.tml-left]:text-left [&_.tml-left]:[text-align:-webkit-left]',
  '[&_mtable.tml-jot>mtr>mtd]:py-[0.7ex] [&_mtable.tml-small_mtd]:py-[0.35ex]',
  '[&_.tml-sml-pad]:pl-[0.05em] [&_.tml-med-pad]:pl-[0.1em] [&_.tml-lrg-pad]:pl-[0.15em]',
].join(' ');

export interface MathFormulaProps {
  /** TeX source, such as `\frac{-b \pm \sqrt{b^2-4ac}}{2a}`. */
  tex: string;
  /** `inline` sits in running text; `block` is centred on its own line and can be numbered. Defaults to `inline`. */
  display?: 'inline' | 'block';
  /** An equation number or label for block formulas, such as "(3)", shown at the end of the line. */
  label?: string;
  /** The root's id, so text can link to a labelled block formula ("see equation (3)"). */
  id?: string;
  /** Enables `\ce{…}` and `\pu{…}` for chemical formulas and equations. Defaults to false. */
  hasChemistry?: boolean;
  /** Macros available to the formula, such as `{ '\\R': '\\mathbb{R}' }`. Pass a stable object. */
  macros?: Readonly<Record<string, string>>;
  /** Shown instead when the TeX doesn't parse. Defaults to the source as code in the danger tone. */
  fallback?: ReactNode;
  /** Text for assistive technology when the MathML's own speech isn't enough (rare). */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
  [data: `data-${string}`]: string | undefined;
}

/** A TeX formula as MathML, inline or as a (numbered) block. Copying it copies the TeX. */
export function MathFormula({
  tex,
  display = 'inline',
  label,
  id,
  hasChemistry = false,
  macros,
  fallback,
  'aria-label': ariaLabel,
  className,
  ref,
  ...rest
}: MathFormulaProps) {
  const messages = useMathMessages();
  const isBlock = display === 'block';
  const result = useMemo(
    () => convertTex(tex, { display, hasChemistry, macros }),
    [tex, display, hasChemistry, macros],
  );
  const [measureRef, isOverflowing] = useIsOverflowing({ axis: 'x', tolerance: 1 });

  // Copying the formula (or part of it) copies its TeX source, for pasting into other tools.
  const onCopy = (event: ClipboardEvent) => {
    event.clipboardData.setData('text/plain', tex);
    event.preventDefault();
  };

  let content: ReactNode;
  if (result.isOk) {
    const math = (
      <span
        // Temml's MathML: built from the TeX by the parser, never from raw HTML, and with links turned off.
        dangerouslySetInnerHTML={{ __html: result.mathml }}
        aria-hidden={ariaLabel !== undefined ? true : undefined}
        className={cn(isBlock && 'block w-max min-w-full')}
      />
    );
    content =
      ariaLabel !== undefined ? (
        <span role="math" aria-label={ariaLabel} className={cn(isBlock && 'block')}>
          {math}
        </span>
      ) : (
        math
      );
  } else {
    const errorText =
      result.reason === 'chemistry' ? messages.formulaChemistryDisabled : result.message;
    content = (
      <span className="inline-flex max-w-full flex-wrap items-center gap-1 align-middle">
        {fallback ?? <Code className="border-danger-border text-danger-fg">{tex}</Code>}
        <InfoTip title={messages.formulaError} aria-label={messages.formulaErrorDetails}>
          <span className="break-words whitespace-pre-line">{errorText}</span>
        </InfoTip>
      </span>
    );
  }

  if (!isBlock) {
    return (
      <span
        {...rest}
        ref={ref}
        id={id}
        onCopy={onCopy}
        data-math-display="inline"
        data-math-error={result.isOk ? undefined : ''}
        className={cn(mathContentClasses, className)}
      >
        {content}
      </span>
    );
  }

  const scrollClasses = 'min-w-0 flex-1 overflow-x-auto overflow-y-hidden text-center';
  return (
    <div
      {...rest}
      ref={ref as Ref<HTMLDivElement>}
      id={id}
      onCopy={onCopy}
      data-math-display="block"
      data-math-error={result.isOk ? undefined : ''}
      className={cn('my-4 flex min-w-0 items-center gap-4', mathContentClasses, className)}
    >
      {isOverflowing ? (
        // Long formulas scroll sideways inside a focusable region, never the page.
        <ScrollRegion
          ref={measureRef}
          aria-label={messages.formulaRegion({ label: label ?? '' })}
          className={cn(scrollClasses, 'rounded-none border-0 bg-transparent p-0 py-1')}
        >
          {content}
        </ScrollRegion>
      ) : (
        <div ref={measureRef} className={cn(scrollClasses, 'py-1')}>
          {content}
        </div>
      )}
      {label !== undefined && <span className="shrink-0 text-fg-muted tabular-nums">{label}</span>}
    </div>
  );
}
