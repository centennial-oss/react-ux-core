// MultiView (FR-038): a wall of stream previews. Each tile has its status chip and two buttons: listen (only one
// tile's audio plays at a time, `audioStreamId`) and focus (the tile spans the grid's width, first, with full
// controls; the others keep playing below). Tiles keep their place in the DOM when focused, so their streams don't
// restart, and tiles scrolled out of view pause and stop downloading until they're back.

import { Headphones, Maximize2, Minimize2 } from 'lucide-react';
import type { Ref } from 'react';
import { IconButton } from '../../components/IconButton/IconButton';
import { Grid, type Columns, type GridColumns } from '../../components/Layout/Layout';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { useMediaPlayerMessages } from './messages';
import { StreamPreview, type StreamPreviewProps } from './StreamPreview';

export interface MultiViewStream extends StreamPreviewProps {
  id: string;
}

export interface MultiViewProps {
  streams: readonly MultiViewStream[];
  /** Columns by the view's width. Defaults to `{ base: 1, sm: 2, lg: 3 }`. */
  columns?: Columns | GridColumns;
  /** The stream whose audio plays (one at a time), or null for silence. Controlled. */
  audioStreamId?: string | null;
  /** The stream whose audio plays at first, uncontrolled. Defaults to none. */
  defaultAudioStreamId?: string | null;
  onAudioStreamChange?: (id: string | null) => void;
  /** The focused stream, shown large first. Controlled. */
  focusedStreamId?: string | null;
  /** The stream focused at first, uncontrolled. Defaults to none. */
  defaultFocusedStreamId?: string | null;
  onFocusedStreamChange?: (id: string | null) => void;
  /** Names the view. Defaults to the `mediaStreams` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Stream previews in a grid, with one tile's audio at a time, click-to-focus, and off-screen pausing. */
export function MultiView({
  streams,
  columns = { base: 1, sm: 2, lg: 3 },
  audioStreamId: audioProp,
  defaultAudioStreamId = null,
  onAudioStreamChange,
  focusedStreamId: focusedProp,
  defaultFocusedStreamId = null,
  onFocusedStreamChange,
  'aria-label': ariaLabel,
  className,
  ref,
}: MultiViewProps) {
  const messages = useMediaPlayerMessages();
  const [audioId, setAudioId] = useControllableState<string | null>(
    audioProp,
    defaultAudioStreamId,
    onAudioStreamChange,
  );
  const [focusedId, setFocusedId] = useControllableState<string | null>(
    focusedProp,
    defaultFocusedStreamId,
    onFocusedStreamChange,
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.mediaStreams}
      className={cn('min-w-0', className)}
    >
      <Grid columns={columns} gap="sm">
        {streams.map(({ id, ...stream }) => {
          const isFocused = id === focusedId;
          const isListening = id === audioId;
          return (
            <div
              key={id}
              data-stream-id={id}
              className={cn(
                'flex min-w-0 flex-col gap-1',
                isFocused && 'order-first col-span-full',
              )}
            >
              <StreamPreview
                {...stream}
                isMuted={!isListening}
                onMutedChange={(isMuted) => {
                  if (!isMuted) {
                    setAudioId(id);
                  } else if (isListening) {
                    setAudioId(null);
                  }
                }}
                controlsLayout={isFocused ? 'full' : 'none'}
                shouldPauseOffscreen
              />
              <div className="flex min-w-0 items-center gap-1 px-1.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{stream.title}</span>
                <Tooltip content={messages.mediaListenTo({ title: stream.title })}>
                  <IconButton
                    icon={Headphones}
                    size="sm"
                    aria-label={messages.mediaListenTo({ title: stream.title })}
                    isSelected={isListening}
                    onChange={(isSelected) => {
                      setAudioId(isSelected ? id : null);
                    }}
                  />
                </Tooltip>
                <Tooltip
                  content={
                    isFocused
                      ? messages.mediaShowAllStreams
                      : messages.mediaFocusStream({ title: stream.title })
                  }
                >
                  <IconButton
                    icon={isFocused ? Minimize2 : Maximize2}
                    size="sm"
                    aria-label={messages.mediaFocusStream({ title: stream.title })}
                    isSelected={isFocused}
                    onChange={(isSelected) => {
                      setFocusedId(isSelected ? id : null);
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          );
        })}
      </Grid>
    </div>
  );
}
