import { expect } from 'vitest';

/**
 * Waits until `count` (a render or commit counter) stops changing for `quietMs`, so a test measures only what its own
 * action causes. Stray work (observers catching up, lazy parts arriving) runs late on a busy CI runner, so a fixed
 * sleep isn't enough.
 */
export async function settleCount(count: () => number, quietMs = 200): Promise<void> {
  await expect
    .poll(async () => {
      const before = count();
      await new Promise((resolve) => setTimeout(resolve, quietMs));
      return count() - before;
    })
    .toBe(0);
}
