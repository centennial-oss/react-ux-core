import { OneTimeCodeField } from '../../components/OneTimeCodeField/OneTimeCodeField';
import type { FieldRendererProps, OneTimeCodeFieldConfig } from '../types';
import { frameProps } from './shared';

/** `oneTimeCode` fields: the code as a string, complete when it has `codeLength` characters. */
export function OneTimeCodeRenderer({
  field,
  config,
}: FieldRendererProps<OneTimeCodeFieldConfig<unknown>, string>) {
  return (
    <OneTimeCodeField
      {...frameProps(field, config)}
      value={typeof field.value === 'string' ? field.value : ''}
      onChange={field.onChange}
      codeLength={config.codeLength}
      groupSizes={config.groupSizes}
      allowedCharacters={config.allowedCharacters}
      isMasked={config.isMasked}
    />
  );
}
