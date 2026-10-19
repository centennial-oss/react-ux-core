// SecretReveal: credentials shown exactly once (a new API key and secret, a device password, recovery codes), masked
// until revealed, with a copy button per value and a warning that they won't be shown again.
import { Copy, Eye, EyeOff } from 'lucide-react';
import { useState, type Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import type { SecretRevealMessages } from '../../provider/messages';
import { cn } from '../../utils/cn';
import { Banner } from '../Banner/Banner';
import { useCopyToClipboard } from '../CopyField/useCopyToClipboard';
import { IconButton } from '../IconButton/IconButton';
import { toast } from '../Toast/toastStore';
import { Tooltip } from '../Tooltip/Tooltip';

/** English defaults of SecretReveal's strings (see `Messages`). */
export const defaultSecretRevealMessages: SecretRevealMessages = {
  secretsTitle: 'Copy these now',
  secretsWarning:
    'For your security, they won’t be shown again. Store them somewhere safe, such as a password manager.',
  showSecret: ({ label }) => `Show ${label}`,
  hideSecret: ({ label }) => `Hide ${label}`,
  copyValue: ({ label }) => `Copy ${label}`,
  valueCopied: ({ label }) => `${label} copied`,
  copyFailed: 'Couldn’t copy',
  copyFailedHint: 'Select the text and copy it instead.',
};

export interface SecretItem {
  id: string;
  label: string;
  value: string;
  /** Masked until the user reveals it. Defaults to true. */
  isSecret?: boolean;
}

export interface SecretRevealProps {
  items: readonly SecretItem[];
  /** The warning above the values. Defaults to the `secretsWarning` message. */
  warning?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Credentials shown once, with reveal and copy per value. */
export function SecretReveal({ items, warning, className, ref }: SecretRevealProps) {
  const messages = useEntryMessages(defaultSecretRevealMessages);
  return (
    <div ref={ref} className={cn('flex flex-col gap-4', className)}>
      <Banner tone="warning" title={messages.secretsTitle}>
        {warning ?? messages.secretsWarning}
      </Banner>
      <dl className="flex flex-col gap-3">
        {items.map((item) => (
          <SecretRow key={item.id} item={item} messages={messages} />
        ))}
      </dl>
    </div>
  );
}

function SecretRow({ item, messages }: { item: SecretItem; messages: SecretRevealMessages }) {
  const isSecret = item.isSecret ?? true;
  const [isShown, setShown] = useState(!isSecret);
  const clipboard = useCopyToClipboard();
  const copy = async () => {
    if (await clipboard.copy(item.value)) {
      toast.success({ title: messages.valueCopied({ label: item.label }) });
    } else {
      toast.error({ title: messages.copyFailed, description: messages.copyFailedHint });
    }
  };
  const showLabel = isShown
    ? messages.hideSecret({ label: item.label })
    : messages.showSecret({ label: item.label });
  const copyLabel = messages.copyValue({ label: item.label });
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-fg-muted">{item.label}</dt>
      <dd className="flex min-w-0 items-center gap-1 rounded-control border border-border bg-surface-3 ps-3">
        <code className="min-w-0 flex-1 truncate py-2 font-mono text-sm text-fg" aria-live="polite">
          {isShown ? item.value : '•'.repeat(Math.min(item.value.length, 32))}
        </code>
        {isSecret && (
          <Tooltip content={showLabel}>
            <IconButton
              icon={isShown ? EyeOff : Eye}
              aria-label={showLabel}
              onPress={() => {
                setShown(!isShown);
              }}
            />
          </Tooltip>
        )}
        <Tooltip content={copyLabel}>
          <IconButton icon={Copy} aria-label={copyLabel} onPress={() => void copy()} />
        </Tooltip>
      </dd>
    </div>
  );
}
