# Implementation Plan: v3 Multimodal Video Clipping & $5,000 Bounty Specs

This plan upgrades **Annotated** to 100% compliance with [Jason Calacanis's $5k Bounty Contest Checklist](https://annotated.lovable.app/).

## Contest Requirements Audit & Checklist

| Requirement | Status | Action Plan |
| :--- | :--- | :--- |
| **1. Sidebar Chrome Extension** | ⚠️ Partial | Enable official Chrome `sidePanel` API in `manifest.json`. |
| **2. "File a Claim" Button** | ❌ Missing | Add visible "File a claim" button on every annotation card & detail page. |
| **3. Always Link to Source** | ✅ Built | Direct status permalinks and source domain tags. |
| **4. Sign Up (X / Google)** | ✅ Built | Google OAuth setup in Supabase. |
| **5. Max 90s Video/Audio Clip** | ❌ Missing | Add 90s max trim control & validation. |
| **6. Video Downscaled to 240p** | ❌ Missing | Downscale video recordings using Canvas 240p scaling (`426x240`). |
| **7. Recorded Audio Commentary** | ⚠️ Hidden | Enable `MediaRecorder` voice recording & Supabase audio upload. |
| **8. Public Social Feed + Comments**| ✅ Built | Explore feed, Google auth, comments & emoji reactions. |

---

## User Review Required

> [!IMPORTANT]
> **Fair Use & "File a Claim" Button**
> Every annotation page must contain a visible "File a claim" button. We will wire this to open a Fair Use / DMCA dispute form or direct email trigger to `magnetarsenti@gmail.com`.

> [!TIP]
> **Video 240p Downsizing & 90s Cap**
> To meet the contest spec, captured video clips will be dynamically re-encoded via HTML5 Canvas to 240p (`426x240`) at max 90 seconds. This keeps bandwidth ultra-low and respects fair use guidelines.

---

## Proposed Technical Changes

### 1. Chrome Extension (`extension/`)
- **`manifest.json`**:
  - Add `"sidePanel"` permission and `"side_panel": { "default_path": "widget.html" }`.
- **`widget.html` & `widget.js`**:
  - **Video Clipper**: Add start/end time trim controls (capped at 90 seconds max).
  - **240p Canvas Downscaler**: Render video frames to a `426x240` canvas before recording with `MediaRecorder`.
  - **Voice Audio Commentary**: Enable `dictateBtn` to record user audio voice commentary, upload `.webm` audio blob to Supabase `annotation-media` bucket, and attach `audio_url`.

### 2. Database Schema (`supabase/`)
- Add `audio_url TEXT` column to `annotations` table.
- Add `is_disputed BOOLEAN DEFAULT false` column to `annotations` table.

### 3. Next.js Web App (`app/` & `components/`)
- **`AnnotationCard.tsx` & Detail Page**:
  - **"File a Claim" Button**: Add visible DMCA / Fair Use claim button with modal trigger.
  - **Audio Commentary Player**: Display audio player (`<audio controls>`) when `annotation.audio_url` exists.
  - **240p Video Player**: Render video clips with a small badge "240p Fair Use Clip (Max 90s)".

---

## Verification Plan

### Automated & Manual Verification
1. **Chrome Sidebar Verification**: Verify extension opens smoothly in Chrome's native side panel.
2. **Video Downsizing & 90s Cap**: Test clipping a video, verify resolution is exactly 240p (`426x240`) and length <= 90s.
3. **Voice Audio Commentary**: Record voice commentary in extension, publish, and verify audio plays on website card.
4. **"File a Claim"**: Click "File a claim" on card and verify modal/dispute workflow.
