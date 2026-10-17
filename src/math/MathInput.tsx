// MathInput: WYSIWYG formula entry on MathLive's <math-field> (an optional peer, loaded with a dynamic import when the
// first field mounts). Typing `/` makes a fraction and `^` a superscript, arrow keys move through the structure, and
// the value is TeX, so it renders with MathFormula and the app can check it. A palette toolbar inserts named
// templates, the mode limits what can be entered, plain TeX entry is always one toggle away, and on phones MathLive's
// maths keyboard replaces the system one.
//
// MathLive fetches nothing here: sounds are off, and its fonts load only from `fontsDirectory` (or are already on the
// page from `mathlive/fonts.css`). Without either, formulas use the system's fonts.

import { ArrowLeft, ArrowRight, Braces } from 'lucide-react';
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { Toolbar } from 'react-aria-components';
import type { MathfieldElement } from 'mathlive';
import { Button } from '../components/Button/Button';
import type { FieldBaseProps } from '../components/Field/Field';
import { FieldLayout } from '../components/Field/Field';
import { IconButton } from '../components/IconButton/IconButton';
import { InfoTip } from '../components/InfoTip/InfoTip';
import { TextField } from '../components/TextField/TextField';
import { cn } from '../utils/cn';
import { useControllableState } from '../utils/useControllableState';
import {
  keyboardLayouts,
  paletteFor,
  texText,
  type MathInputMode,
  type MathTemplate,
} from './mathPalette';
import { MathFormula } from './MathFormula';
import { useMathMessages } from './messages';

type MathLiveModule = typeof import('mathlive');

let mathLive: Promise<MathLiveModule> | undefined;
let configuredFonts: string | null | undefined;

/** Loads MathLive once, with sounds turned off so it never fetches them. */
function loadMathLive(): Promise<MathLiveModule> {
  mathLive ??= import('mathlive').then((module) => {
    module.MathfieldElement.soundsDirectory = null;
    module.MathfieldElement.plonkSound = null;
    module.MathfieldElement.keypressSound = null;
    return module;
  });
  return mathLive;
}

/** Applies the app's fonts directory (a static MathLive setting) before the first field renders. */
function configureFonts(module: MathLiveModule, fontsDirectory: string | null): void {
  if (configuredFonts !== fontsDirectory) {
    configuredFonts = fontsDirectory;
    module.MathfieldElement.fontsDirectory = fontsDirectory;
  }
}

/**
 * TeX in its usual spelling. MathLive writes single-digit fractions the short way (`\frac34`), which is valid TeX
 * but not what apps compare against, so they get their braces back.
 */
export function canonicalTex(tex: string): string {
  return tex.replace(/\\([dtc]?frac|[dt]?binom)(\d)(\d)/g, '\\$1{$2}{$3}');
}

/**
 * Puts focus back in the field after a palette press, so typing carries on there. It waits a frame: React Aria keeps
 * focus where it was for the length of a press, so focusing during the press handler would be undone.
 */
function returnFocus(field: MathfieldElement): void {
  requestAnimationFrame(() => {
    if (field.isConnected && !field.hidden) {
      field.focus();
    }
  });
}

/** The field's TeX, without MathLive's `\placeholder{}` markers for empty slots. */
function readValue(field: MathfieldElement): string {
  return canonicalTex(field.getValue('latex-without-placeholders'));
}

/**
 * MathLive's custom element, typed as a plain element for JSX (React passes the props on as attributes and its
 * properties are set in effects).
 */
const MathFieldTag = 'math-field' as unknown as 'div';

/** Themes MathLive from the tokens: its custom properties, its host box, and the hidden menu (whose text is MathLive's). */
const fieldClasses = [
  'block w-full min-w-0 min-h-hit rounded-control border border-border-strong bg-surface-2 px-3 py-2 text-lg text-fg',
  'outline-none focus-within:focus-ring',
  '[--caret-color:var(--color-fg)] [--primary-color:var(--color-accent-solid)]',
  '[--selection-background-color:var(--color-accent-bg)] [--selection-color:var(--color-fg)]',
  '[--contains-highlight-background-color:var(--color-surface-3)] [--placeholder-color:var(--color-fg-muted)] [--placeholder-opacity:1]',
  '[--smart-fence-color:var(--color-fg-muted)] [--text-font-family:var(--font-sans)]',
  '[&::part(placeholder)]:text-fg-muted [&::part(menu-toggle)]:hidden',
].join(' ');

export interface MathInputProps extends FieldBaseProps {
  /** TeX, controlled. */
  value?: string;
  /** TeX, uncontrolled. */
  defaultValue?: string;
  onChange?: (tex: string) => void;
  /** A toolbar of named templates (fraction, root, power, integral, Greek letters…) that insert into the field. */
  hasPalette?: boolean;
  /**
   * Limits entry: `arithmetic` allows no exponents, subscripts or TeX commands (for younger students); `algebra`,
   * `calculus` and `full` offer more of the palette and the maths keyboard. Defaults to `full`.
   */
  mode?: MathInputMode;
  /** Plain text shown while the field is empty. */
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  /** Offers a toggle to edit the TeX in a plain text field. Defaults to true. */
  hasTexToggle?: boolean;
  /**
   * When MathLive's maths keyboard appears: `auto` shows it on touch devices when the field takes focus (replacing the
   * system keyboard), `manual` only from its toggle. Defaults to `auto`.
   */
  virtualKeyboardPolicy?: 'auto' | 'manual';
  /**
   * Where MathLive's KaTeX fonts are served from, such as `/mathlive-fonts` (copy `node_modules/mathlive/fonts`
   * there). It's a page-wide MathLive setting that takes effect for the first field rendered, so give every field the
   * same value. Defaults to `null`, which fetches nothing: import `mathlive/fonts.css` instead, or formulas use the
   * system's fonts.
   */
  fontsDirectory?: string | null;
  'aria-label'?: string;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

/** A formula field that edits TeX visually, with an optional palette of templates. */
export function MathInput({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  value: valueProp,
  defaultValue,
  onChange,
  hasPalette = false,
  mode = 'full',
  placeholder,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  isInvalid = false,
  hasTexToggle = true,
  virtualKeyboardPolicy = 'auto',
  fontsDirectory = null,
  'aria-label': ariaLabel,
  className,
  ref,
}: MathInputProps) {
  const messages = useMathMessages();
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const fieldRef = useRef<MathfieldElement | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [isTex, setTex] = useState(false);
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const showsError = isInvalid && errorMessage !== undefined && errorMessage !== null;
  const describedBy =
    [description !== undefined && descriptionId, showsError && errorId].filter(Boolean).join(' ') ||
    undefined;

  const onFieldInput = useEffectEvent((tex: string) => {
    // While the TeX is edited as text, the hidden field follows it rather than leading.
    if (tex !== value && !isTex) {
      setValue(tex);
    }
  });
  const currentValue = useEffectEvent(() => value);

  // Load MathLive (once per page) and configure it before the first <math-field> exists, so its defaults never fetch.
  useEffect(() => {
    let isCurrent = true;
    loadMathLive().then(
      async (module) => {
        configureFonts(module, fontsDirectory);
        await customElements.whenDefined('math-field');
        if (isCurrent) {
          setLoaded(true);
        }
      },
      () => {
        // Without MathLive the field stays in its loading state; plain TeX entry still works.
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [fontsDirectory]);

  // Wire the field once it exists.
  useEffect(() => {
    const field = fieldRef.current;
    if (!isLoaded || !field) {
      return;
    }
    const onInput = () => {
      onFieldInput(readValue(field));
    };
    field.value = currentValue();
    field.addEventListener('input', onInput);
    return () => {
      field.removeEventListener('input', onInput);
    };
  }, [isLoaded]);

  // A new value from the app replaces the field's content (without echoing an input event).
  useEffect(() => {
    const field = fieldRef.current;
    if (isLoaded && field && readValue(field) !== value) {
      field.setValue(value, { silenceNotifications: true });
    }
  }, [isLoaded, value]);

  // Options that follow the props.
  useEffect(() => {
    const field = fieldRef.current;
    if (!isLoaded || !field) {
      return;
    }
    field.readOnly = isReadOnly;
    field.disabled = isDisabled;
    // Focus lands on MathLive's text box inside its shadow root, which ids outside can't reach, so it gets the
    // required and invalid states and the description and error as text (the host keeps aria-describedby too).
    const sink = field.shadowRoot?.querySelector('[part="keyboard-sink"]');
    const setSinkAttribute = (name: string, attributeValue: string | undefined) => {
      if (attributeValue) {
        sink?.setAttribute(name, attributeValue);
      } else {
        sink?.removeAttribute(name);
      }
    };
    const describedText = (describedBy ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .filter(Boolean)
      .join(' ');
    setSinkAttribute('aria-required', isRequired ? 'true' : undefined);
    setSinkAttribute('aria-invalid', showsError ? 'true' : undefined);
    setSinkAttribute('aria-description', describedText || undefined);
    field.mathVirtualKeyboardPolicy = virtualKeyboardPolicy;
    field.placeholder = placeholder === undefined ? '' : texText(placeholder);
    const isArithmetic = mode === 'arithmetic';
    field.scriptDepth = isArithmetic ? 0 : Infinity;
    if (isArithmetic) {
      field.inlineShortcuts = {};
    }
    // Arithmetic stays in maths: no switching to TeX command or text entry.
    const onModeChange = (event: Event) => {
      if (isArithmetic && field.mode !== 'math') {
        event.preventDefault();
      }
    };
    // MathLive's keyboard is shared by the page, so each field sets its layouts when it takes focus.
    const onFocus = () => {
      window.mathVirtualKeyboard.layouts = keyboardLayouts[mode] as never;
    };
    field.addEventListener('mode-change', onModeChange);
    field.addEventListener('focusin', onFocus);
    return () => {
      field.removeEventListener('mode-change', onModeChange);
      field.removeEventListener('focusin', onFocus);
    };
  }, [
    isLoaded,
    isReadOnly,
    isDisabled,
    isRequired,
    showsError,
    describedBy,
    description,
    errorMessage,
    virtualKeyboardPolicy,
    placeholder,
    mode,
  ]);

  const applyTemplate = (template: MathTemplate) => {
    const field = fieldRef.current;
    if (!field || !isLoaded) {
      return;
    }
    if (template.command) {
      field.executeCommand(template.command);
    } else {
      field.insert(template.insert, { format: 'latex', selectionMode: 'placeholder' });
    }
    returnFocus(field);
    const next = readValue(field);
    if (next !== value) {
      setValue(next);
    }
  };
  const move = (command: 'moveToPreviousChar' | 'moveToNextChar') => {
    const field = fieldRef.current;
    if (!field || !isLoaded) {
      return;
    }
    field.executeCommand(command);
    returnFocus(field);
  };

  const isEditable = !isDisabled && !isReadOnly;
  const labelElement: ReactNode =
    label !== undefined ? (
      <div className="flex min-w-0 items-center gap-1">
        <span id={labelId} className="font-medium text-fg">
          {label}
          {isRequired && (
            <span aria-hidden="true" className="ms-0.5 text-danger-fg">
              *
            </span>
          )}
        </span>
        {infoTip !== undefined && <InfoTip>{infoTip}</InfoTip>}
      </div>
    ) : null;

  const palette = hasPalette && isEditable && !isTex && (
    <Toolbar
      aria-label={messages.mathPalette}
      className="flex flex-wrap items-center gap-1"
      data-math-palette=""
    >
      {paletteFor(mode).map((template) => (
        <Button
          key={template.id}
          variant="outline"
          size="sm"
          data-template={template.id}
          isDisabled={!isLoaded}
          onPress={() => {
            applyTemplate(template);
          }}
          className="min-w-10 px-2"
        >
          {/* The name is text (not aria-label), so the face's symbols needn't match it. */}
          <span className="sr-only">{template.label(messages)}</span>
          <span aria-hidden="true" className="pointer-events-none">
            <MathFormula tex={template.face} />
          </span>
        </Button>
      ))}
      <IconButton
        icon={ArrowLeft}
        aria-label={messages.paletteMoveLeft}
        variant="outline"
        size="sm"
        isDisabled={!isLoaded}
        onPress={() => {
          move('moveToPreviousChar');
        }}
      />
      <IconButton
        icon={ArrowRight}
        aria-label={messages.paletteMoveRight}
        variant="outline"
        size="sm"
        isDisabled={!isLoaded}
        onPress={() => {
          move('moveToNextChar');
        }}
      />
    </Toolbar>
  );

  return (
    <div
      ref={ref}
      className={cn('group/field @container flex min-w-0 flex-col text-sm text-fg', className)}
      data-invalid={showsError ? '' : undefined}
      data-disabled={isDisabled ? '' : undefined}
      data-readonly={isReadOnly ? '' : undefined}
    >
      <FieldLayout labelPosition={labelPosition} label={labelElement}>
        {palette}
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            {isLoaded ? (
              <MathFieldTag
                ref={fieldRef as unknown as Ref<HTMLDivElement>}
                aria-labelledby={label !== undefined ? labelId : undefined}
                aria-label={label === undefined ? ariaLabel : undefined}
                aria-describedby={describedBy}
                aria-invalid={showsError ? 'true' : undefined}
                data-math-status="ready"
                hidden={isTex || undefined}
                className={cn(
                  fieldClasses,
                  showsError && 'border-danger-solid',
                  isDisabled && 'opacity-50',
                  isReadOnly && 'bg-surface-1',
                )}
              />
            ) : (
              // MathLive is loading: an empty box of the same size.
              <div
                data-math-status="loading"
                aria-hidden="true"
                className={cn(fieldClasses, isTex && 'hidden')}
              />
            )}
            {isTex && (
              <TextField
                aria-labelledby={label !== undefined ? labelId : undefined}
                aria-label={label === undefined ? ariaLabel : undefined}
                description={messages.mathTexSourceHint}
                value={value}
                onChange={setValue}
                isDisabled={isDisabled}
                isReadOnly={isReadOnly}
                isRequired={isRequired}
                className="[&_input]:font-mono"
              />
            )}
          </div>
          {hasTexToggle && (
            <IconButton
              icon={Braces}
              aria-label={messages.mathEditAsTex}
              isSelected={isTex}
              onChange={setTex}
              variant="ghost"
              isDisabled={isDisabled}
              className="pointer-coarse:size-11"
            />
          )}
        </div>
        {description !== undefined && (
          <span id={descriptionId} className="text-xs text-fg-muted">
            {description}
          </span>
        )}
        {showsError && (
          <span id={errorId} className="text-xs font-medium text-danger-fg">
            {typeof errorMessage === 'function' ? null : errorMessage}
          </span>
        )}
      </FieldLayout>
    </div>
  );
}
