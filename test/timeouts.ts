/**
 * How long a test waits for something to happen (`expect.poll`, `findBy*`, `waitFor`) before it fails. A wait ends as
 * soon as its condition holds, so a generous limit costs nothing when tests pass. CI runs the whole suite on a small,
 * saturated runner, where overlays take seconds to enter and timers fire late, so short limits there fail tests that
 * pass locally. Keep this well under the browser tests' 15s test timeout.
 */
export const WAIT_TIMEOUT = 10_000;
