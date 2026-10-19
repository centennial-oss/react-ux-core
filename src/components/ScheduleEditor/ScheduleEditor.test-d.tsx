import type { ComponentProps } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import { TierEditor } from '../TierEditor/TierEditor';
import { ScheduleEditor } from './ScheduleEditor';

type Mode = 'eco' | 'comfort';
const eco: Mode = 'eco';

describe('row editor types', () => {
  it('uses a NumberField for numbers and needs a custom field otherwise', () => {
    expectTypeOf({ value: [{ start: '00:00', end: '24:00', value: 1 }], unit: 'kW' }).toExtend<
      ComponentProps<typeof ScheduleEditor<number>>
    >();
    // A custom value needs its field, a starting value and a text form.
    expectTypeOf({ value: [{ start: '00:00', end: '24:00', value: eco }] }).not.toExtend<
      ComponentProps<typeof ScheduleEditor<Mode>>
    >();
    expectTypeOf({
      value: [{ start: '00:00', end: '24:00', value: eco }],
      newRowValue: eco,
      formatValue: (mode: Mode) => mode,
      renderValue: () => null,
    }).toExtend<ComponentProps<typeof ScheduleEditor<Mode>>>();
    // Number options don't apply to custom values.
    expectTypeOf({
      newRowValue: eco,
      formatValue: (mode: Mode) => mode,
      renderValue: () => null,
      unit: 'kW',
    }).not.toExtend<ComponentProps<typeof TierEditor<Mode>>>();
  });
});
