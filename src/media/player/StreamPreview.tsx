// StreamPreview (FR-038): a VideoPlayer for monitoring a stream, with a status chip ("Live", "Offline",
// "Degraded") over the picture. It defaults to what a preview wants: live, muted autoplay, compact controls, and
// pausing while scrolled out of view.

import type { ReactNode } from 'react';
import { StatusDot } from '../../components/StatusDot/StatusDot';
import { cn } from '../../utils/cn';
import type { Tone } from '../../utils/types';
import { VideoPlayer, type VideoPlayerProps } from './VideoPlayer';

export interface StreamStatus {
  tone: Tone;
  /** For example "Live", "Offline" or "Degraded". */
  label: string;
}

export interface StreamPreviewProps extends VideoPlayerProps {
  /** A status chip over the picture. Its tone has a shape as well as a colour. */
  status?: StreamStatus;
}

/** The status chip over a preview: a dot whose shape follows the tone, and the label. */
export function StreamStatusChip({
  status,
  className,
}: {
  status: StreamStatus;
  className?: string;
}): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-surface-1/90 px-2 py-0.5 text-xs font-medium shadow-raised',
        className,
      )}
    >
      <StatusDot tone={status.tone} label={status.label} size="sm" />
    </span>
  );
}

/** A live preview with a status chip; muted autoplay, compact controls and off-screen pausing by default. */
export function StreamPreview({
  status,
  isLive = true,
  isMuted = true,
  shouldAutoPlay = true,
  controlsLayout = 'compact',
  shouldPauseOffscreen = true,
  hasQualityMenu = true,
  overlay,
  ...rest
}: StreamPreviewProps) {
  return (
    <VideoPlayer
      {...rest}
      isLive={isLive}
      isMuted={isMuted}
      shouldAutoPlay={shouldAutoPlay}
      controlsLayout={controlsLayout}
      shouldPauseOffscreen={shouldPauseOffscreen}
      hasQualityMenu={hasQualityMenu}
      overlay={
        status || overlay !== undefined ? (
          <span className="flex items-center gap-1">
            {overlay}
            {status && <StreamStatusChip status={status} />}
          </span>
        ) : undefined
      }
    />
  );
}
