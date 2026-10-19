// Clipboard helpers for tests.

/** Dispatches a paste of `text` on `element`, as the browser does (the default insertion isn't simulated). */
export function pasteText(element: Element, text: string): void {
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  element.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
  );
}

/** The text of the elements an element's `aria-describedby` points at, joined by spaces. */
export function describedText(element: Element): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}
