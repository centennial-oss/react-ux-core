// FieldFrame for fields that aren't React Aria fields (a hidden native input under drawn parts, a group of controls):
// it hands FieldFrame's label, description and error their ids, and the invalid state, through React Aria's contexts,
// so they look and behave exactly as on React Aria fields (label position, info tip, required mark).

import type { ReactNode } from 'react';
import { FieldErrorContext, LabelContext, Provider, TextContext } from 'react-aria-components';
import { FieldFrame, type FieldBaseProps } from './Field';
import type { useFieldIds } from './PlainField';

const validDetails: ValidityState = {
  badInput: false,
  customError: false,
  patternMismatch: false,
  rangeOverflow: false,
  rangeUnderflow: false,
  stepMismatch: false,
  tooLong: false,
  tooShort: false,
  typeMismatch: false,
  valid: true,
  valueMissing: false,
};

export interface PlainFieldFrameProps extends FieldBaseProps {
  /** The ids from `useFieldIds()`; the field's own element refers to them (`aria-describedby`, `aria-labelledby`). */
  ids: ReturnType<typeof useFieldIds>;
  /** The id of a native input the label belongs to. Without one the label is a `span`, named by `ids.labelId`. */
  htmlFor?: string;
  /** Shows `errorMessage`. */
  isInvalid?: boolean;
  /** Marks the label as required. */
  isRequired?: boolean;
  children: ReactNode;
}

/** The standard field frame (label, control, description, error) around a field that wires its own ARIA. */
export function PlainFieldFrame({
  ids,
  htmlFor,
  isInvalid = false,
  children,
  ...frame
}: PlainFieldFrameProps) {
  return (
    <Provider
      values={[
        [
          LabelContext,
          htmlFor === undefined
            ? { id: ids.labelId, elementType: 'span' }
            : { id: ids.labelId, htmlFor },
        ],
        [
          TextContext,
          { slots: { description: { id: ids.descriptionId }, errorMessage: { id: ids.errorId } } },
        ],
        [FieldErrorContext, { isInvalid, validationErrors: [], validationDetails: validDetails }],
      ]}
    >
      <FieldFrame {...frame}>{children}</FieldFrame>
    </Provider>
  );
}
