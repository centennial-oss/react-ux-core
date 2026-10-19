// CidrField: one IPv4 or IPv6 block. It validates as you go (errors wait until you leave the field), clears host
// bits and expands bare addresses on blur with an announced note, and shows the range and address count.
import { TriangleAlert } from 'lucide-react';
import { useId, useState, type ReactNode, type Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import { joinIds } from '../../utils/aria';
import { cn } from '../../utils/cn';
import { useNumberFormat } from '../../utils/intl';
import { useControllableState } from '../../utils/useControllableState';
import { LiveRegion } from '../LiveRegion/LiveRegion';
import { TextField, type TextFieldProps } from '../TextField/TextField';
import { maxPrefix, parseCidr, type Cidr, type CidrFamily, type CidrParseResult } from './cidr';
import { defaultCidrFieldMessages, type CidrFieldMessages } from './messages';

export interface CidrFieldProps extends Omit<
  TextFieldProps,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'prefix' | 'suffix' | 'isClearable' | 'ref'
> {
  /** The block as text, controlled. */
  value?: string;
  defaultValue?: string;
  /** Called with the text as it's typed, and with the normalised block when the field loses focus. */
  onChange?: (cidr: string) => void;
  /** Which families are accepted. Defaults to `both`. */
  family?: CidrFamily;
  /** Accepts a bare address and turns it into a /32 or /128. Defaults to true. */
  allowsHost?: boolean;
  /** Shows the range and address count under the field. Defaults to true. */
  hasRangeInfo?: boolean;
  /** A warning under the field, in the warning tone, such as an overlap with another entry. Not an error. */
  warningMessage?: ReactNode;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

/** The error text for a failed parse. */
export function cidrErrorText(
  result: CidrParseResult,
  family: CidrFamily,
  messages: CidrFieldMessages,
): string | undefined {
  if (result.isValid) {
    return undefined;
  }
  switch (result.error) {
    case 'empty':
      return undefined;
    case 'invalidAddress':
      return messages.cidrInvalidAddress;
    case 'invalidPrefix':
      return messages.cidrInvalidPrefix({ max: maxPrefix(result.family ?? 'ipv4') });
    case 'missingPrefix':
      return messages.cidrMissingPrefix;
    case 'wrongFamily':
      return family === 'ipv6' ? messages.cidrIpv6Only : messages.cidrIpv4Only;
  }
}

/** The range line under a block ("10.0.0.0 – 10.255.255.255, 16,777,216 addresses"). */
export function useCidrRangeText(): (cidr: Cidr) => string {
  const messages = useEntryMessages(defaultCidrFieldMessages);
  const format = useNumberFormat();
  return (cidr) =>
    cidr.size === 1n
      ? messages.cidrSingleAddress({ address: cidr.firstAddress })
      : messages.cidrRange({
          first: cidr.firstAddress,
          last: cidr.lastAddress,
          count: format.format(cidr.size),
          size: cidr.size,
        });
}

/** An IPv4 or IPv6 CIDR block input that normalises, validates and shows the range. */
export function CidrField({
  value: valueProp,
  defaultValue,
  onChange,
  family = 'both',
  allowsHost = true,
  hasRangeInfo = true,
  warningMessage,
  description,
  errorMessage,
  isInvalid,
  placeholder,
  onBlur,
  className,
  ref,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: CidrFieldProps) {
  const infoId = useId();
  const messages = useEntryMessages(defaultCidrFieldMessages);
  const rangeText = useCidrRangeText();
  const [text, setText] = useControllableState(valueProp, defaultValue ?? '', onChange);
  // Errors wait while the user types, and show once they leave the field (or for a value set from outside).
  const [isEditing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const result = parseCidr(text, { family, allowsHost });
  const parseError = isEditing ? undefined : cidrErrorText(result, family, messages);
  const hasError = isInvalid === true || parseError !== undefined;

  const normalize = () => {
    setEditing(false);
    if (!result.isValid) {
      return;
    }
    const { cidr } = result;
    if (cidr.text === text.trim()) {
      return;
    }
    const from = text.trim();
    setText(cidr.text);
    setNote(
      cidr.hasHostBits
        ? messages.cidrNormalized({ from, to: cidr.text })
        : cidr.isBareAddress
          ? messages.cidrHostExpanded({ from, to: cidr.text })
          : '',
    );
  };

  // The range, note and warning change as the user types, so they live in an element of their own that's always
  // there and linked with aria-describedby (React Aria finds a field's description slot only when it mounts).
  const info: ReactNode[] = [];
  if (hasRangeInfo && result.isValid) {
    info.push(
      <span key="range" className="wrap-anywhere">
        {rangeText(result.cidr)}
      </span>,
    );
  }
  if (note !== '') {
    info.push(<span key="note">{note}</span>);
  }
  if (warningMessage !== undefined) {
    info.push(
      <span key="warning" className="flex items-start gap-1 font-medium text-warning-fg">
        <TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        <span className="min-w-0">{warningMessage}</span>
      </span>,
    );
  }

  return (
    <div ref={ref} className={cn('relative flex min-w-0 flex-col', className)}>
      <TextField
        {...rest}
        type="text"
        value={text}
        onChange={(next) => {
          setEditing(true);
          setNote('');
          setText(next);
        }}
        onBlur={(event) => {
          normalize();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            normalize();
          }
          rest.onKeyDown?.(event);
        }}
        inputMode="text"
        autoComplete="off"
        placeholder={placeholder ?? messages.cidrPlaceholder({ family })}
        isInvalid={hasError}
        errorMessage={isInvalid === true && errorMessage !== undefined ? errorMessage : parseError}
        description={description}
        aria-describedby={joinIds(ariaDescribedBy, infoId)}
      />
      <span id={infoId} className="mt-1.5 flex flex-col gap-0.5 text-xs text-fg-muted empty:hidden">
        {info}
      </span>
      <LiveRegion>{note}</LiveRegion>
    </div>
  );
}
