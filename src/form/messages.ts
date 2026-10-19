// English defaults of the form entry point's strings (see `Messages` in provider/messages.ts).
import {
  fileStrings,
  maskedFieldStrings,
  timeRangeStrings,
  type CommonMessages,
} from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';
import type { FormMessages } from '../provider/messages';

export const defaultFormMessages: FormMessages = {
  create: 'Create',
  edit: 'Edit',
  required: 'Required',
  invalidEmail: 'Enter an email address, like name@example.com',
  invalidUrl: 'Enter a web address, like https://example.com',
  tooShort: ({ min }) => `Use at least ${min} characters`,
  tooFewItems: ({ min }) => (min === 1 ? 'Add at least 1 item' : `Add at least ${min} items`),
  tooManyItems: ({ max }) => (max === 1 ? 'Use at most 1 item' : `Use at most ${max} items`),
  fixFields: ({ count }) =>
    count === 1 ? '1 field needs attention' : `${count} fields need attention`,
  addItem: 'Add item',
  itemNumber: ({ index }) => `Item ${index}`,
  removeItem: ({ index }) => `Remove item ${index}`,
  moveItemUp: ({ index }) => `Move item ${index} up`,
  moveItemDown: ({ index }) => `Move item ${index} down`,
  itemMoved: ({ index, total }) => `Moved to position ${index} of ${total}`,
  unsavedChangesTitle: 'Discard unsaved changes?',
  unsavedChangesBody: 'Your changes haven’t been saved.',
  discardChanges: 'Discard',
  keepEditing: 'Keep editing',
  deleteRecordTitle: 'Delete this record?',
  cannotBeUndone: 'This can’t be undone.',
  uploadCancelled: 'Upload cancelled',
  confirmSubmitTitle: 'Please confirm',
};

/** The strings `/form` components read: the core strings and `/form`'s own. */
export type FormStrings = CommonMessages &
  FormMessages &
  typeof fileStrings &
  typeof timeRangeStrings &
  typeof maskedFieldStrings;

// The form's own defaults plus the core strings it uses: upload errors, read-only time ranges and incomplete masks.
const formStrings = {
  ...fileStrings,
  ...timeRangeStrings,
  ...maskedFieldStrings,
  ...defaultFormMessages,
};

/** `/form`'s strings, with the app's overrides from `UIProvider`. */
export function useFormMessages(): FormStrings {
  return useEntryMessages(formStrings);
}
