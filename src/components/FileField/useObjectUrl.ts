// An object URL (`blob:`) for a File or Blob, made while the component shows it and revoked when the blob changes or
// the component unmounts, so previews of chosen files don't leak memory.

import { useEffect, useState } from 'react';

/**
 * A `blob:` URL for `blob` (undefined until it's made, and when there's no blob). It's revoked when `blob` changes and
 * on unmount.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    setEntry({ blob, url });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);
  // A URL made for an earlier blob is never shown for a new one (it may already be revoked).
  return entry && entry.blob === blob ? entry.url : undefined;
}
