import { describe, expectTypeOf, it } from 'vitest';
import type { TreeNode } from './types';

describe('Tree types', () => {
  it('nests up to five levels', () => {
    const five = {
      id: '1',
      label: '1',
      children: [
        {
          id: '2',
          label: '2',
          children: [
            {
              id: '3',
              label: '3',
              children: [{ id: '4', label: '4', children: [{ id: '5', label: '5' }] }],
            },
          ],
        },
      ],
    };
    expectTypeOf(five).toExtend<TreeNode>();
    const six = {
      id: '1',
      label: '1',
      children: [
        {
          id: '2',
          label: '2',
          children: [
            {
              id: '3',
              label: '3',
              children: [
                {
                  id: '4',
                  label: '4',
                  children: [{ id: '5', label: '5', children: [{ id: '6', label: '6' }] }],
                },
              ],
            },
          ],
        },
      ],
    };
    expectTypeOf(six).not.toExtend<TreeNode>();
  });
});
