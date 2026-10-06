# Changelog

All notable changes to the **Annotated** platform (Chrome Extension and Web Application) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
