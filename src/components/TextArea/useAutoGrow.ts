import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { clamp } from '../../utils/math';

// Auto-grow is measured in script rather than with CSS `field-sizing: content`. Chromium and recent Safari support
// that property, but Firefox doesn't, so the measurement keeps every browser growing the same way (and testable in
// the Chromium test run). It runs without timers: synchronously after each value change (a layout effect, before
// paint) and when the textarea's width changes (a ResizeObserver), since a narrower box wraps text onto more lines.

/**
 * Sizes `textareaRef`'s element to its content, between `minRows` and `maxRows` lines; past `maxRows` it scrolls.
 * `frameRef` is the element around it, held at its current height while measuring so the page doesn't shrink and
 * jump its scroll position.
 */
export function useAutoGrow(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  frameRef: RefObject<HTMLElement | null>,
  value: string,
  minRows: number,
  maxRows: number,
): void {
  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const style = getComputedStyle(textarea);
    // `normal` line height has no number; approximate it the way browsers typically do.
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const chrome =
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);
    const minHeight = Math.max(1, minRows) * lineHeight + chrome;
    const maxHeight = Math.max(minRows, maxRows) * lineHeight + chrome;

    // Dynamic geometry: the height follows the content, so it's set on the element rather than through a class.
    const frame = frameRef.current;
    if (frame) {
      frame.style.minHeight = `${String(frame.offsetHeight)}px`;
    }
    textarea.style.height = `${String(minHeight)}px`;
    const contentHeight =
      textarea.scrollHeight +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);
    textarea.style.height = `${String(clamp(contentHeight, minHeight, maxHeight))}px`;
    textarea.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
    if (frame) {
      frame.style.minHeight = '';
    }
  }, [textareaRef, frameRef, minRows, maxRows]);

  useLayoutEffect(() => {
    resize();
  }, [resize, value]);

  const widthRef = useRef<number | null>(null);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width;
      if (width !== undefined && width !== widthRef.current) {
        widthRef.current = width;
        resize();
      }
    });
    observer.observe(textarea);
    return () => {
      observer.disconnect();
    };
  }, [textareaRef, resize]);
}
