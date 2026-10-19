// Part of @centennial-oss/react-ux-core/media: players (audio, video, streams), the shared transport, waveforms,
// audio meters and the PDF viewer.

export {
  AudioPlayer,
  type AudioMarker,
  type AudioPlayerProps,
  type AudioTrack,
} from './AudioPlayer';
export { AudioMeter, type AudioMeterHandle, type AudioMeterProps } from './AudioMeter';
export { type MeterZones } from './meterMath';
export {
  MediaTransport,
  transportPropsFromMedia,
  type MediaTransportProps,
} from './MediaTransport';
export {
  defaultMediaPlayerMessages,
  useMediaPlayerMessages,
  type MediaPlayerMessages,
  type MediaPlayerStrings,
} from './messages';
export { MultiView, type MultiViewProps, type MultiViewStream } from './MultiView';
export { PdfViewer, type PdfViewerProps, type PdfZoom } from './PdfViewer';
export { computePeaks, decodePeaks, normalizePeaks, resamplePeaks } from './peaks';
export { inferMediaType, type MediaSourceLoader, type MediaSourceType } from './source';
export type { PlaybackStats } from './stats';
export {
  StreamPreview,
  StreamStatusChip,
  type StreamPreviewProps,
  type StreamStatus,
} from './StreamPreview';
export { formatMediaTime, type MediaMarker, type MediaTimeRange } from './time';
export {
  useMediaElement,
  type MediaElementControls,
  type MediaElementState,
} from './useMediaElement';
export { VideoPlayer, type VideoCaption, type VideoPlayerProps } from './VideoPlayer';
export { Waveform, type WaveformProps } from './Waveform';
