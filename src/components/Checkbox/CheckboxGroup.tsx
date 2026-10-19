import type { ReactNode, Ref } from 'react';
import {
  CheckboxGroup as AriaCheckboxGroup,
  type CheckboxGroupProps as AriaCheckboxGroupProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { FieldFrame, fieldRootClasses, type FieldBaseProps } from '../Field/Field';

export interface CheckboxGroupProps
  extends
    Omit<AriaCheckboxGroupProps, 'className' | 'style' | 'children' | 'render' | 'onChange'>,
    FieldBaseProps {
  /** The options: `Checkbox` elements, each with a `value`. */
  children: ReactNode;
  /** Called with the `value`s of the checked options, in the order they were checked. */
  onChange?: (value: string[]) => void;
  /** `vertical` (the default) stacks the options; `horizontal` puts them in a row that wraps when space is short. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  /** The group's root element. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Several related checkboxes with one label, description and error, for example notification channels. The value
 * is the array of checked options' `value`s.
 */
export function CheckboxGroup(props: CheckboxGroupProps) {
  const {
    label,
    description,
    errorMessage,
    labelPosition,
    infoTip,
    orientation = 'vertical',
    className,
    children,
    ...rest
  } = props;
  return (
    <AriaCheckboxGroup {...rest} className={fieldRootClasses(className)}>
      <FieldFrame {...props}>
        <div
          className={cn(
            'flex min-w-0',
            orientation === 'horizontal' ? 'flex-row flex-wrap gap-x-5' : 'flex-col',
            // A side label is padded for a 40 px input; drop the first row so its centre lines up with the label's
            // (the label's line centre is 1.25rem down; a row is --hit-size tall).
            labelPosition === 'side' && '@md:pt-[max(0px,calc(1.25rem-var(--hit-size)/2))]',
          )}
        >
          {children}
        </div>
      </FieldFrame>
    </AriaCheckboxGroup>
  );
}
