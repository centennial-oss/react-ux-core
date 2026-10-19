import { useMemo } from 'react';
import { readText, useDashboardMessages } from '../messages';
import type { AnyWidgetType, PageTemplate } from '../types';
import { PickerDialog, type PickerChoice } from './PickerDialog';
import type { DragStartPoint } from './typeDrag';

export interface WidgetPickerProps {
  /** The widget types to offer, in registration order. */
  types: readonly AnyWidgetType[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Called with the chosen type; the picker closes. */
  onSelect: (type: AnyWidgetType) => void;
  /**
   * Lets types be dragged onto the grid (EDIT-11): called with the type and the pointer as a drag starts (past the tap
   * slop, or after a long press on a touch screen), as the picker closes.
   */
  onTypeDragStart?: (type: AnyWidgetType, point: DragStartPoint) => void;
}

/**
 * The "Add widget" picker (EDIT-09): the registered widget types grouped by category, each with its icon, name and
 * description, searchable when there are more than eight.
 */
export function WidgetPicker({
  types,
  isOpen,
  onOpenChange,
  onSelect,
  onTypeDragStart,
}: WidgetPickerProps) {
  const messages = useDashboardMessages();
  const choices = useMemo(
    () =>
      types.map((type): PickerChoice => ({
        id: type.type,
        label: readText(type.displayName, messages),
        description:
          type.description === undefined ? undefined : readText(type.description, messages),
        icon: type.icon,
        category:
          type.category === undefined ? messages.otherCategory : readText(type.category, messages),
      })),
    [types, messages],
  );
  const byType = useMemo(() => new Map(types.map((type) => [type.type, type])), [types]);
  return (
    <PickerDialog
      title={messages.widgetPickerTitle}
      choices={choices}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSelect={(id) => {
        const type = byType.get(id);
        if (type) {
          onSelect(type);
        }
      }}
      searchLabel={messages.searchWidgetTypes}
      emptyText={messages.noWidgetTypes}
      onChoiceDragStart={
        onTypeDragStart &&
        ((id, point) => {
          const type = byType.get(id);
          if (type) {
            onTypeDragStart(type, point);
          }
        })
      }
    />
  );
}

export interface TemplatePickerProps {
  templates: readonly PageTemplate[];
  /** What the template is for: a new page or a new dashboard. */
  purpose: 'page' | 'dashboard';
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Called with the chosen template; the picker closes. */
  onSelect: (template: PageTemplate) => void;
}

/** The template picker (NAV-13): the host's page templates, each with its icon, name and description. */
export function TemplatePicker({
  templates,
  purpose,
  isOpen,
  onOpenChange,
  onSelect,
}: TemplatePickerProps) {
  const messages = useDashboardMessages();
  const choices = useMemo(
    () =>
      templates.map((template): PickerChoice => ({
        id: template.id,
        label: readText(template.name, messages),
        description:
          template.description === undefined ? undefined : readText(template.description, messages),
        icon: template.icon,
        category: '',
      })),
    [templates, messages],
  );
  const byId = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );
  return (
    <PickerDialog
      title={purpose === 'page' ? messages.pageTemplateTitle : messages.dashboardTemplateTitle}
      choices={choices}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSelect={(id) => {
        const template = byId.get(id);
        if (template) {
          onSelect(template);
        }
      }}
      searchLabel={messages.searchTemplates}
      emptyText={messages.noTemplates}
    />
  );
}
