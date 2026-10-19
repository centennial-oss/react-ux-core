import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { JsonEditor } from './JsonEditor';

const meta = { title: 'Inputs/JsonEditor', component: JsonEditor } satisfies Meta<
  typeof JsonEditor
>;
export default meta;
type Story = StoryObj<typeof meta>;

function Editor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <JsonEditor
      label="Driver configuration"
      description="Saved to the driver's config file."
      value={value}
      onChange={setValue}
    />
  );
}

export const Valid: Story = {
  args: { label: '', value: '', onChange: () => undefined },
  render: () => (
    <Editor
      initial={
        '{\n  "gateway": { "type": "firefly", "channel": 14 },\n  "heartbeatSeconds": 900\n}'
      }
    />
  ),
};

export const WithAProblem: Story = {
  args: { label: '', value: '', onChange: () => undefined },
  render: () => <Editor initial={'{\n  "gateway": { "type": "firefly" "channel": 14 }\n}'} />,
};
