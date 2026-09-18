# Implementation Plan: Fix WebM Video Duration & Tab Audio Capture

## Problem Analysis

### Problem 1: WebM Timer Carries On (Duration Mismatch)
- **Root Cause:** Chromium`s `MediaRecorder` outputs `.webm` blobs with **missing/incomplete WebM duration header metadata**. When rendered in `<video controls>`, the player doesn`t know the end timestamp, causing the timeline/timer to keep ticking past the recording stop point.
- **Fix:** Calculate exact `durationMs = Date.now() - startTime` and patch the 4-byte WebM `Duration` EBML header before creating the `Blob` URL.

### Problem 2: Still No Audio on Captured Video Clips
- **Root Cause:** Videos hosted on Twitter/X (`video.twimg.com`) or YouTube (`googlevideo.com`) are cross-origin. Standard HTML5 `video.captureStream()` and `AudioContext` are blocked by browser CORS security rules, resulting in zeroed-out (silent) audio.
- **Fix:** Use Chrome`s official **`chrome.tabCapture` API** (`"tabCapture"` permission in `manifest.json`). `tabCapture` bypasses CORS completely, capturing 100% of the active tab`s audio output with crystal-clear sound.

---

## Proposed Changes

### 1. `extension/manifest.json`
- Add `"tabCapture"` to `"permissions"`.

### 2. `extension/background.js`
- Add `getTabAudio` message handler using `chrome.tabCapture.capture({ audio: true })`.

### 3. `extension/content.js`
- Patch WebM duration header using `durationMs = Date.now() - startTime`.
- Fuse `tabCapture` audio track with `canvas.captureStream(24)` 240p video track.

---

## Verification Plan
1. Test 4-second video clip: verify timeline stops cleanly at `0:04`.
2. Test audio playback: verify Twitter/X and YouTube clips record full tab sound.
