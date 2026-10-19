// TeX to MathML through Temml (the /math entry's optional peer). Temml 0.14's ES build already contains the mhchem
// extension (\ce, \pu), so chemistry costs no extra download; `hasChemistry` is an opt-in gate instead, so a stray
// `\ce` in ordinary maths is reported rather than silently rendered. Temml never trusts \href, \url or \html (no
// `trust` option is passed), so its output is safe to insert as HTML.
import temml from 'temml';

export interface TexToMathMLOptions {
  /** `block` renders display-style maths (`<math display="block">`). Defaults to `inline`. */
  display?: 'inline' | 'block';
  /** Allows `\ce{…}` and `\pu{…}` (mhchem) for chemical formulas and equations. Defaults to false. */
  hasChemistry?: boolean;
  /** Lets long inline formulas wrap at top-level operators. Defaults to true for inline, false for block. */
  shouldWrap?: boolean;
  /** Macros available to the formula, such as `{ '\\R': '\\mathbb{R}' }`. */
  macros?: Readonly<Record<string, string>>;
  /**
   * Adds the TeX source as an `<annotation encoding="application/x-tex">`, for tools that read it back. Defaults to
   * false: browsers include annotation text in accessible names and descriptions built from the formula.
   */
  hasAnnotation?: boolean;
}

/** Why a formula didn't convert: a TeX syntax error, or chemistry used without `hasChemistry`. */
export type MathErrorReason = 'syntax' | 'chemistry';

/** Thrown by `texToMathML` when the TeX can't be converted. `message` is the parser's own (English) message. */
export class MathSyntaxError extends Error {
  readonly reason: MathErrorReason;
  constructor(message: string, reason: MathErrorReason) {
    super(message);
    this.name = 'MathSyntaxError';
    this.reason = reason;
  }
}

const chemistryCommand = /\\(?:ce|pu)(?![A-Za-z])/;

/** Whether `tex` uses mhchem's `\ce` or `\pu`. */
export function usesChemistry(tex: string): boolean {
  return chemistryCommand.test(tex);
}

/**
 * Converts TeX math to a MathML string (`<math>…</math>`), for rendering outside React (e-mail, PDFs, server
 * output). Throws a `MathSyntaxError` when the TeX doesn't parse.
 */
export function texToMathML(tex: string, options: TexToMathMLOptions = {}): string {
  const {
    display = 'inline',
    hasChemistry = false,
    shouldWrap = display === 'inline',
    macros,
    hasAnnotation = false,
  } = options;
  if (!hasChemistry && usesChemistry(tex)) {
    throw new MathSyntaxError('\\ce and \\pu need hasChemistry.', 'chemistry');
  }
  try {
    return temml.renderToString(tex, {
      displayMode: display === 'block',
      annotate: hasAnnotation,
      throwOnError: true,
      wrap: shouldWrap ? 'tex' : 'none',
      // Temml adds to the macros object it's given (\gdef), so each conversion gets its own copy.
      macros: macros ? { ...macros } : {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new MathSyntaxError(message.replace(/^\s*ParseError:\s*/, '').trim(), 'syntax');
  }
}

/** A conversion's result: the MathML, or why it failed. */
export type MathConversion =
  { isOk: true; mathml: string } | { isOk: false; reason: MathErrorReason; message: string };

// Recent conversions, so the same formula on several pages (or re-renders with a new options object) converts once.
const cache = new Map<string, MathConversion>();
const CACHE_SIZE = 500;

/** `texToMathML` that returns failures instead of throwing, cached by TeX and options. */
export function convertTex(tex: string, options: TexToMathMLOptions = {}): MathConversion {
  const key = JSON.stringify([
    tex,
    options.display ?? 'inline',
    options.hasChemistry ?? false,
    options.shouldWrap ?? null,
    options.macros ?? null,
    options.hasAnnotation ?? false,
  ]);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  let result: MathConversion;
  try {
    result = { isOk: true, mathml: texToMathML(tex, options) };
  } catch (error) {
    result =
      error instanceof MathSyntaxError
        ? { isOk: false, reason: error.reason, message: error.message }
        : { isOk: false, reason: 'syntax', message: String(error) };
  }
  if (cache.size >= CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(key, result);
  return result;
}
