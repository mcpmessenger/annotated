// ─── Viewport Screenshot Area Cropper ─────────────────────────────────────────

export function startCropScreenshot(
  widgetIframe: HTMLIFrameElement | null,
  onCaptured: (dataUrl: string) => void,
  onError?: (err: string) => void
): void {
  // Hide the widget iframe immediately so it doesn't appear in the screenshot
  if (widgetIframe) {
    widgetIframe.style.visibility = 'hidden';
  }

  // Prevent multiple crop overlays
  const existing = document.getElementById('annotated-crop-overlay');
  if (existing) existing.remove();

  // Fullscreen overlay
  const overlay = document.createElement('div');
  overlay.id = 'annotated-crop-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    cursor: crosshair;
    user-select: none;
    background: rgba(0, 0, 0, 0.35);
  `;

  // Instructional pill banner at top-center
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.92);
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 9999px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12);
    pointer-events: none;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  banner.innerHTML = `<span style="font-size: 15px;">📸</span> Drag to crop screenshot &nbsp;·&nbsp; <kbd style="background: rgba(255,255,255,0.18); padding: 1px 6px; border-radius: 4px; font-size: 11px;">ESC</kbd> to cancel`;
  overlay.appendChild(banner);

  // Selection crop box
  const cropBox = document.createElement('div');
  cropBox.style.cssText = `
    position: absolute;
    display: none;
    border: 2px solid #ffd21a;
    box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.45), 0 0 12px rgba(255, 210, 26, 0.5);
    background: transparent;
    pointer-events: none;
  `;
  overlay.appendChild(cropBox);

  // Dimensions badge
  const dimBadge = document.createElement('div');
  dimBadge.style.cssText = `
    position: absolute;
    bottom: -26px;
    right: 0;
    background: #ffd21a;
    color: #000;
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
  `;
  cropBox.appendChild(dimBadge);

  let startX = 0;
  let startY = 0;
  let isDragging = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  };

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (widgetIframe) {
      widgetIframe.style.visibility = 'visible';
    }
  };

  window.addEventListener('keydown', onKeyDown);

  overlay.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    isDragging = true;
    cropBox.style.left = `${startX}px`;
    cropBox.style.top = `${startY}px`;
    cropBox.style.width = '0px';
    cropBox.style.height = '0px';
    cropBox.style.display = 'block';
  });

  overlay.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    cropBox.style.left = `${left}px`;
    cropBox.style.top = `${top}px`;
    cropBox.style.width = `${width}px`;
    cropBox.style.height = `${height}px`;
    dimBadge.textContent = `${Math.round(width)} × ${Math.round(height)}`;
  });

  overlay.addEventListener('mouseup', (e: MouseEvent) => {
    if (!isDragging) return;
    isDragging = false;

    const endX = e.clientX;
    const endY = e.clientY;
    const cropX = Math.min(startX, endX);
    const cropY = Math.min(startY, endY);
    const cropW = Math.abs(endX - startX);
    const cropH = Math.abs(endY - startY);

    cleanup();

    if (cropW < 8 || cropH < 8) {
      return; // Too small, count as click cancel
    }

    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
        if (!response?.dataUrl) {
          if (onError) onError('Failed to capture screen image');
          return;
        }

        const dpr = window.devicePixelRatio || 1;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(cropW * dpr);
          canvas.height = Math.round(cropH * dpr);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(
            img,
            Math.round(cropX * dpr),
            Math.round(cropY * dpr),
            Math.round(cropW * dpr),
            Math.round(cropH * dpr),
            0,
            0,
            Math.round(cropW * dpr),
            Math.round(cropH * dpr)
          );

          const croppedDataUrl = canvas.toDataURL('image/png');
          onCaptured(croppedDataUrl);
        };
        img.onerror = () => {
          if (onError) onError('Failed to process captured image');
        };
        img.src = response.dataUrl;
      });
    }, 60);
  });

  document.documentElement.appendChild(overlay);
}
