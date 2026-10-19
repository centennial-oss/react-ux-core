// GanttChart's toolbar: zoom out, the zoom level, zoom in and today; while linking tasks, the prompt and a cancel
// button.
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { CoreMessages } from '../../provider/messages';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Option } from '../ListBox/ListBoxParts';
import { Select } from '../Select/Select';
import { ZOOMS } from './scale';
import type { GanttZoom } from './types';

type ToolbarMessages = Pick<
  CoreMessages,
  'ganttZoom' | 'ganttZoomName' | 'ganttZoomIn' | 'ganttZoomOut' | 'ganttToday' | 'cancel'
>;

export interface GanttToolbarProps {
  zoom: GanttZoom;
  onZoomChange: (zoom: GanttZoom) => void;
  onToday: () => void;
  /** While linking, what to do next; the cancel button shows with it. */
  linkPrompt: string | null;
  onCancelLink: () => void;
  messages: ToolbarMessages;
}

export function GanttToolbar({
  zoom,
  onZoomChange,
  onToday,
  linkPrompt,
  onCancelLink,
  messages,
}: GanttToolbarProps) {
  const position = ZOOMS.indexOf(zoom);
  const closer = ZOOMS[position - 1];
  const farther = ZOOMS[position + 1];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-2">
      <div className="flex items-center gap-1">
        <IconButton
          icon={ZoomOut}
          size="sm"
          variant="outline"
          aria-label={messages.ganttZoomOut}
          isDisabled={farther === undefined}
          onPress={() => {
            if (farther) {
              onZoomChange(farther);
            }
          }}
        />
        <Select<object, GanttZoom>
          aria-label={messages.ganttZoom}
          size="sm"
          value={zoom}
          onChange={onZoomChange}
          className="w-32"
        >
          {ZOOMS.map((option) => (
            <Option key={option} id={option}>
              {messages.ganttZoomName({ zoom: option })}
            </Option>
          ))}
        </Select>
        <IconButton
          icon={ZoomIn}
          size="sm"
          variant="outline"
          aria-label={messages.ganttZoomIn}
          isDisabled={closer === undefined}
          onPress={() => {
            if (closer) {
              onZoomChange(closer);
            }
          }}
        />
      </div>
      <Button size="sm" variant="outline" onPress={onToday}>
        {messages.ganttToday}
      </Button>
      {linkPrompt !== null && (
        <div className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto">
          <p className="m-0 min-w-0 flex-1 text-sm text-fg">{linkPrompt}</p>
          <Button size="sm" variant="ghost" onPress={onCancelLink}>
            {messages.cancel}
          </Button>
        </div>
      )}
    </div>
  );
}
