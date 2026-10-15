// The form runtime shared by ConfigForm's parts (fields, action bar, status) and the containers.

import type { AnyFormApi } from '@tanstack/react-form';
import { createContext, useContext, type ReactNode } from 'react';
import type { AnyFieldConfig } from './internalTypes';
import type { FieldRegistry } from './registry';
import type { DeleteConfirmation } from './types';
import type { UploadStore } from './uploads';

/** Where the submit lifecycle is. */
export type SubmitStatus =
  'editing' | 'validating' | 'submitting' | 'succeeded' | 'failed' | 'needs-confirmation';

/** Editing, or showing the values read-only. */
export type FormMode = 'edit' | 'view';

/** A layout section with its config entries resolved. */
export interface ResolvedSection {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  isCollapsible: boolean;
  defaultExpanded: boolean;
  columns: 1 | 2 | 3 | 4;
  fields: readonly AnyFieldConfig[];
}

/** What the form's actions allow. */
export interface ActionInfo {
  kind: 'create' | 'update' | 'none';
  submitLabel?: string;
  hasRevert: boolean;
  hasDelete: boolean;
  deleteConfirmation?: DeleteConfirmation;
}

export interface FormRuntime {
  form: AnyFormApi;
  /** The `<form>` element's id, for submit buttons outside it. */
  formId: string;
  fields: readonly AnyFieldConfig[];
  sections: readonly ResolvedSection[];
  registry: FieldRegistry;
  mode: FormMode;
  setMode: (mode: FormMode) => void;
  hasEditToggle: boolean;
  actions: ActionInfo;
  status: SubmitStatus;
  /** Whether any value differs from the defaults. */
  isDirty: boolean;
  /** The form-level error from the last submit. */
  formError: ReactNode;
  /** Text for the form's live region. */
  announcement: string;
  /** Set while a needs-confirmation result waits for the user. */
  confirmation: { warning: ReactNode; confirmLabel?: string } | null;
  confirmSubmit: () => void;
  cancelConfirmation: () => void;
  /** Validates and submits. Ignored while a submit is running. */
  submit: () => void;
  /** Validates and submits, resolving with where the lifecycle ended. */
  submitAndWait: () => Promise<SubmitStatus>;
  /** Resets to the default values. */
  revert: () => void;
  /** Runs the delete action; rejects with a message to show in the confirmation. */
  deleteRecord: () => Promise<void>;
  /** Reload counters for fields with `dependsOn: { onChange: 'reload' }`. */
  reloadKeys: Readonly<Record<string, number>>;
  uploads: UploadStore;
  /** Sections opened to show an invalid field. */
  forcedOpenSections: ReadonlySet<string>;
  /** Called by the root element so focus can move to invalid fields. */
  setRootElement: (element: HTMLElement | null) => void;
  /**
   * Runs `callback` now, or once a press in progress has ended. Errors shown on blur would otherwise move the button
   * being pressed (such as Save) out from under the pointer, and the press would be lost.
   */
  afterPress: (callback: () => void) => void;
}

export const FormRuntimeContext = createContext<FormRuntime | null>(null);

export function useFormRuntime(): FormRuntime {
  const runtime = useContext(FormRuntimeContext);
  if (!runtime) {
    throw new Error('Form parts must be rendered inside ConfigForm or a form container.');
  }
  return runtime;
}
