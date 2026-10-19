// Offering files to the user through a temporary download link, outside the app's router.

/** `fileName` with `extension` (such as ".csv") added unless it already ends with it, ignoring case. */
export function withExtension(fileName: string, extension: string): string {
  return fileName.toLowerCase().endsWith(extension.toLowerCase())
    ? fileName
    : `${fileName}${extension}`;
}

export interface SaveUrlOptions {
  /**
   * Opens the link in a new tab when the browser won't download it (a cross-origin file ignores `download`), rather
   * than navigating away from the app.
   */
  isNewTab?: boolean;
}

/** Saves `href` (a URL, object URL or data URL) under `fileName` through a temporary link. */
export function saveUrl(href: string, fileName: string, options: SaveUrlOptions = {}): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  if (options.isNewTab === true) {
    link.target = '_blank';
  }
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
}

/** Saves a Blob (or text, with its media type) as a file. */
export function saveBlob(data: Blob | string, fileName: string, type = 'text/plain'): void {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  saveUrl(url, fileName);
  // The download has started by the next task; revoke on the next frame after that.
  requestAnimationFrame(() => {
    URL.revokeObjectURL(url);
  });
}
