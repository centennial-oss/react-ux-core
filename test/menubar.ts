// A text editor's menus for Menubar stories and tests: File (with an Open recent submenu), Edit (with a Find submenu),
// View (checkbox and radio sections), Insert (disabled) and Help (with a checkable item outside a section), with command
// shortcuts and plain-text hints.
import {
  ClipboardPaste,
  Copy,
  FilePlus,
  FolderOpen,
  Printer,
  Redo2,
  Save,
  Scissors,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { MenubarMenu } from '../src/components/Menubar';

/** What the View menu shows: the panels that are on, and the zoom level. */
export interface EditorView {
  panels: ReadonlySet<string>;
  zoom: string;
}

export const DEFAULT_EDITOR_VIEW: EditorView = {
  panels: new Set(['toolbar', 'statusBar']),
  zoom: '100',
};

/** The View menu's panel items, for toggling a panel from `onAction`. */
export const EDITOR_PANELS = ['toolbar', 'statusBar', 'wordWrap', 'tips'];
/** The View menu's zoom items' ids are `zoom-` and the level. */
export const EDITOR_ZOOMS = ['75', '100', '150'];

/** The view after choosing `key`: a panel turned on or off, or a zoom level picked. */
export function nextEditorView(view: EditorView, key: string): EditorView {
  if (EDITOR_PANELS.includes(key)) {
    const panels = new Set(view.panels);
    if (panels.has(key)) {
      panels.delete(key);
    } else {
      panels.add(key);
    }
    return { ...view, panels };
  }
  if (key.startsWith('zoom-')) {
    return { ...view, zoom: key.slice('zoom-'.length) };
  }
  return view;
}

export function editorMenus(view: EditorView = DEFAULT_EDITOR_VIEW): MenubarMenu[] {
  return [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New', icon: FilePlus, shortcut: { code: 'KeyN', key: 'N' } },
        { id: 'open', label: 'Open…', icon: FolderOpen, shortcut: { code: 'KeyO', key: 'O' } },
        {
          id: 'recent',
          label: 'Open recent',
          items: [
            { id: 'recent-report', label: 'report.md' },
            { id: 'recent-notes', label: 'notes.md' },
            { type: 'separator' },
            { id: 'recent-clear', label: 'Clear recent' },
          ],
        },
        { type: 'separator' },
        { id: 'save', label: 'Save', icon: Save, shortcut: { code: 'KeyS', key: 'S' } },
        {
          id: 'saveAs',
          label: 'Save as…',
          shortcut: { code: 'KeyS', key: 'S', isShift: true },
        },
        { type: 'separator' },
        {
          id: 'print',
          label: 'Print…',
          icon: Printer,
          shortcut: { code: 'KeyP', key: 'P' },
          isDisabled: true,
        },
        { id: 'delete', label: 'Move to trash', icon: Trash2, tone: 'danger' },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', icon: Undo2, shortcut: { code: 'KeyZ', key: 'Z' } },
        {
          id: 'redo',
          label: 'Redo',
          icon: Redo2,
          shortcut: { code: 'KeyZ', key: 'Z', isShift: true },
        },
        { type: 'separator' },
        { id: 'cut', label: 'Cut', icon: Scissors, shortcut: { code: 'KeyX', key: 'X' } },
        { id: 'copy', label: 'Copy', icon: Copy, shortcut: { code: 'KeyC', key: 'C' } },
        {
          id: 'paste',
          label: 'Paste',
          icon: ClipboardPaste,
          shortcut: { code: 'KeyV', key: 'V' },
        },
        { type: 'separator' },
        {
          id: 'find',
          label: 'Find',
          icon: Search,
          items: [
            { id: 'findText', label: 'Find…', shortcut: { code: 'KeyF', key: 'F' } },
            { id: 'findNext', label: 'Find next', shortcut: { code: 'KeyG', key: 'G' } },
            {
              id: 'replace',
              label: 'Replace…',
              shortcut: { code: 'KeyF', key: 'F', isAlt: true },
            },
          ],
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          type: 'section',
          id: 'panels',
          title: 'Show',
          selectionMode: 'multiple',
          items: [
            { id: 'toolbar', label: 'Toolbar', isSelected: view.panels.has('toolbar') },
            { id: 'statusBar', label: 'Status bar', isSelected: view.panels.has('statusBar') },
            { id: 'wordWrap', label: 'Word wrap', isSelected: view.panels.has('wordWrap') },
          ],
        },
        {
          type: 'section',
          id: 'zoom',
          title: 'Zoom',
          selectionMode: 'single',
          items: EDITOR_ZOOMS.map((zoom) => ({
            id: `zoom-${zoom}`,
            label: `${zoom}%`,
            isSelected: view.zoom === zoom,
          })),
        },
        { type: 'separator' },
        { id: 'fullScreen', label: 'Full screen', shortcut: 'F11' },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      isDisabled: true,
      items: [{ id: 'table', label: 'Table' }],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { id: 'docs', label: 'Documentation' },
        {
          id: 'shortcuts',
          label: 'Keyboard shortcuts',
          shortcut: { code: 'Slash', key: '/' },
        },
        { id: 'tips', label: 'Show tips', isSelected: view.panels.has('tips') },
        { type: 'separator' },
        { id: 'about', label: 'About' },
      ],
    },
  ];
}
