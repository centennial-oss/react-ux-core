import { NumberField } from '../../components/NumberField/NumberField';
import type {
  FieldRendererProps,
  MoneyFieldConfig,
  NumberFieldConfig,
  PercentFieldConfig,
} from '../types';
import {
  currencyDigits,
  moneyFromNumber,
  moneyToNumber,
  percentFromFraction,
  percentToFraction,
} from './convert';
import { frameProps } from './shared';

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** `number` fields: `number | null`. */
export function NumberRenderer({
  field,
  config,
}: FieldRendererProps<NumberFieldConfig<unknown>, number | null>) {
  return (
    <NumberField
      {...frameProps(field, config)}
      value={asNumber(field.value)}
      onChange={field.onChange}
      minValue={config.minValue}
      maxValue={config.maxValue}
      step={config.step}
      formatOptions={config.formatOptions}
      suffix={config.unit}
      hasStepper={config.hasStepper}
      placeholder={config.placeholder}
    />
  );
}

/** `money` fields: a decimal string or integer minor units, edited as a currency amount. */
export function MoneyRenderer({
  field,
  config,
}: FieldRendererProps<MoneyFieldConfig<unknown>, string | number | null>) {
  const digits = config.minorUnits ?? currencyDigits(config.currency);
  return (
    <NumberField
      {...frameProps(field, config)}
      value={moneyToNumber(field.value, config.moneyAs, digits)}
      onChange={(amount) => {
        field.onChange(moneyFromNumber(amount, config.moneyAs, digits));
      }}
      minValue={config.minValue}
      maxValue={config.maxValue}
      formatOptions={{
        style: 'currency',
        currency: config.currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }}
      placeholder={config.placeholder}
    />
  );
}

/** `percent` fields: stored as a fraction (default) or a whole number, edited as a percentage. */
export function PercentRenderer({
  field,
  config,
}: FieldRendererProps<PercentFieldConfig<unknown>, number | null>) {
  return (
    <NumberField
      {...frameProps(field, config)}
      value={percentToFraction(field.value, config.percentAs)}
      onChange={(fraction) => {
        field.onChange(percentFromFraction(fraction, config.percentAs));
      }}
      minValue={percentToFraction(config.minValue, config.percentAs) ?? undefined}
      maxValue={percentToFraction(config.maxValue, config.percentAs) ?? undefined}
      formatOptions={{
        style: 'percent',
        maximumFractionDigits: config.maximumFractionDigits ?? 0,
      }}
      placeholder={config.placeholder}
    />
  );
}
