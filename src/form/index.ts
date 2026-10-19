// Public API for @centennial-oss/react-ux-core/form: ConfigForm, its containers, and the field registry.

export { ConfigForm, type ConfigFormProps } from './ConfigForm';
export {
  type ConfigFormHandle,
  type FormControllerOptions,
  type FormSuccessEvent,
} from './useFormController';
export type { FormMode, SubmitStatus } from './runtime';
export {
  createFieldRegistry,
  defaultFieldRegistry,
  FieldRegistryContext,
  type FieldRegistry,
} from './registry';
export { builtInFields } from './fields';
export { createPatch } from './values';
export {
  problemToSubmitResult,
  responseToSubmitResult,
  type ProblemDetails,
  type ProblemFieldError,
} from './problemDetails';
export type * from './types';
export { DialogForm, type DialogFormProps } from './containers/DialogForm';
export { CardForm, type CardFormProps } from './containers/CardForm';
export { PageForm, type PageFormProps } from './containers/PageForm';
export { WizardForm, type WizardFormProps, type WizardStep } from './containers/WizardForm';
export { UnsavedChangesDialog, type UnsavedChangesDialogProps } from './UnsavedChangesDialog';
