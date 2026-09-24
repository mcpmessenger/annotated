// ─── Floating Shadow DOM Host & Window Message Router ───────────────────────

import type { Annotation } from '../types/annotation';
import type { PostMessage } from '../types/messages';
import { buildPageInfo, seekToTimestamp } from './selection';
import { startCropScreenshot } from './screenshot-crop';
import { startDictation, stopDictation } from './dictation';
import { capture240pVideoClip, stopRecordingNow } from './video-clip';

export let widgetContainer: HTMLElement | null = null;
export let shadowRoot: ShadowRoot | null = null;
export let widgetIframe: HTMLIFrameElement | null = null;

let isDragging = false;
let dragOffset = { x: 0, y: 0 };

export function ensureWidgetContainer(): { container: HTMLElement; shadow: ShadowRoot } {
  if (widgetContainer && shadowRoot && document.body.contains(widgetContainer)) {
    return { container: widgetContainer, shadow: shadowRoot };
  }

  widgetContainer = document.createElement('div');
  widgetContainer.id = `annotated-layer-${crypto.randomUUID()}`;
  widgetContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483645;
    pointer-events: none;
  `;

  shadowRoot = widgetContainer.attachShadow({ mode: 'open' });
  document.body.appendChild(widgetContainer);

  return { container: widgetContainer, shadow: shadowRoot };
}

export function positionWidget(iframe: HTMLIFrameElement, x?: number, y?: number): void {
  const width = 360;
  const height = parseInt(iframe.style.height || '390', 10);
  const padding = 16;

  let targetX = x !== undefined ? x : window.innerWidth - width - padding;
  let targetY = y !== undefined ? y : padding;

  targetX = Math.max(padding, Math.min(window.innerWidth - width - padding, targetX));
  targetY = Math.max(padding, Math.min(window.innerHeight - height - padding, targetY));

  iframe.style.left = `${targetX}px`;
  iframe.style.top = `${targetY}px`;
}

export function createWidget(): HTMLIFrameElement {
  const { shadow } = ensureWidgetContainer();

  if (widgetIframe && shadow.contains(widgetIframe)) {
    widgetIframe.style.display = 'block';
    return widgetIframe;
  }

  widgetIframe = document.createElement('iframe');
  widgetIframe.src = chrome.runtime.getURL('widget.html');
  widgetIframe.setAttribute('allow', 'microphone; display-capture');
  widgetIframe.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 360px;
    height: 390px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08);
    z-index: 2147483646;
    pointer-events: auto;
    transition: height 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: block;
    background: transparent;
  `;

  shadow.appendChild(widgetIframe);
  positionWidget(widgetIframe);

  // Wire dragging handlers on document
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !widgetIframe) return;
    widgetIframe.style.left = `${e.clientX - dragOffset.x}px`;
    widgetIframe.style.top = `${e.clientY - dragOffset.y}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging && widgetIframe) {
      isDragging = false;
      widgetIframe.style.pointerEvents = 'auto';
    }
  });

  return widgetIframe;
}

export function openAnnotationInWidget(annotation: Annotation): void {
  const iframe = createWidget();
  const sendView = () => {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'VIEW_ANNOTATION', annotation }, '*');
    }
  };
  sendView();
  setTimeout(sendView, 120);
}

export function setupMessageRouter(onReloadAnnotations: () => void): void {
  window.addEventListener('message', (event) => {
    const data = event.data as PostMessage | undefined;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'DRAG_START':
        if (widgetIframe) {
          isDragging = true;
          const rect = widgetIframe.getBoundingClientRect();
          dragOffset = { x: data.clientX - rect.left, y: data.clientY - rect.top };
          widgetIframe.style.pointerEvents = 'none';
        }
        break;

      case 'CLOSE_WIDGET':
        if (widgetIframe) {
          widgetIframe.style.display = 'none';
          stopDictation(widgetIframe);
        }
        break;

      case 'RESIZE_WIDGET':
        if (widgetIframe && data.height) {
          widgetIframe.style.height = `${data.height}px`;
        }
        break;

      case 'SEEK_MEDIA':
        if (typeof data.seconds === 'number') {
          seekToTimestamp(data.seconds);
        }
        break;

      case 'START_DICTATION':
        startDictation(widgetIframe);
        break;

      case 'STOP_DICTATION':
        stopDictation(widgetIframe);
        break;

      case 'CAPTURE_VIDEO':
        capture240pVideoClip(data.duration || 15, (res: any) => {
          if (widgetIframe?.contentWindow) {
            widgetIframe.contentWindow.postMessage({ type: 'VIDEO_CAPTURED', ...res }, '*');
          }
        });
        break;

      case 'STOP_VIDEO':
        stopRecordingNow();
        break;

      case 'GET_PAGE_INFO':
        if (widgetIframe?.contentWindow) {
          const info = buildPageInfo();
          widgetIframe.contentWindow.postMessage({ type: 'PAGE_INFO_RESPONSE', ...info }, '*');
        }
        break;

      case 'SAVE_ANNOTATION':
        onReloadAnnotations();
        break;

      case 'RELOAD_ANNOTATIONS':
        onReloadAnnotations();
        break;

      case 'OPEN_TAB':
      case 'OPEN_URL':
        if (data.url) {
          chrome.runtime.sendMessage({ type: 'openTab', url: data.url });
        }
        break;

      case 'TAKE_SCREENSHOT':
      case 'START_SCREENSHOT_SELECTION':
        startCropScreenshot(
          widgetIframe,
          (dataUrl) => {
            if (widgetIframe?.contentWindow) {
              widgetIframe.contentWindow.postMessage({ type: 'SCREENSHOT_CAPTURED', dataUrl }, '*');
            }
          },
          (error) => {
            if (widgetIframe?.contentWindow) {
              widgetIframe.contentWindow.postMessage({ type: 'SCREENSHOT_CAPTURED', error }, '*');
            }
          }
        );
        break;
    }
  });
}
