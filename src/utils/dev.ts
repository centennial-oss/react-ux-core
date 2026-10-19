// Development-only checks: warnings that help app developers and cost nothing in production builds.

// Bundlers replace `process.env.NODE_ENV` in apps; the library doesn't depend on Node's types.
declare const process: { env: { NODE_ENV?: string } };

/** True outside production builds. False when the environment can't tell. */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

/** Logs a development warning, prefixed with the component's name. */
export function warnInDevelopment(component: string, message: string): void {
  if (isDevelopment()) {
    console.warn(`[${component}] ${message}`);
  }
}
