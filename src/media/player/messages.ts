// English defaults of the media players' strings (AudioPlayer, VideoPlayer, StreamPreview, MultiView,
// MediaTransport, Waveform, AudioMeter and PdfViewer). Keys are prefixed (`media…`, `meter…`, `pdf…`) so they never
// collide with other entry points' keys in the app's `messages` override.
import { useEntryMessages } from '../../provider/context';
import type { CoreMessages } from '../../provider/messages';

export interface MediaPlayerMessages {
  /** Play and pause buttons. */
  mediaPlay: string;
  mediaPause: string;
  /** Names the seek slider (its value is read as `mediaPositionValue`). */
  mediaPosition: string;
  /** The seek slider's value, for example "1:23 of 4:56". */
  mediaPositionValue: (params: { elapsed: string; total: string }) => string;
  /** The seek slider's value on a live stream: at the live edge. */
  mediaPositionLive: string;
  /** The seek slider's value on a live stream behind the live edge, for example "0:30 behind live". */
  mediaPositionBehindLive: (params: { behind: string }) => string;
  /** The time readout button's name: elapsed and total ("1:23 elapsed of 4:56"). */
  mediaTimeElapsed: (params: { elapsed: string; total: string }) => string;
  /** The time readout button's name when it shows the time left ("3:33 left of 4:56"). */
  mediaTimeRemaining: (params: { remaining: string; total: string }) => string;
  /** The visible time left, for example "−3:33". */
  mediaRemainingShort: (params: { remaining: string }) => string;
  /** Skip buttons, for example "Back 15 seconds". */
  mediaSkipBack: (params: { seconds: number }) => string;
  mediaSkipForward: (params: { seconds: number }) => string;
  /** The playback speed menu's name and its current value ("Playback speed, 1.5×"). */
  mediaPlaybackRate: string;
  mediaPlaybackRateValue: (params: { rate: string }) => string;
  /** A speed, for example "1.5×". */
  mediaRate: (params: { rate: string }) => string;
  /** Volume slider and mute toggle. */
  mediaVolume: string;
  mediaMute: string;
  mediaUnmute: string;
  /** The chapters/markers menu, and one marker ("Chorus, 1:05"). */
  mediaMarkers: string;
  mediaMarker: (params: { label: string; time: string }) => string;
  /** Previous and next track in a playlist. */
  mediaPreviousTrack: string;
  mediaNextTrack: string;
  /** Names an audio player by its track, for example "Solar wind (Ada)". */
  mediaTrackLabel: (params: { title: string; artist?: string }) => string;
  /** Live streams: the live badge and the "Go live" button. */
  mediaLive: string;
  mediaGoLive: string;
  /** The quality (rendition) menu and its automatic choice ("Auto (720p)"). */
  mediaQuality: string;
  mediaQualityAuto: string;
  mediaQualityAutoCurrent: (params: { rendition: string }) => string;
  /** A rendition, for example "720p" or "2.5 Mbps" when there's no height. */
  mediaRendition: (params: { height?: number; bitrate: string }) => string;
  /** The captions menu and its "off" choice. */
  mediaCaptions: string;
  mediaCaptionsOff: string;
  /** Picture-in-picture and full-screen toggles. */
  mediaPictureInPicture: string;
  mediaExitPictureInPicture: string;
  mediaFullScreen: string;
  mediaExitFullScreen: string;
  /** The stats overlay toggle and its heading. */
  mediaStats: string;
  /** Stats overlay labels. */
  mediaStatsRendition: string;
  mediaStatsBitrate: string;
  mediaStatsBandwidth: string;
  mediaStatsResolution: string;
  mediaStatsFps: string;
  mediaStatsBuffer: string;
  mediaStatsDropped: string;
  mediaStatsLatency: string;
  /** A stat that isn't known yet. */
  mediaStatsUnknown: string;
  /** Stats values. */
  mediaBitrate: (params: { kbps: number }) => string;
  mediaSeconds: (params: { seconds: string }) => string;
  mediaFrames: (params: { dropped: number; total: number }) => string;
  /** Errors shown in the player. */
  mediaErrorTitle: string;
  mediaErrorNotFound: string;
  mediaErrorForbidden: string;
  mediaErrorCors: string;
  mediaErrorNetwork: string;
  mediaErrorUnsupported: string;
  mediaErrorDecode: string;
  mediaErrorDashUnsupported: string;
  mediaErrorGeneric: string;
  /** Buffering, read while the player waits for data. */
  mediaBuffering: string;
  /** MultiView: focus a tile, go back to the grid, and choose whose audio plays. */
  mediaFocusStream: (params: { title: string }) => string;
  mediaShowAllStreams: string;
  mediaListenTo: (params: { title: string }) => string;
  /** Names a MultiView. */
  mediaStreams: string;
  /** AudioMeter: a channel without a label ("Channel 2"), and the default names of a stereo pair. */
  meterChannel: (params: { index: number }) => string;
  meterLeft: string;
  meterRight: string;
  /** AudioMeter's units. */
  meterUnitDbfs: string;
  meterUnitLufs: string;
  /** AudioMeter's text readout of one channel's peak, for example "L −12 dBFS". */
  meterPeak: (params: { channel: string; value: string; unit: string }) => string;
  /** A silent channel's level. */
  meterSilent: string;
  /** Announced once when a channel clips, and names the latched clip indicator. */
  meterClipped: (params: { label: string }) => string;
  /** The clip indicator's reset button. */
  meterResetClip: (params: { channel: string }) => string;
  /** PdfViewer: names the toolbar and the document. */
  pdfToolbar: string;
  pdfPageLabel: string;
  /** "of 40" beside the page number field. */
  pdfPageCount: (params: { total: number }) => string;
  /** A page, and the announcement when the page changes ("Page 3 of 40"). */
  pdfPageOf: (params: { page: number; total: number }) => string;
  pdfPreviousPage: string;
  pdfNextPage: string;
  pdfZoom: string;
  pdfZoomIn: string;
  pdfZoomOut: string;
  pdfFitWidth: string;
  pdfFitPage: string;
  pdfZoomPercent: (params: { percent: number }) => string;
  /** The zoom menu button's name, with its visible percentage ("Zoom, 120%"). */
  pdfZoomValue: (params: { percent: number }) => string;
  pdfSearch: string;
  /** The search result position, for example "3 of 12". */
  pdfMatchOf: (params: { current: number; total: number }) => string;
  pdfNoMatches: string;
  pdfPreviousMatch: string;
  pdfNextMatch: string;
  pdfDownload: string;
  pdfPrint: string;
  /** The thumbnails sidebar (and its drawer on phones). */
  pdfThumbnails: string;
  /** The password prompt. */
  pdfPasswordTitle: string;
  pdfPasswordDescription: (params: { title: string }) => string;
  pdfPassword: string;
  pdfPasswordIncorrect: string;
  pdfOpen: string;
  /** Shown when the document couldn't be opened. */
  pdfLoadError: string;
  pdfLoadErrorDescription: string;
  pdfInvalid: string;
  pdfNotFound: string;
  pdfPasswordRequired: string;
  pdfDownloadInstead: string;
  /** Explains a document without a text layer, such as a scan. */
  pdfNoText: string;
  pdfNoTextLabel: string;
}

export const defaultMediaPlayerMessages: MediaPlayerMessages = {
  mediaPlay: 'Play',
  mediaPause: 'Pause',
  mediaPosition: 'Position',
  mediaPositionValue: ({ elapsed, total }) => `${elapsed} of ${total}`,
  mediaPositionLive: 'Live',
  mediaPositionBehindLive: ({ behind }) => `${behind} behind live`,
  mediaTimeElapsed: ({ elapsed, total }) => `${elapsed} elapsed of ${total}`,
  mediaTimeRemaining: ({ remaining, total }) => `${remaining} left of ${total}`,
  mediaRemainingShort: ({ remaining }) => `−${remaining}`,
  mediaSkipBack: ({ seconds }) => `Back ${seconds} seconds`,
  mediaSkipForward: ({ seconds }) => `Forward ${seconds} seconds`,
  mediaPlaybackRate: 'Playback speed',
  mediaPlaybackRateValue: ({ rate }) => `Playback speed, ${rate}`,
  mediaRate: ({ rate }) => `${rate}×`,
  mediaVolume: 'Volume',
  mediaMute: 'Mute',
  mediaUnmute: 'Unmute',
  mediaMarkers: 'Chapters',
  mediaMarker: ({ label, time }) => `${label}, ${time}`,
  mediaPreviousTrack: 'Previous track',
  mediaNextTrack: 'Next track',
  mediaTrackLabel: ({ title, artist }) => (artist ? `${title} (${artist})` : title),
  mediaLive: 'Live',
  mediaGoLive: 'Go live',
  mediaQuality: 'Quality',
  mediaQualityAuto: 'Auto',
  mediaQualityAutoCurrent: ({ rendition }) => `Auto (${rendition})`,
  mediaRendition: ({ height, bitrate }) => (height ? `${height}p` : bitrate),
  mediaCaptions: 'Captions',
  mediaCaptionsOff: 'Off',
  mediaPictureInPicture: 'Picture in picture',
  mediaExitPictureInPicture: 'Exit picture in picture',
  mediaFullScreen: 'Full screen',
  mediaExitFullScreen: 'Exit full screen',
  mediaStats: 'Playback stats',
  mediaStatsRendition: 'Rendition',
  mediaStatsBitrate: 'Bitrate',
  mediaStatsBandwidth: 'Bandwidth',
  mediaStatsResolution: 'Resolution',
  mediaStatsFps: 'Frame rate',
  mediaStatsBuffer: 'Buffer',
  mediaStatsDropped: 'Dropped frames',
  mediaStatsLatency: 'Live latency',
  mediaStatsUnknown: '—',
  mediaBitrate: ({ kbps }) =>
    kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} kbps`,
  mediaSeconds: ({ seconds }) => `${seconds} s`,
  mediaFrames: ({ dropped, total }) => `${dropped} of ${total}`,
  mediaErrorTitle: 'Can’t play this media',
  mediaErrorNotFound: 'The file wasn’t found (404). It may have moved or been deleted.',
  mediaErrorForbidden: 'The server refused access to the file.',
  mediaErrorCors:
    'The file couldn’t be reached. Its server may be down, or it may not allow playing from this site (CORS).',
  mediaErrorNetwork: 'A network error stopped playback. Check the connection and try again.',
  mediaErrorUnsupported: 'This browser can’t play this format or codec.',
  mediaErrorDecode: 'The file is damaged or couldn’t be decoded.',
  mediaErrorDashUnsupported:
    'This browser can’t play DASH streams on its own, and no DASH player was provided.',
  mediaErrorGeneric: 'Playback failed.',
  mediaBuffering: 'Buffering',
  mediaFocusStream: ({ title }) => `Focus ${title}`,
  mediaShowAllStreams: 'Show all streams',
  mediaListenTo: ({ title }) => `Listen to ${title}`,
  mediaStreams: 'Streams',
  meterChannel: ({ index }) => `Channel ${index}`,
  meterLeft: 'L',
  meterRight: 'R',
  meterUnitDbfs: 'dBFS',
  meterUnitLufs: 'LUFS',
  meterPeak: ({ channel, value, unit }) => `${channel} ${value} ${unit}`,
  meterSilent: '−∞',
  meterClipped: ({ label }) => `${label} clipped`,
  meterResetClip: ({ channel }) => `Reset clip indicator, ${channel}`,
  pdfToolbar: 'Document tools',
  pdfPageLabel: 'Page',
  pdfPageCount: ({ total }) => `of ${total}`,
  pdfPageOf: ({ page, total }) => `Page ${page} of ${total}`,
  pdfPreviousPage: 'Previous page',
  pdfNextPage: 'Next page',
  pdfZoom: 'Zoom',
  pdfZoomIn: 'Zoom in',
  pdfZoomOut: 'Zoom out',
  pdfFitWidth: 'Fit width',
  pdfFitPage: 'Fit page',
  pdfZoomPercent: ({ percent }) => `${percent}%`,
  pdfZoomValue: ({ percent }) => `Zoom, ${percent}%`,
  pdfSearch: 'Search document',
  pdfMatchOf: ({ current, total }) => `${current} of ${total}`,
  pdfNoMatches: 'No matches',
  pdfPreviousMatch: 'Previous match',
  pdfNextMatch: 'Next match',
  pdfDownload: 'Download',
  pdfPrint: 'Print',
  pdfThumbnails: 'Pages',
  pdfPasswordTitle: 'Password required',
  pdfPasswordDescription: ({ title }) => `“${title}” is protected. Enter its password to open it.`,
  pdfPassword: 'Password',
  pdfPasswordIncorrect: 'That password isn’t right. Try again.',
  pdfOpen: 'Open',
  pdfLoadError: 'Couldn’t open this document',
  pdfLoadErrorDescription: 'Something went wrong while loading it.',
  pdfInvalid: 'The file isn’t a valid PDF.',
  pdfNotFound: 'The document wasn’t found.',
  pdfPasswordRequired: 'This document needs a password to open.',
  pdfDownloadInstead: 'Download instead',
  pdfNoText:
    'This document is a scanned image without a text layer, so its text can’t be selected, searched or read aloud.',
  pdfNoTextLabel: 'About this document’s text',
};

/** The strings the media player components read: the core strings and their own. */
export type MediaPlayerStrings = CoreMessages & MediaPlayerMessages;

/** The media players' strings, with the app's overrides from `UIProvider`. */
export function useMediaPlayerMessages(): MediaPlayerStrings {
  return useEntryMessages(defaultMediaPlayerMessages);
}
