import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Waits (up to 2 s) for finite animations, such as an overlay fading in, so axe doesn't measure colour contrast
 * mid-fade. Infinite animations (spinners) and scroll-driven ones (sheets) are ignored.
 */
async function settleAnimations(): Promise<void> {
  const pending = document
    .getAnimations()
    .filter(
      (animation) =>
        animation.timeline === document.timeline &&
        animation.playState === 'running' &&
        Number.isFinite(animation.effect?.getComputedTiming().iterations ?? 1),
    );
  await Promise.race([
    Promise.allSettled(pending.map((animation) => animation.finished)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}

/**
 * Fails the test if axe finds any accessibility violation in `container`. `disabledRules` turns off specific rules;
 * every use needs a justification at the call site.
 */
export async function expectNoAxeViolations(
  container: Element,
  { disabledRules = [] }: { disabledRules?: string[] } = {},
): Promise<void> {
  await settleAnimations();
  const results = await axe.run(container, {
    rules: Object.fromEntries(disabledRules.map((rule) => [rule, { enabled: false }])),
  });
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  );
  expect(summary).toEqual([]);
}
