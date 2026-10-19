// The edit toolbar (§12.2): the page's title, Add, Undo and Redo, page settings, Revert, Clear page, Save and Done.
// The secondary actions move into a "More actions" menu when space runs short; Save and Done always stay (EDIT-08).

import { Eraser, Plus, Redo2, RotateCcw, Settings, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { MenuItem } from '../../components/Menu/Menu';
import { MenuButton } from '../../components/Menu/MenuButtons';
import { TextField } from '../../components/TextField/TextField';
import { Toolbar, type ToolbarItem } from '../../components/Toolbar/Toolbar';
import type { DashboardStrings } from '../messages';
import type { WidgetAction } from '../types';

/** What the Add menu adds. */
export type AddKind = 'widget' | 'page' | 'pageTemplate' | 'dashboard' | 'dashboardTemplate';

export interface EditToolbarProps {
  messages: DashboardStrings;
  pageTitle: string;
  /** Called with a new, non-empty title when the field is left or Enter pressed. */
  onPageTitleChange: (title: string) => void;
  canAddWidget: boolean;
  canAddPage: boolean;
  canAddDashboard: boolean;
  /** Offers pages and dashboards from templates too (NAV-13). */
  hasTemplates?: boolean;
  onAdd: (kind: AddKind) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Shows Page settings (EDIT-26), when the user may change grid settings. */
  onPageSettings?: () => void;
  onRevert: () => void;
  onClearPage: () => void;
  isDirty: boolean;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
  onDone: () => void;
  /** The host's own edit actions (NAV-06). */
  editActions?: readonly WidgetAction[];
}

/** The toolbar shown while editing. */
export function EditToolbar({
  messages,
  pageTitle,
  onPageTitleChange,
  canAddWidget,
  canAddPage,
  canAddDashboard,
  hasTemplates = false,
  onAdd,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPageSettings,
  onRevert,
  onClearPage,
  isDirty,
  isSaving,
  canSave,
  onSave,
  onDone,
  editActions = [],
}: EditToolbarProps) {
  // The field keeps what's typed; an empty title isn't allowed, so it goes back when left empty.
  const [title, setTitle] = useState(pageTitle);
  const [shownFor, setShownFor] = useState(pageTitle);
  if (shownFor !== pageTitle) {
    setShownFor(pageTitle);
    setTitle(pageTitle);
  }
  const isTitleEmpty = title.trim() === '';
  const commitTitle = () => {
    if (isTitleEmpty) {
      setTitle(pageTitle);
    } else if (title !== pageTitle) {
      onPageTitleChange(title.trim());
    }
  };

  const items: ToolbarItem[] = [
    {
      id: 'undo',
      label: messages.undo,
      icon: Undo2,
      isIconOnly: true,
      isDisabled: !canUndo,
      priority: 3,
      group: 'history',
      onAction: onUndo,
    },
    {
      id: 'redo',
      label: messages.redo,
      icon: Redo2,
      isIconOnly: true,
      isDisabled: !canRedo,
      priority: 3,
      group: 'history',
      onAction: onRedo,
    },
    ...(onPageSettings
      ? [
          {
            id: 'settings',
            label: messages.pageSettings,
            icon: Settings,
            priority: 2,
            group: 'page',
            onAction: onPageSettings,
          },
        ]
      : []),
    {
      id: 'clear',
      label: messages.clearPage,
      icon: Eraser,
      priority: 1,
      group: 'page',
      onAction: onClearPage,
    },
    {
      id: 'revert',
      label: messages.revert,
      icon: RotateCcw,
      isDisabled: !isDirty,
      priority: 1,
      group: 'page',
      onAction: onRevert,
    },
    ...editActions.map((action) => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      isDisabled: action.isDisabled,
      priority: 0,
      group: 'host',
      onAction: action.onAction,
    })),
  ];
  const canAdd = canAddWidget || canAddPage || canAddDashboard;

  return (
    <div className="flex min-w-0 flex-wrap items-end gap-2 px-3 pt-2">
      <Badge tone="accent" variant="soft" className="mb-2">
        {messages.editing}
      </Badge>
      <TextField
        label={messages.pageTitle}
        labelPosition="side"
        size="sm"
        value={title}
        onChange={setTitle}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitTitle();
          }
        }}
        isInvalid={isTitleEmpty}
        errorMessage={isTitleEmpty ? messages.pageTitleRequired : undefined}
        className="w-64 max-w-full"
      />
      {canAdd && (
        <MenuButton
          label={messages.add}
          icon={Plus}
          size="sm"
          variant="soft"
          tone="accent"
          onAction={(key) => {
            onAdd(key as AddKind);
          }}
        >
          {canAddWidget && <MenuItem id="widget">{messages.addWidget}</MenuItem>}
          {canAddPage && <MenuItem id="page">{messages.addPage}</MenuItem>}
          {canAddPage && hasTemplates && (
            <MenuItem id="pageTemplate">{messages.addPageFromTemplate}</MenuItem>
          )}
          {canAddDashboard && <MenuItem id="dashboard">{messages.addDashboard}</MenuItem>}
          {canAddDashboard && hasTemplates && (
            <MenuItem id="dashboardTemplate">{messages.addDashboardFromTemplate}</MenuItem>
          )}
        </MenuButton>
      )}
      <Toolbar
        aria-label={messages.editToolbar}
        items={items}
        size="sm"
        className="min-w-24 flex-1"
      />
      <div className="ms-auto flex items-center gap-2">
        {canSave && (
          <Button
            variant="solid"
            tone="accent"
            size="sm"
            isPending={isSaving}
            isDisabled={!isDirty}
            onPress={onSave}
          >
            {messages.save}
          </Button>
        )}
        <Button variant="outline" size="sm" isDisabled={isSaving} onPress={onDone}>
          {messages.done}
        </Button>
      </div>
    </div>
  );
}
