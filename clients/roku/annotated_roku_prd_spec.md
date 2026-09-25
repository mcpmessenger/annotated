# Product Requirement Document (PRD) & Technical Specification
## Annotated Consumer TV Application (Roku OS / SceneGraph)
**Version:** 1.0.0-FHD  
**Author:** Annotated Core Architecture Team  
**License:** AGPL-3.0-only  
**Target Hardware:** Roku OS 12.0+ (Streaming Stick 4K, Roku TV 55"+)

---

## 1. Executive Summary & Brand Identity

The **Annotated Roku Consumer App** brings the public annotation layer for the web directly to the 10-foot living room experience. Viewers watch synchronized video streams with live, real-time community notes, author commentary, timestamp-anchored highlights, signature reactions, and instant fact-checks.

### 1.1 Brand Standards & Visual Identity
To maintain visual consistency with the web platform (`annotated-repo`):
- **Logo Wordmark**: Strict lowercase `annotated` followed by an accent red period: **`annotated.`**
  - Text: `annotated` in white (`#FFFFFF`) / bold tracking.
  - Period: `.` in high-impact red (`#EF4444` / `0xEF4444FF`).
- **Brand Colors**:
  - `Background`: Deep Obsidian Black (`#090D16` / `0x090D16FF`).
  - `Surface Cards`: Slate / Zinc 900 (`#111827` / `0x111827FF`).
  - `Borders`: Subdued Graphite (`#1F2937` / `0x1F2937FF`).
  - `Accent Primary`: Electric Cyan (`#38BDF8` / `0x38BDF8FF`).
  - `Fact Check Emerald`: Mint / Emerald (`#34D399` / `0x34D399FF`).
  - `Brand Period Red`: Crimson (`#EF4444` / `0xEF4444FF`).
- **Universal Symbols**:
  - `⚡` (Lightning Bolt): The mandatory fact-checking symbol across all platforms.
  - `🔥 🤔 💡 💯 👎`: The 5 standardized signature reactions.

---

## 2. 10-Foot UI/UX Specifications

### 2.1 Resolution & Safe Zones
- **Base Canvas**: 1920 x 1080 (FHD).
- **Title Safe Margin**: 96px (5% safe margin from TV bezel).
- **Action Safe Margin**: 64px (3.5% safe margin).

### 2.2 Layout Grid (Two-Column Living Room Architecture)
```
+-----------------------------------------------------------------------------------------------+
|  [Logo] annotated.   |  Live Video Annotation & Fact-Checking        [*] Notes   [OK] React   |
+-----------------------------------------------------------------------------------------------+
|                                                              |                                |
|  MAIN STAGE (1140px x 640px)                                 |  COMMUNITY NOTES RAIL (590px)  |
|  +--------------------------------------------------------+  |  +--------------------------+  |
|  | [Video Title: 04:12 / 18:30]                           |  |  | Community Notes (15)     |  |
|  |                                                        |  |  +--------------------------+  |
|  |               <Video> Player Stream                    |  |  | [Card 1: Active Synced]   |  |
|  |                                                        |  |  | @author · 04:12           |  |
|  +--------------------------------------------------------+  |  | "Quote text..."          |  |
|                                                              |  | Commentary note text...  |  |
|  ACTION BAR (Pill Row)                                       |  | [🔥 34] [💡 18] [⚡ Ver]  |  |
|  [⚡ Fact Check]  [🔥 142]  [🤔 38]  [💡 85]  [💯 210]  [👎 4]|  +--------------------------+  |
|                                                              |  | [Card 2: Synced]         |  |
|  FACT CHECK BANNER (Collapsible)                             |  | @author · 02:45           |  |
|  ⚡ COMMUNITY FACT CHECK: VERIFIED ACCURATE                   |  +--------------------------+  |
|  "Source validated against peer-reviewed citations..."       |  | [Card 3: Synced]         |  |
|                                                              |  +--------------------------+  |
+-----------------------------------------------------------------------------------------------+
```

---

## 3. Data Ingestion & Supabase Architecture

### 3.1 Network Communication
- UI rendering runs strictly decoupled from network I/O via `AnnotationFeedTask` extending `<Task>`.
- Client engine uses native `roUrlTransfer` configured with `common:/certs/ca-bundle.crt`.
- Supabase REST endpoint: `GET https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations`.
- Real-time binding maps:
  - `page_title` -> `videoTitle.text`
  - `hostname` -> `@hostname`
  - `quote` -> Quote snippet card with quotation marks
  - `comment` -> User note with newline normalization
  - `media_timestamp` -> Pill timestamp badge

---

## 4. 10-Foot Lean-Back UX & Remote Interaction Architecture

Designing for a 5-way D-pad (`Up`, `Down`, `Left`, `Right`, `OK`, `Back`, `Options / *`) requires a strict dual-mode focus hierarchy tailored for living room consumption.

### 4.1 Dual-Mode Focus Hierarchy

```
[State A: Passive Playback (Default)]
       │
       │  Press [*] Star / Options
       ▼
[State B: Active Browsing (Modal/Rail Focus)]
       │
       │  Press [Back] or [OK]
       ▼
[Resume Playback at Target Timestamp]
```

#### State A: Passive Playback (Default)
- **Focus Target**: Held invisibly by the hidden video transport controller.
- **Behavior**: The video plays continuously. The Community Notes Rail **auto-scrolls** via a high-efficiency timer observing the `<Video>` node's `position` field. When playback passes `00:15`, the note anchored to `00:15` automatically highlights and centers in the rail.
- **Remote Mapping**:
  - `Left` / `Right`: Instant seek backward / forward 10 seconds.
  - `Up` / `Down`: Skip to previous / next annotated video in the live feed.
  - `OK`: Toggle Pause / Play.
  - `* (Options)`: Transition to **State B (Active Browsing)**.

#### State B: Active Browsing
- **Trigger**: User presses `Options / *` or navigates focus into the Notes Rail.
- **Behavior**: Playback soft-pauses (or audio ducks to 20% with slight video dimming). Focus locks directly onto the Community Notes Rail. Auto-scrolling disables to prevent layout thrashing while reading.
- **Remote Mapping**:
  - `Up` / `Down`: Manually scroll through the chronological or upvoted annotation timeline.
  - `OK`: Expand selected note to read full discourse, view verified sources, or fire reactions.
  - `Back`: Exit Active Browsing, restore focus to video, and resume playback from the selected note's exact `media_timestamp`.

---

## 5. Cross-App TV Video Annotation Sync (The Overlay Challenge)

Roku OS enforces a strict channel sandbox boundary: **third-party channels cannot draw UI overlays on top of external commercial apps** (e.g. Netflix, Disney+, Amazon Prime Video, or YouTube).

### 5.1 Architecture Evaluation Matrix

| Strategy | ECP Second-Screen Polling (Roku API) | ACR / Audio Fingerprinting (Companion Mic) | In-Channel Native Stage (Current) |
| :--- | :--- | :--- | :--- |
| **How it Works** | Mobile/web app polls Roku ECP `:8060/query/media-player` over local Wi-Fi. | Mobile companion listens to TV speaker audio and queries an acoustic fingerprint DB. | User-clipped videos play directly within the Annotated Roku Channel `<Video>` node. |
| **App Compatibility** | **Low**. DRM channels (Netflix, YouTube) block timestamp exposure. | **Universal**. Syncs to Netflix, cable TV, PlayStation, or Blu-ray. | **100% Native**. Complete control over canvas, annotations, and reactions. |
| **Latency** | Extremely low (<500ms). | Moderate (1–3s acoustic sync match). | Zero latency (synchronized in-process). |
| **Battery Impact** | Low (standard background HTTP polling). | High (continuous DSP audio sampling). | Zero mobile battery impact (runs on TV). |
| **Privacy Footprint**| High (only inspects LAN device status). | Low (requires continuous microphone access).| Full privacy (standard TV streaming). |

### 5.2 Architectural Recommendation
1. **Primary Experience**: The native **Annotated Roku Channel** renders user-generated clips and community commentary directly on the TV canvas using hardware-accelerated SceneGraph nodes.
2. **Companion Second-Screen Experience**: For full-length Hollywood films and Netflix/Prime shows, provide a lightweight Companion Mobile/Web extension that utilizes Audio Content Recognition (ACR) to deliver timestamped community notes to the user's secondary device.

---

## 6. Web-to-TV Video Codec & Transcoding Pipeline

Chrome's `MediaRecorder` API outputs web captures in `video/webm` using the Google VP8/Opus codec. Roku TV hardware (`L809X`, OS 15.3+) lacks hardware decode blocks for VP8 in WebM containers and returns a fatal hardware error (`:pump:Unsupported video format: Google's VP8 codec`).

### 6.1 Serverless Transcoding Pipeline
Attempting FFmpeg WASM inside Supabase Edge Functions fails due to execution time and memory limits (10-60s timeout). The production cloud architecture requires automated webhook transcoding:

```
[Chrome Extension Clipper]
       │
       │ (Uploads WebM raw capture)
       ▼
[Cloudflare Stream / Mux Ingest Bucket]
       │
       │ (Auto-transcodes to H.264 / AAC & HLS)
       ▼
[Supabase annotations Table]
       ├── media_url_hls: "https://stream.cloudflare.com/.../manifest/video.m3u8"
       └── media_url_mp4: "https://storage.../video_1080p.mp4"
       │
       ▼
[Annotated Roku Channel]
   (Hardware H.264 / HLS native decode @ 60fps)
```

- **Recommended Provider**: **Cloudflare Stream** (zero egress fee model, instant HLS generation, highly economical for millions of living room stream requests).

---

## 7. Real-Time Multiplayer Reaction HUD (60fps SceneGraph Budget)

Displaying dynamic reactions (🔥, 💡, 💯, ⚡) on low-power TV ARM processors requires strict memory and garbage collection discipline.

### 7.1 SceneGraph Object Pooling & Animation Rules
- **No Dynamic Node Allocation**: Never invoke `CreateObject("roSGNode", "Poster")` or dynamically append children during active playback.
- **Fixed Object Pool**: Pre-allocate an immutable pool of 15 `<Poster>` nodes during `init()` with `visible="false"`.
- **Recycling Engine**: When a real-time reaction event is consumed, acquire an idle `Poster` from the pool, set `visible="true"`, and trigger a `ParallelAnimation`.
- **Interpolation Paths**:
  - `Vector2DFieldInterpolator`: Floats the emoji upward along an gentle "S-curve" path over 2.5 seconds.
  - `FloatFieldInterpolator`: Animates `opacity` from `1.0` down to `0.0`.
- **Aggregated Density**: If >10 reactions arrive within 500ms, collapse them into a single hero icon with an animated `+N` badge counter.
- **Typography & Glyph Integrity**: Strictly use pre-rendered 32x32 transparent PNG assets (`pkg:/images/icon_*.png`). Never rely on system emoji fonts, which render as blank rectangles (`[]`) on Roku OS.

---

## 8. Autonomous OODA Quality Loop (MCP Driven)

The app development and visual verification lifecycle is governed by an automated **OODA (Observe, Orient, Decide, Act)** loop using `annotated-roku-mcp`:

1. **Observe**:
   - `roku_capture_screenshot`: Pulls physical TV screen buffer via port 80 inspect API into AI vision context.
   - `roku_read_logs`: Inspects BrightScript runtime stack traces on port 8085.
2. **Orient**:
   - Evaluates screen captures against design tokens, safe zones, kerning, and 60fps budget.
3. **Decide**:
   - Isolates regressions (e.g. text truncation, misplaced red period, codec decode failure).
4. **Act**:
   - Updates BrightScript/SceneGraph sources, invokes `package.ps1`, deploys via port 80 digest auth, and automatically captures the updated screen.
