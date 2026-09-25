# Annotated: Core UX & Architecture Implementation Guide

**Document Purpose:** This specification serves as the foundational context for IDEs, AI coding assistants (Cursor, Copilot), and engineering agents. It defines the human-centric user experience (UX) and the strict technical architecture required to execute the "Annotated" ecosystem across Web, iOS, and Roku.

## 1. Core Human Experience Philosophy

The transition from a desktop (lean-forward) to a TV (lean-back) dictates a fundamental shift in cognitive load. The Roku user is holding a 5-way D-pad, sitting 10 feet away, and expects passive entertainment.

* **Zero-Friction Sync:** The user should not have to manually scrub timelines to find a note. The UI must automatically sync and surface relevant annotations exactly when the video timestamp hits.
* **Respect the Content:** Annotations and reactions must enhance, never obscure, the primary video. Overlays must use subtle gradients, and high-frequency UI updates must be visually smoothed to prevent overwhelming the viewer.
* **Organic Integrity:** The platform relies exclusively on genuine, user-generated content. No synthetic placeholder comments. If a clip has no notes, the UI gracefully remains invisible rather than showing empty states.

---

## 2. The 10-Foot Living Room UI (Roku SceneGraph)

### Visual Layout

* **Video Stage (70% Left):** The primary view. Renders standard MP4 video via the native RSG `Video` node.
* **Annotation Rail (30% Right):** A vertical `MarkupGrid` displaying the author, timestamp, note text, and reaction metrics.

### Interaction States & Remote Mapping

* **State A: Passive Consumption (Default)**
  * **Visuals:** Video plays at 100% volume. The Annotation Rail auto-scrolls, centering the note that matches the current video `position`.
  * **Controls:**
    * `Left/Right`: Seeks 10s.
    * `Up/Down`: Skips to the next/previous 90-second video clip in the feed.
    * `OK`: Pauses playback.
    * `* (Options)`: Transitions directly to State B.

* **State B: Active Browsing**
  * **Trigger:** User presses `*` (Options) or navigates into the Rail.
  * **Visuals:** Audio drops to 30% (Audio Ducking) to keep the room alive without demanding attention. A 40% opacity dark gradient slides in behind the rail to boost text contrast.
  * **Controls:**
    * `Up/Down`: Manually scrolls the timeline.
    * `OK`: Expands a note to read replies.
    * `Right`: Opens the quick-reaction HUD (🔥, 💡, ⚡).
    * `Left`: Exits back to State A and restores 100% volume.

---

## 3. The Creator Pipeline (Chrome Extension)

Creating a 90-second clip must feel instant, preventing browser memory crashes and eliminating backend transcoding bottlenecks.

* **Capture:** Chrome `MediaRecorder` API captures DOM video elements in 2-second chunks (`timeslice: 2000`).
* **Hard Constraint:** Recording strictly terminates at 90 seconds.
* **Client-Side Processing:** The compiled VP8 WebM blob is passed to an embedded `ffmpeg.wasm` instance directly within the Chrome Extension Service Worker. It transcodes the file to an H.264 `.mp4`.
* **Zero-Egress Storage:** The extension executes a `PUT` request via a pre-signed URL directly to Cloudflare R2. This bypasses expensive video hosting APIs and prepares the asset for immediate streaming to the Roku client.

---

## 4. Real-Time HUD & Data Synchronization

Handling viral moments requires decoupling the UI updates from permanent database writes to protect the free-tier infrastructure.

* **The Reaction HUD:** When a user presses `*` to "Quick Like" a note, the client immediately plays a floating 60fps SceneGraph animation (using a pre-allocated object pool of `Poster` nodes to prevent memory leaks).
* **Supabase Broadcast:** The client emits the reaction payload via Supabase Realtime Broadcast. All other viewers watching that exact timestamp see the reaction fly up their screen instantly.
* **Upstash Redis Debouncing:** The reaction is concurrently sent to Upstash Serverless Redis (`INCRBY`). A Vercel Cron Job runs every 10 seconds, sweeps the aggregated Redis counts, performs a single bulk `UPDATE` to the Supabase Postgres database, and flushes the Redis keys.

---

## 5. Trust & Safety (Content Integrity)

App Store (Apple) and Channel Store (Roku) approval requires strict, automated UGC safeguards natively built into the ingestion flow.

* **Automated Triage:** Every new note or clip uploaded to Supabase triggers an Edge Function webhook to the Sightengine API. Any payload scoring >0.85 for NSFW, gore, or hate speech is immediately flagged and soft-deleted before broadcasting to clients.
* **Client-Side Empowerment:** Every expanded note in the Roku UI and iOS app must feature a dedicated "Report" flag.
* **Mute Architecture:** The client state must respect a `blocked_user_ids` array, instantly filtering out any content authored by users the viewer has explicitly blocked.

---

## 6. The Cross-Platform Sync Architecture (iOS Companion)

For scenarios where the user is watching native TV apps (e.g., Netflix) and wants to read Annotated community notes on their phone:

* **ShazamKit Implementation:** The iOS app utilizes Apple's `SHCustomCatalog`.
* **Zero-Cost Matching:** The iPhone microphone samples room audio and matches it against locally cached acoustic fingerprints of trending content.
* **Sync Execution:** Upon a match, ShazamKit returns `predictedCurrentMatchOffset`. The iOS app uses this precise timestamp to auto-scroll the mobile Annotation Rail in perfect sync with the living room television, requiring zero cloud API calls or ECP network polling.
