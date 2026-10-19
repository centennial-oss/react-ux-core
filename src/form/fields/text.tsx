import { TextArea } from '../../components/TextArea/TextArea';
import { TextField, type TextFieldType } from '../../components/TextField/TextField';
import type { FieldRendererProps, TextAreaFieldConfig, TextFieldConfig } from '../types';
import { frameProps } from './shared';

const inputTypes: Record<TextFieldConfig<unknown>['type'], TextFieldType> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  url: 'url',
  password: 'password',
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** `text`, `email`, `phone`, `url` and `password` fields. */
export function TextFieldRenderer({
  field,
  config,
}: FieldRendererProps<TextFieldConfig<unknown>, string>) {
  return (
    <TextField
      {...frameProps(field, config)}
      type={inputTypes[config.type]}
      value={asText(field.value)}
      onChange={field.onChange}
      placeholder={config.placeholder}
      autoComplete={config.autoComplete}
      minLength={config.minLength}
      maxLength={config.maxLength}
      prefix={config.prefix}
      suffix={config.suffix}
    />
  );
}

/** `textarea` fields. */
export function TextAreaRenderer({
  field,
  config,
}: FieldRendererProps<TextAreaFieldConfig<unknown>, string>) {
  return (
    <TextArea
      {...frameProps(field, config)}
      value={asText(field.value)}
      onChange={field.onChange}
      placeholder={config.placeholder}
      minRows={config.minRows}
      maxRows={config.maxRows}
      maxLength={config.maxLength}
      hasCharacterCount={config.hasCharacterCount}
    />
  );
}
