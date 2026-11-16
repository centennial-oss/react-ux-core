/**
 * The fastest of several timed runs of `run`, in milliseconds, after one untimed warm-up run. Use it for speed budgets:
 * a busy machine (CI runs the suite on a saturated runner) or a garbage collection only ever slows a run down, so the
 * fastest run measures what the code can do, while a single or median run measures how busy the machine was.
 */
export function fastestRun(run: () => void, samples = 5): number {
  run();
  let fastest = Infinity;
  for (let index = 0; index < samples; index++) {
    const start = performance.now();
    run();
    fastest = Math.min(fastest, performance.now() - start);
  }
  return fastest;
}
