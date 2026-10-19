import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type TemplateEditorKeyword } from './template';
import { TemplateEditor } from './TemplateEditor';

const keywords: TemplateEditorKeyword[] = [
  { keyword: 'meter.serial', description: 'The meter’s serial number', example: 'S60R-04A3B2' },
  { keyword: 'customer.name', description: 'The customer’s name', example: 'Elowyth Thornquill' },
  { keyword: 'customer.balance', description: 'Credit plus plan balance', example: 'KES 1,240.00' },
];

const meta = { title: 'Inputs/TemplateEditor', component: TemplateEditor } satisfies Meta<
  typeof TemplateEditor
>;
export default meta;
type Story = StoryObj<typeof meta>;

function Editor() {
  const [value, setValue] = useState(
    'Low balance on {{meter.serial}}: {{customer.balance}}. Top up soon.',
  );
  return (
    <TemplateEditor
      label="Message"
      description="Type {{ to insert a keyword."
      keywords={keywords}
      value={value}
      onChange={setValue}
    />
  );
}

export const LowBalanceAlert: Story = {
  args: { label: '', value: '', onChange: () => undefined, keywords },
  render: () => <Editor />,
};
