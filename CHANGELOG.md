# Changelog

All notable changes to the **Annotated** platform (Chrome Extension and Web Application) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.8] - 2026-10-07

### Added
- **Clearly Visible "File a Claim" Compliance Action**: Added a prominent amber balance-scale button (`[ ⚖️ File a Claim ]`) across all public annotation pages (`/[username]/[slug]`), Roku/Mobile pass pages (`/n/[slug]`), feed cards, and the Chrome extension detail toolbar, directly connecting to the DMCA / Fair Use dispute intake portal.
- **Doubled Text & Tweet Reading Window**: Doubled feed card text line clamping from 3 to 6 lines (`line-clamp-6`) and expanded the truncation threshold from 240 to 480 characters, allowing tweets and key excerpts to be read in full directly on the feed.
- **Internal Discussion Routing**: Reconfigured feed cards to navigate internally to the conversation and community notes page (`detailLink`), keeping visitors engaged on Annotated while preserving separate direct links to original external sources.

### Fixed
- **Extension Recheck Hang Guard**: Added an `AbortController` timeout (16s) to extension fact-check API requests and ensured the widget badge resets cleanly from `RECHECKING` in all network or error scenarios.
- **Clip-Level Fact-Checking**: Enhanced timestamp range parsing across the extension, web cards, and API to recognize all clip interval formats (including `Clip at 00:02 - 01:07`, `(2s - 67s)`, and parenthesized time ranges). The website now passes exact `videoStartTs` and `videoEndTs` parameters so AI evaluations focus strictly on the annotated clip excerpt rather than reviewing the full video.
- **Serverless Performance Optimization**: Bypassed redundant multi-megabyte video buffer downloads in serverless functions and optimized candidate model prioritization (`gemini-3.1-flash-lite` first) to guarantee sub-2-second fact-checking responses.

---

## [2.3.7] - 2026-10-06

### Fixed
- **Video Media Recheck Guard**: Resolved HTTP 400 (`INVALID_ARGUMENT`) errors triggered when sending video MIME types (`video/mp4`, `video/webm`) via Gemini's `inlineData` REST payload. Fact-checking now evaluates clip contextual transcripts and metadata cleanly, with automatic fallback retry if media calls fail.
- **Fact-Check Recheck Auth Session Verification**: Resolved issue where clicking "Recheck" on cached annotations falsely redirected authenticated users to the login screen. Validates active sessions dynamically across runtime getter closures, widget UI state, and Supabase client token storage.
- **Anti-Hallucination & Temporal Safeguards**: Hardened Gemini fact-checking prompt against claiming post-cutoff events are "deepfakes" or "synthetic fabrications", sanitizing ungrounded models to provide objective verification context.

---

## [2.3.6] - 2026-10-06

### Added
- **Proactive Auth Token Refresh (`ensureFreshToken`)**: Implemented automatic token validation in `SupabaseClient` to check token expiry claims before executing database writes (`insert`, `update`, `delete`, `uploadMedia`).
- **Seamless JWT Expiry Interception & Retry**: Added automatic interception for Supabase PostgREST `PGRST303 (JWT expired)` errors. The extension immediately exchanges the stored refresh token for fresh access credentials and transparently retries the publish operation.
- **Graceful Session Recovery in Composer**: Replaced raw database error popups with user-friendly session prompts. If a session cannot be automatically refreshed, users are prompted to sign in with Google while their drafted comment, selected quote, and recorded video clip remain safely preserved in composer memory.
- **Active Gemini Model Cascade**: Upgraded the AI fact-checking engine to support Google Generative AI endpoints (`gemini-3.5-flash`, `gemini-3.8-flash`, `gemini-3.1-flash-lite`, and `gemini-flash-latest`), eliminating deprecated 404 models (`gemini-2.5-flash`, `gemini-2.0-flash`).
- **Date-Aware Ground Truth & Evidence Rules**: Added dynamic system date awareness (`TODAY'S DATE`) to the fact-checking prompt to prevent the model from misidentifying recent events as "fake" due to training data cutoffs. Explicitly instructs the engine to recognize reporting by reputable journalistic outlets (e.g. CNN, Forbes, AP, Reuters, NYT, WSJ) as corroboration and bans unfounded "deepfake" allegations without cited proof.
- **Bi-Directional Fact-Check Persistence**: Fact-check results now persist bi-directionally between the Chrome extension and the web platform. Cached verdicts are stored in Supabase storage (`fc_<annotation_id>.json`), reducing redundant AI calls while enabling signed-in users to re-verify claims on demand.
- **Automated Distribution Packaging**: Integrated multi-directory synchronization in `scripts/build-extension.mjs`, producing verified unpacked builds and release archives across desktop testing locations.

### Fixed
- **YouTube Main Video Player Targeting**: Resolved an issue where video clip recording captured thumbnail hover-preview players (`#inline-preview-player`, `ytd-video-preview`, `ytd-thumbnail`) rather than the active video player. Clip capture now strictly targets `#movie_player video.html5-main-video`.
- **Cross-Video Navigation Guard**: Added `sourceVideoKey` tracking during video capture. If YouTube SPA navigates to an unrelated video mid-capture, stale recordings are cleanly aborted rather than attached to the new video.
- **Video Clip Saving Hang**: Eliminated UI freezes where the "Save Clip" button remained stuck on "Saving..." by adding safety timeout fallbacks to MediaRecorder stream finalization.
- **Extension Context Invalidation Guard**: Added comprehensive guards to `safeSendRuntimeMessage` and storage calls to suppress `Extension context invalidated` errors when the extension updates or service workers recycle.
- **Fact-Check Recheck Auth Validation**: Fixed bug where clicking "Recheck" incorrectly opened the login screen for already authenticated users by validating session state dynamically across all sources (getter closure, widget UI user menu, and Supabase storage) and repairing base64url padding decoding in JWT parsing.
- **Package Integrity Verification**: Added pre-archive verification ensuring all script and asset references in `widget.html` and `offscreen.html` are strictly validated before generating release zips.

---

## [2.3.5] - 2026-10-02

### Added
- Floating video timeline annotation markers with synchronized seek preview.
- Support for inline video clip playback inside the widget feed and detail views.
- Bi-directional navigation between video timeline pills and annotation detail cards.

### Fixed
- Audio clip preview loop in the composer widget.
- Formatting discrepancies in multi-line comments containing timestamp ranges.

---

## [2.3.0] - 2026-09-25

### Added
- **TypeScript Modular Architecture**: Refactored monolithic extension scripts into modular TypeScript source files (`extension-src/`) divided into `shared/`, `content/`, `widget/`, and `background/`.
- **High-Performance Build System**: Implemented `esbuild` compilation pipeline for instant extension bundling and live watching.
- **Automated Content Moderation**: Integrated pre-screening endpoint (`/api/moderate`) to uphold Community Guidelines before publishing annotations.

---

## [2.2.0] - 2026-09-18

### Added
- Google OAuth 2.0 integration via Chrome Identity API.
- User profile pages showcasing intellectual footprint, bookmarks, and follower counts.
- Dynamic reactions and threaded comments on public annotations.
