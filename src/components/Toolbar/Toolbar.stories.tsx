import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Copy,
  Eraser,
  Hand,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  MousePointer2,
  PenLine,
  Redo2,
  Scissors,
  Shapes,
  Strikethrough,
  Table2,
  Trash2,
  Type,
  Underline,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Separator } from '../Separator/Separator';
import { ToggleButton, ToggleButtonGroup } from '../ToggleButton/ToggleButton';
import { Tooltip } from '../Tooltip/Tooltip';
import { Toolbar, type ToolbarItem } from './Toolbar';

const meta = {
  title: 'Actions/Toolbar',
  component: Toolbar,
  args: { 'aria-label': 'Formatting' },
} satisfies Meta<typeof Toolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Controls in `children`: arrow keys move between them, Tab leaves the toolbar in one step. Children never move into
 * a menu, so this toolbar wraps (`className="flex-wrap"`) rather than run off a phone's screen.
 */
export const Basic: Story = {
  render: (args) => (
    <Toolbar {...args} className="flex-wrap">
      <Tooltip content="Undo">
        <IconButton icon={Undo2} aria-label="Undo" />
      </Tooltip>
      <Tooltip content="Redo">
        <IconButton icon={Redo2} aria-label="Redo" />
      </Tooltip>
      <Separator orientation="vertical" className="mx-1 my-2" />
      <ToggleButtonGroup
        aria-label="Text style"
        selectionMode="multiple"
        defaultSelectedKeys={['bold']}
      >
        <ToggleButton id="bold" icon={Bold} isIconOnly>
          Bold
        </ToggleButton>
        <ToggleButton id="italic" icon={Italic} isIconOnly>
          Italic
        </ToggleButton>
        <ToggleButton id="underline" icon={Underline} isIconOnly>
          Underline
        </ToggleButton>
      </ToggleButtonGroup>
      <Separator orientation="vertical" className="mx-1 my-2" />
      <ToggleButtonGroup
        aria-label="Alignment"
        defaultSelectedKeys={['left']}
        disallowEmptySelection
      >
        <ToggleButton id="left" icon={AlignLeft} isIconOnly>
          Align left
        </ToggleButton>
        <ToggleButton id="center" icon={AlignCenter} isIconOnly>
          Align centre
        </ToggleButton>
        <ToggleButton id="right" icon={AlignRight} isIconOnly>
          Align right
        </ToggleButton>
      </ToggleButtonGroup>
      <Separator orientation="vertical" className="mx-1 my-2" />
      <Button variant="ghost" icon={Link}>
        Insert link
      </Button>
    </Toolbar>
  ),
};

const EDITING: ToolbarItem[] = [
  { id: 'undo', label: 'Undo', icon: Undo2, isIconOnly: true, group: 'History', priority: 3 },
  { id: 'redo', label: 'Redo', icon: Redo2, isIconOnly: true, group: 'History', priority: 2 },
  { id: 'cut', label: 'Cut', icon: Scissors, group: 'Clipboard', priority: 1 },
  { id: 'copy', label: 'Copy', icon: Copy, group: 'Clipboard', priority: 1 },
  { id: 'image', label: 'Image', icon: Image, group: 'Insert' },
  { id: 'table', label: 'Table', icon: Table2, group: 'Insert' },
  { id: 'code', label: 'Code block', icon: Code, group: 'Insert' },
  { id: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', group: 'Delete', priority: 2 },
];

/**
 * `items` overflow: those that don't fit move into "More actions", lowest `priority` first (ties from the end). Here
 * Undo and Delete stay longest. Drag the box's corner to resize it.
 */
export const Overflow: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {[720, 420, 260].map((width) => (
        <div
          key={width}
          className="max-w-full resize-x overflow-auto rounded-card border border-border p-1"
          style={{ width }}
        >
          <Toolbar {...args} aria-label={`Editing, ${String(width)} px`} items={EDITING} />
        </div>
      ))}
    </div>
  ),
};

/** Toggle items show as pressed buttons in the bar and as checked items in the overflow menu. */
export const ToggleItems: Story = {
  render: function ToggleItemsStory(args) {
    const [applied, setApplied] = useState<ReadonlySet<string>>(new Set(['bold', 'highlight']));
    const toggle = (id: string) => () => {
      const next = new Set(applied);
      if (!next.delete(id)) {
        next.add(id);
      }
      setApplied(next);
    };
    const formats = [
      { id: 'bold', label: 'Bold', icon: Bold },
      { id: 'italic', label: 'Italic', icon: Italic },
      { id: 'underline', label: 'Underline', icon: Underline },
      { id: 'strike', label: 'Strikethrough', icon: Strikethrough },
      { id: 'highlight', label: 'Highlight', icon: Highlighter },
    ];
    const items: ToolbarItem[] = [
      ...formats.map(({ id, label, icon }) => ({
        id,
        label,
        icon,
        isIconOnly: true as const,
        group: 'Text style',
        isSelected: applied.has(id),
        onAction: toggle(id),
      })),
      { id: 'bullets', label: 'Bulleted list', icon: List, isIconOnly: true, group: 'Lists' },
      {
        id: 'numbers',
        label: 'Numbered list',
        icon: ListOrdered,
        isIconOnly: true,
        group: 'Lists',
      },
      { id: 'clear', label: 'Clear formatting', icon: Eraser, group: 'Clear' },
    ];
    return (
      <div className="max-w-full" style={{ width: 200 }}>
        <Toolbar {...args} items={items} size="sm" />
      </div>
    );
  },
};

/** `children` stay in the bar while `items` overflow beside them; `justify-end` lines the items up at the end. */
export const ChildrenAndItems: Story = {
  render: (args) => (
    <div className="max-w-full rounded-card border border-border p-1" style={{ width: 380 }}>
      <Toolbar {...args} aria-label="Document" className="justify-end" items={EDITING.slice(2)}>
        <Button variant="soft" tone="accent">
          Share
        </Button>
      </Toolbar>
    </div>
  ),
};

/** A vertical toolbar: Up and Down move between the tools. */
export const Vertical: Story = {
  render: () => (
    <div className="inline-flex rounded-card border border-border p-1">
      <Toolbar aria-label="Drawing tools" orientation="vertical">
        <ToggleButtonGroup
          aria-label="Tool"
          orientation="vertical"
          defaultSelectedKeys={['select']}
          disallowEmptySelection
        >
          <ToggleButton id="select" icon={MousePointer2} isIconOnly>
            Select
          </ToggleButton>
          <ToggleButton id="pan" icon={Hand} isIconOnly>
            Pan
          </ToggleButton>
          <ToggleButton id="pen" icon={PenLine} isIconOnly>
            Pen
          </ToggleButton>
          <ToggleButton id="text" icon={Type} isIconOnly>
            Text
          </ToggleButton>
          <ToggleButton id="shapes" icon={Shapes} isIconOnly>
            Shapes
          </ToggleButton>
        </ToggleButtonGroup>
        <Separator className="mx-2 my-1 w-auto self-stretch" />
        <Tooltip content="Delete" placement="end">
          <IconButton icon={Trash2} aria-label="Delete" tone="danger" />
        </Tooltip>
      </Toolbar>
    </div>
  ),
};

/** A vertical toolbar of items overflows by height. */
export const VerticalOverflow: Story = {
  render: () => (
    <div className="inline-flex h-64 rounded-card border border-border p-1">
      <Toolbar aria-label="Editing" orientation="vertical" items={EDITING} size="sm" />
    </div>
  ),
};
