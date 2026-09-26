// ─── Message Types ────────────────────────────────────────────────────────────
// Discriminated union for all cross-context messages in the Annotated extension.
// Used by content script ↔ widget iframe (postMessage) and
// content/widget ↔ background (chrome.runtime messages).

// ─── Widget → Content (postMessage to parent) ─────────────────────────────────

export interface DragStartMessage {
  type: 'DRAG_START';
  clientX: number;
  clientY: number;
}

export interface CloseWidgetMessage {
  type: 'CLOSE_WIDGET';
}

export interface ResizeWidgetMessage {
  type: 'RESIZE_WIDGET';
  height: number;
}

export interface SeekMediaMessage {
  type: 'SEEK_MEDIA';
  seconds: number;
}

export interface SeekVideoMessage {
  type: 'SEEK_VIDEO';
  seconds: number;
}

export interface StartDictationMessage {
  type: 'START_DICTATION';
}

export interface StopDictationMessage {
  type: 'STOP_DICTATION';
}

export interface CaptureVideoMessage {
  type: 'CAPTURE_VIDEO';
  duration: number;
  startTs?: number;
  endTs?: number;
  isLiveRecord?: boolean;
}

export interface StopVideoMessage {
  type: 'STOP_VIDEO';
}

export interface GetVideoStateMessage {
  type: 'GET_VIDEO_STATE';
}

export interface GetPageInfoMessage {
  type: 'GET_PAGE_INFO';
}

export interface SaveAnnotationMessage {
  type: 'SAVE_ANNOTATION';
  annotation: import('./annotation').Annotation;
}

export interface ReloadAnnotationsMessage {
  type: 'RELOAD_ANNOTATIONS';
}

export interface OpenTabMessage {
  type: 'OPEN_TAB';
  url: string;
}

export interface OpenUrlMessage {
  type: 'OPEN_URL';
  url: string;
}

export interface TakeScreenshotMessage {
  type: 'TAKE_SCREENSHOT';
}

export interface StartScreenshotSelectionMessage {
  type: 'START_SCREENSHOT_SELECTION';
}

// ─── Content → Widget (postMessage to iframe) ─────────────────────────────────

export interface PageInfoResponseMessage {
  type: 'PAGE_INFO_RESPONSE';
  title: string;
  url: string;
  hostname: string;
  quote?: string;
  selectedText?: string;
  media_timestamp?: number | null;
  media_duration?: number | null;
  video_captions?: string;
}

export interface VideoStateResponseMessage {
  type: 'VIDEO_STATE_RESPONSE';
  currentTime: number;
  duration: number;
  paused: boolean;
}

export interface ScreenshotCapturedMessage {
  type: 'SCREENSHOT_CAPTURED';
  dataUrl?: string;
  error?: string;
}

export interface VideoCapturedMessage {
  type: 'VIDEO_CAPTURED';
  dataUrl?: string;
  duration?: number;
  startTs?: number;
  endTs?: number;
  error?: string;
}

export interface ViewAnnotationMessage {
  type: 'VIEW_ANNOTATION';
  annotation: import('./annotation').Annotation;
}

// ─── Dictation Events (Content → Widget) ──────────────────────────────────────

export interface DictationStatusMessage {
  type: 'DICTATION_STATUS';
  status: string;
}

export interface DictationStartedMessage {
  type: 'DICTATION_STARTED';
}

export interface DictationResultMessage {
  type: 'DICTATION_RESULT';
  text?: string;
  finalTranscript?: string;
  interimTranscript?: string;
}

export interface DictationEndedMessage {
  type: 'DICTATION_ENDED';
}

export interface DictationErrorMessage {
  type: 'DICTATION_ERROR';
  error: string;
}

// ─── Chrome Runtime Messages ──────────────────────────────────────────────────

export interface RuntimeOpenTabMessage {
  type: 'openTab';
  url: string;
}

export interface RuntimeCaptureScreenshotMessage {
  type: 'CAPTURE_SCREENSHOT';
}

export interface RuntimeCaptureScreenshotLegacyMessage {
  type: 'captureScreenshot';
}

export interface RuntimeGetTabAudioStreamIdMessage {
  type: 'getTabAudioStreamId';
  tabId?: number;
}

export interface RuntimeEnsureOffscreenMessage {
  type: 'ENSURE_OFFSCREEN';
}

export interface RuntimeSelectionMessage {
  type: 'selection';
  quote?: string;
  title?: string;
  url?: string;
  hostname?: string;
  selectedText?: string;
  media_timestamp?: number | null;
}

export interface RuntimeToggleWidgetMessage {
  type: 'TOGGLE_WIDGET';
}

export interface RuntimeOpenWidgetMessage {
  type: 'openWidget';
}

export interface RuntimeSaveAnnotationMessage {
  type: 'saveAnnotation';
  annotation: import('./annotation').Annotation;
}

export interface RuntimeGetPageInfoMessage {
  type: 'getPageInfo';
}

export interface RuntimeCaptureVideoMessage {
  type: 'captureVideo';
  duration: number;
}

export interface RuntimeStopVideoMessage {
  type: 'stopVideo';
}

export interface RuntimeStartDictationMessage {
  type: 'START_DICTATION';
}

export interface RuntimeStopDictationMessage {
  type: 'STOP_DICTATION';
}

export interface RuntimeOffscreenStartAudioBridgeMessage {
  type: 'OFFSCREEN_START_AUDIO_BRIDGE';
  sdp: string;
}

export interface RuntimeOffscreenStopAudioBridgeMessage {
  type: 'OFFSCREEN_STOP_AUDIO_BRIDGE';
}

// ─── Union Types ──────────────────────────────────────────────────────────────

/** Messages sent from widget iframe to content script via postMessage */
export type WidgetToContentMessage =
  | DragStartMessage
  | CloseWidgetMessage
  | ResizeWidgetMessage
  | SeekMediaMessage
  | SeekVideoMessage
  | StartDictationMessage
  | StopDictationMessage
  | CaptureVideoMessage
  | StopVideoMessage
  | GetVideoStateMessage
  | GetPageInfoMessage
  | SaveAnnotationMessage
  | ReloadAnnotationsMessage
  | OpenTabMessage
  | OpenUrlMessage
  | TakeScreenshotMessage
  | StartScreenshotSelectionMessage;

/** Messages sent from content script to widget iframe via postMessage */
export type ContentToWidgetMessage =
  | PageInfoResponseMessage
  | VideoStateResponseMessage
  | ScreenshotCapturedMessage
  | VideoCapturedMessage
  | ViewAnnotationMessage
  | DictationStatusMessage
  | DictationStartedMessage
  | DictationResultMessage
  | DictationEndedMessage
  | DictationErrorMessage;

/** All postMessage message types */
export type PostMessage = WidgetToContentMessage | ContentToWidgetMessage;

/** All chrome.runtime message types */
export type RuntimeMessage =
  | RuntimeOpenTabMessage
  | RuntimeCaptureScreenshotMessage
  | RuntimeCaptureScreenshotLegacyMessage
  | RuntimeGetTabAudioStreamIdMessage
  | RuntimeEnsureOffscreenMessage
  | RuntimeSelectionMessage
  | RuntimeToggleWidgetMessage
  | RuntimeOpenWidgetMessage
  | RuntimeSaveAnnotationMessage
  | RuntimeGetPageInfoMessage
  | RuntimeCaptureVideoMessage
  | RuntimeStopVideoMessage
  | RuntimeStartDictationMessage
  | RuntimeStopDictationMessage
  | RuntimeOffscreenStartAudioBridgeMessage
  | RuntimeOffscreenStopAudioBridgeMessage;
