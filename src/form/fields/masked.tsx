import { MaskedField } from '../../components/MaskedField/MaskedField';
import type { FieldRendererProps, MaskedFieldConfig } from '../types';
import { frameProps } from './shared';

/** `masked` fields: text in a pattern mask, held raw or formatted; the form checks that it's complete. */
export function MaskedRenderer({
  field,
  config,
}: FieldRendererProps<MaskedFieldConfig<unknown>, string>) {
  return (
    <MaskedField
      {...frameProps(field, config)}
      value={typeof field.value === 'string' ? field.value : ''}
      onChange={field.onChange}
      mask={config.mask}
      tokens={config.tokens}
      valueFormat={config.valueFormat}
      placeholderChar={config.placeholderChar}
      placeholder={config.placeholder}
      autoComplete={config.autoComplete}
    />
  );
}
