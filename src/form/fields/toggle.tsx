import { Checkbox } from '../../components/Checkbox/Checkbox';
import { InfoTip } from '../../components/InfoTip/InfoTip';
import { Switch } from '../../components/Switch/Switch';
import type { CheckboxFieldConfig, FieldRendererProps, SwitchFieldConfig } from '../types';

function toggleProps(field: FieldRendererProps['field']) {
  return {
    name: field.name,
    isSelected: field.value === true,
    onChange: field.onChange,
    onBlur: field.onBlur,
    isRequired: field.isRequired,
    isDisabled: field.isDisabled,
    isReadOnly: field.isReadOnly,
    isInvalid: field.isInvalid,
    errorMessage: field.errorMessage,
    validationBehavior: 'aria' as const,
  };
}

/** `checkbox` fields: `true` or `false`. A required checkbox must be checked. */
export function CheckboxRenderer({
  field,
  config,
}: FieldRendererProps<CheckboxFieldConfig<unknown>>) {
  return (
    <div className="flex min-w-0 items-start gap-1">
      <Checkbox {...toggleProps(field)} description={config.description}>
        {config.label}
      </Checkbox>
      {config.infoTip !== undefined && <InfoTip>{config.infoTip}</InfoTip>}
    </div>
  );
}

/** `switch` fields: `true` or `false`, for settings that apply at once. */
export function SwitchRenderer({ field, config }: FieldRendererProps<SwitchFieldConfig<unknown>>) {
  return (
    <div className="flex min-w-0 items-start gap-1">
      <Switch {...toggleProps(field)} description={config.description}>
        {config.label}
      </Switch>
      {config.infoTip !== undefined && <InfoTip>{config.infoTip}</InfoTip>}
    </div>
  );
}
