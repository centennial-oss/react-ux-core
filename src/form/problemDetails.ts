// Maps RFC 9457 problem details (`application/problem+json`) to a SubmitResult.

import { normalizePath, pointerToPath } from './paths';
import type { SubmitFailure, SubmitResult } from './types';

/** One entry of the `errors` extension: a field located by JSON pointer or by name, and what's wrong with it. */
export interface ProblemFieldError {
  /** An RFC 6901 pointer into the request body, such as `/contacts/0/email`. */
  pointer?: string;
  /** A field name, such as `contacts.0.email` or `contacts[0].email`. */
  name?: string;
  detail: string;
}

/** An RFC 9457 problem details object, with an `errors` extension for field errors. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: readonly ProblemFieldError[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fieldErrorsOf(errors: unknown): {
  fieldErrors: Record<string, string>;
  unplaced: string[];
} {
  const fieldErrors: Record<string, string> = {};
  const unplaced: string[] = [];
  if (!Array.isArray(errors)) {
    return { fieldErrors, unplaced };
  }
  for (const entry of errors as unknown[]) {
    if (!isRecord(entry) || typeof entry.detail !== 'string') {
      continue;
    }
    const path =
      typeof entry.pointer === 'string' && entry.pointer !== ''
        ? pointerToPath(entry.pointer)
        : typeof entry.name === 'string' && entry.name !== ''
          ? normalizePath(entry.name)
          : '';
    if (path === '') {
      unplaced.push(entry.detail);
    } else {
      fieldErrors[path] ??= entry.detail;
    }
  }
  return { fieldErrors, unplaced };
}

/**
 * A failed SubmitResult from a problem details body. Each `errors[]` entry becomes a field error (located by
 * `pointer`, or by `name`); entries without a location and the problem's `detail` become the form error, as does its
 * `title` when no field error explains the problem. Anything that isn't a problem object yields a generic failure,
 * so the form still reports it.
 */
export function problemToSubmitResult(problem: unknown): SubmitFailure {
  if (!isRecord(problem)) {
    return { ok: false };
  }
  const { fieldErrors, unplaced } = fieldErrorsOf(problem.errors);
  // The `title` is generic ("Invalid request"); it's only worth showing when no field explains the problem.
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const summary =
    typeof problem.detail === 'string' && problem.detail !== ''
      ? problem.detail
      : typeof problem.title === 'string' && problem.title !== '' && !hasFieldErrors
        ? problem.title
        : undefined;
  const formError = [summary, ...unplaced].filter((text) => text !== undefined).join(' ');
  return {
    ok: false,
    ...(formError === '' ? {} : { formError }),
    ...(hasFieldErrors ? { fieldErrors } : {}),
  };
}

/**
 * A SubmitResult from a `fetch` response: `{ ok: true }` for a 2xx status, otherwise the problem details in the body
 * (when it's `application/problem+json` or JSON), or a generic failure.
 */
export async function responseToSubmitResult(response: Response): Promise<SubmitResult> {
  if (response.ok) {
    return { ok: true };
  }
  const type = response.headers.get('content-type') ?? '';
  if (/[/+]json\b/.test(type)) {
    try {
      return problemToSubmitResult(await response.json());
    } catch {
      return { ok: false };
    }
  }
  return { ok: false };
}
