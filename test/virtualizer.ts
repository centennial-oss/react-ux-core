// React Aria's Virtualizer reads `process.env.NODE_ENV` (and, under "test", draws every row unless `VIRT_ON` is set).
// Apps' bundlers and Storybook replace `NODE_ENV`, but the browser test runner has no `process`, so unit tests that
// render a virtualized collection call this first, and stories use it as `beforeEach`. `VIRT_ON` makes the
// virtualizer measure the real viewport, as it does in apps. Returns a function that undoes it.

interface Scope {
  process?: { env: Record<string, string | undefined> };
}

export function enableVirtualizer(): () => void {
  const scope = globalThis as Scope;
  const hadProcess = scope.process !== undefined;
  scope.process ??= { env: {} };
  const { env } = scope.process;
  const before = { NODE_ENV: env.NODE_ENV, VIRT_ON: env.VIRT_ON };
  env.NODE_ENV ??= 'test';
  env.VIRT_ON = 'true';
  return () => {
    if (!hadProcess) {
      delete scope.process;
      return;
    }
    env.NODE_ENV = before.NODE_ENV;
    env.VIRT_ON = before.VIRT_ON;
  };
}
