import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Inputs/Checkbox',
  component: Checkbox,
  args: { children: 'Remember this device' },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-2">
      <Checkbox>Unchecked</Checkbox>
      <Checkbox defaultSelected>Checked</Checkbox>
      <Checkbox isIndeterminate>Indeterminate</Checkbox>
      <Checkbox description="Only the account owner can change this later.">
        Make this site public
      </Checkbox>
      <Checkbox isDisabled>Disabled</Checkbox>
      <Checkbox isDisabled defaultSelected>
        Disabled and checked
      </Checkbox>
      <Checkbox isReadOnly defaultSelected>
        Read-only
      </Checkbox>
      <Checkbox isInvalid errorMessage="You must accept the terms to continue">
        I accept the terms of service
      </Checkbox>
      <Checkbox isInvalid defaultSelected>
        Invalid and checked
      </Checkbox>
    </div>
  ),
};

/** A parent checkbox that is indeterminate while only some of its children are checked. */
export const SelectAll: Story = {
  render: function SelectAllStory() {
    const [checked, setChecked] = useState<Record<string, boolean>>({
      north: true,
      south: false,
      east: false,
    });
    const values = Object.values(checked);
    const allChecked = values.every(Boolean);
    const someChecked = values.some(Boolean);
    return (
      <div className="flex flex-col gap-1">
        <Checkbox
          isSelected={allChecked}
          isIndeterminate={someChecked && !allChecked}
          onChange={(isSelected) => {
            setChecked({ north: isSelected, south: isSelected, east: isSelected });
          }}
        >
          All regions
        </Checkbox>
        <div className="flex flex-col ps-6">
          {Object.entries(checked).map(([region, isSelected]) => (
            <Checkbox
              key={region}
              isSelected={isSelected}
              onChange={(next) => {
                setChecked((current) => ({ ...current, [region]: next }));
              }}
            >
              {region[0]?.toUpperCase()}
              {region.slice(1)}
            </Checkbox>
          ))}
        </div>
      </div>
    );
  },
};

/** Long labels wrap beside the box. */
export const LongLabel: Story = {
  render: () => (
    <div className="max-w-xs">
      <Checkbox description="You can change this at any time in your notification settings.">
        Email me when a scheduled export finishes, including exports started by other people
      </Checkbox>
    </div>
  ),
};
