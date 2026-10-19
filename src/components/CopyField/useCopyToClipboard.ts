// The copy-to-clipboard logic shared by CopyButton, CopyField and DescriptionList: write the text, flip to "copied"
// for a moment, and report failures (no clipboard permission, an insecure page) instead of failing silently.
import { useCallback, useState } from 'react';
import { useDeadlineTimer } from '../../utils/timers';

/** `copied` lasts `resetAfter` ms; `failed` lasts until the next attempt, so the error can be read. */
export type CopyStatus = 'idle' | 'copied' | 'failed';

export interface UseCopyToClipboardOptions {
  onCopy?: () => void;
  /** Called when the clipboard refuses the write. */
  onCopyError?: (error: unknown) => void;
  /** Milliseconds the `copied` status lasts. Defaults to 2000. */
  resetAfter?: number;
}

export interface CopyToClipboard {
  status: CopyStatus;
  /** Copies `text`, resolving to whether it worked. */
  copy: (text: string) => Promise<boolean>;
  /** Returns to `idle`. */
  reset: () => void;
}

/** Copies text to the clipboard and tracks whether it worked. */
export function useCopyToClipboard({
  onCopy,
  onCopyError,
  resetAfter = 2000,
}: UseCopyToClipboardOptions = {}): CopyToClipboard {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timer = useDeadlineTimer(() => {
    setStatus('idle');
  });

  const copy = useCallback(
    async (text: string) => {
      timer.clear();
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        setStatus('failed');
        onCopyError?.(error);
        return false;
      }
      setStatus('copied');
      timer.start(resetAfter);
      onCopy?.();
      return true;
    },
    [timer, resetAfter, onCopy, onCopyError],
  );
  const reset = useCallback(() => {
    timer.clear();
    setStatus('idle');
  }, [timer]);

  return { status, copy, reset };
}
