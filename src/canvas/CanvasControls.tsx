// CanvasControls: zoom out, the zoom level (press for 100%), zoom in and zoom to fit, as a toolbar (arrow keys move
// between its buttons). The canvas shows it in its bottom-left corner; put it in `overlay` to place it yourself.
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo } from 'react';
import { Toolbar, useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { cn } from '../utils/cn';
import { useCanvas } from './context';
import { useCanvasMessages } from './messages';

export interface CanvasControlsProps {
  /** Hides "Zoom to fit". */
  isFitHidden?: boolean;
  className?: string;
}

/** Zoom buttons for the `Canvas` they're in. */
export function CanvasControls({ isFitHidden = false, className }: CanvasControlsProps) {
  const messages = useCanvasMessages();
  const { locale } = useLocale();
  const { viewport, zoomIn, zoomOut, resetZoom, zoomToFit, minZoom, maxZoom } = useCanvas();
  const format = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
    [locale],
  );
  const percent = format.format(viewport.zoom);

  return (
    <Toolbar
      aria-label={messages.canvasZoomControls}
      className={cn(
        'z-10 flex items-center gap-0.5 rounded-control border border-border bg-surface-1 p-0.5 shadow-raised',
        className,
      )}
    >
      <IconButton
        icon={ZoomOut}
        aria-label={messages.canvasZoomOut}
        size="sm"
        isDisabled={viewport.zoom <= minZoom + 1e-6}
        onPress={zoomOut}
      />
      <Button
        variant="ghost"
        size="sm"
        aria-label={messages.canvasResetZoom({ percent })}
        className="min-w-14 px-1.5 tabular-nums"
        onPress={resetZoom}
      >
        {percent}
      </Button>
      <IconButton
        icon={ZoomIn}
        aria-label={messages.canvasZoomIn}
        size="sm"
        isDisabled={viewport.zoom >= maxZoom - 1e-6}
        onPress={zoomIn}
      />
      {!isFitHidden && (
        <IconButton
          icon={Maximize}
          aria-label={messages.canvasZoomToFit}
          size="sm"
          onPress={zoomToFit}
        />
      )}
    </Toolbar>
  );
}
