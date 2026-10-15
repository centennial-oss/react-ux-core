import { useSyncExternalStore } from 'react';

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    observer.disconnect();
  };
}

function themeSnapshot(): string {
  return document.documentElement.dataset.theme ?? '';
}

/**
 * The `data-theme` attribute on `<html>`, followed with a MutationObserver. UIProvider sets it after its children
 * render, so components that read theme tokens (CSS variables) key their reads on this to never be a theme behind.
 */
export function useThemeAttribute(): string {
  return useSyncExternalStore(subscribeToTheme, themeSnapshot, () => '');
}
