import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudLightning } from 'lucide-react';
import { Brand } from './Brand';

const meta = { title: 'Shell/Brand', component: Brand } satisfies Meta<typeof Brand>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { name: 'ThunderCloud', icon: CloudLightning, href: '/' } };
