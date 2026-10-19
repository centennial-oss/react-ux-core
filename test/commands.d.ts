// Types for the custom browser commands defined in vite.config.ts.
import 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Taps the element matching `selector` with a real touch event (touch-enabled instances only). */
    tap: (selector: string) => Promise<void>;
    /** Holds the mouse button down on the element matching `selector` for `ms` milliseconds. */
    hold: (selector: string, ms: number) => Promise<void>;
  }
}
