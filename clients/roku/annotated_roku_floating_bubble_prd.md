# Annotated Roku Floating Annotation Bubble
## Product Requirements Document and AI Coding Specification

**Document:** `clients/roku/annotated_roku_floating_bubble_prd.md`  
**Version:** 2.0.0  
**Status:** Ready for implementation  
**Target:** Annotated Roku channel, SceneGraph/BrightScript  
**Primary audience:** AI coding IDEs and coding agents  
**Supersedes:** The fixed two-column/right-rail presentation in `clients/roku/annotated_roku_prd_spec.md` for the primary playback experience. Existing feed, reaction, deep-linking, and safety behavior remains in scope unless explicitly changed below.

---

## 1. Product summary

Redesign the Annotated Roku experience around **full-screen video plus a compact floating annotation bubble**, visually related to the browser extension widget.

The Roku channel should feel like a living-room version of the extension:

- Video occupies the full screen by default.
- A small, unobtrusive status bubble communicates that community context is available.
- The viewer opens the bubble with the Roku remote to read annotations and comments linked to the exact source material.
- A dynamic QR code remains available in a safe screen corner and resolves to the current source, timestamp, and annotation context on a phone.
- The overlay never blocks the video unless the viewer intentionally expands it.

### Product promise

> Watch the source material full-screen, then open the community layer only when you want more context.

### Important platform boundary

A Roku channel can overlay UI on top of video rendered **inside the Annotated channel**. It cannot draw over Netflix, YouTube, Prime Video, the Roku home screen, live TV, or another Roku channel. Cross-app synchronization is explicitly out of scope for this channel iteration.

---

## 2. Goals

### 2.1 Primary goals

1. Make fullscreen video the default, primary experience.
2. Reuse the browser extension's rounded, dark, floating-card visual language.
3. Let users open and close the annotation layer with a simple remote interaction.
4. Display annotations and comments associated with the currently playing source and timestamp.
5. Keep the QR code dynamically synchronized with the active source and selected annotation.
6. Preserve the existing Supabase feed, fact-check statuses, reactions, deep links, and Roku-safe network architecture.
7. Provide a graceful visual fallback on Roku versions without native rounded-corner effects.

### 2.2 Secondary goals

- Make the bubble useful even when no annotation is currently active.
- Support a compact collapsed state, readable expanded state, and full commentary state.
- Keep the video playing while the compact bubble is open; pause or duck audio only in full commentary mode.
- Ensure all functionality is usable with a standard Roku D-pad remote.

### 2.3 Non-goals

- Overlaying annotations over other Roku apps or external TV content.
- Recording the Roku screen or microphone.
- Building a Roku web browser.
- Replacing the browser extension as the annotation-authoring tool.
- Requiring Roku OS 16-only APIs for the core experience.
- Adding user account creation or long-form text entry to the Roku MVP.
- Introducing synthetic or placeholder annotations when the feed is empty.

---

## 3. Current repository context

The implementation should build on the existing Roku client rather than creating a parallel app.

### Existing files

- `clients/roku/components/MainScene.xml` — current SceneGraph composition.
- `clients/roku/components/MainScene.brs` — playback, focus, feed, modal, reactions, and deep-link logic.
- `clients/roku/components/AnnotationFeedTask.xml` and `.brs` — annotation feed loading.
- `clients/roku/components/ReactionTask.xml` and `.brs` — reaction submission.
- `clients/roku/source/main.brs` — channel bootstrap and deep-link input handling.
- `clients/roku/images/` — brand and reaction assets.
- `clients/roku/scripts/` — packaging and build utilities.
- `clients/roku/annotated_roku_prd_spec.md` — prior fixed-rail requirements.
- `clients/roku/annotated_core_implementation_guide.md` — shared UX and architecture guidance.

### Existing behavior to preserve

- FHD base canvas: 1920 × 1080.
- Dark Annotated brand palette and lowercase `annotated.` wordmark.
- `STATE_A` passive playback and `STATE_B` active browsing concepts.
- Supabase annotation feed and fact-check normalization.
- Reaction icons and reaction task submission.
- Deep-link handling through `launchArgs` and `inputArgs`.
- Memory monitoring and low-memory event logging.
- H.264/MP4 or HLS playback constraints.
- No empty fake content when annotations are unavailable.

### Existing behavior to replace in the primary playback view

- The always-visible 30% right annotation rail.
- The fixed three-card rail as the default layout.
- The requirement that the video remain in a 1200 × 675 boxed stage during normal playback.

The old rail may remain as an optional debug or future browsing mode, but it must not be the default MVP presentation.

---

## 4. User experience

## 4.1 Screen states

### State A — Passive fullscreen playback

Default state after a video starts.

- Video fills the 1920 × 1080 canvas.
- Annotation UI is hidden except for:
  - A small status bubble when relevant annotations exist.
  - A small QR affordance in a safe corner.
- No empty card or “waiting for feed” placeholder is shown.
- The viewer can watch without interacting with the annotation layer.

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    FULLSCREEN VIDEO                        │
│                                                             │
│                                             [QR]            │
│                                  ┌───────────────────────┐  │
│                                  │ ⚡ Verified · 3 notes │  │
│                                  └───────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### State B — Bubble open

Triggered by `OK` when the bubble is focused, or by the configured annotation shortcut.

- Video continues playing.
- A rounded floating panel appears in the upper-right or lower-right safe area.
- Panel width: approximately 600–700 px at FHD.
- Panel height: approximately 300–430 px depending on content.
- The panel shows one active annotation and compact navigation controls.
- The QR affordance remains visible but may move to avoid overlap.
- The panel must not cover the primary center action of the video.

Panel contents:

1. Fact-check/status badge.
2. Annotation timestamp.
3. Author identity.
4. Quote from the source material.
5. Community commentary.
6. Remote reaction bar.
7. Previous/next annotation controls.
8. `Fact-check` action.
9. `Open on phone` action.

### Remote reaction bar

The bubble includes a compact, horizontally navigable reaction bar. Reactions must be usable without typing and must reuse the existing `ReactionTask` backend path.

Recommended reactions:

- Fire
- Think
- Idea
- 100
- Down

Behavior:

- Left/Right moves focus between reaction buttons.
- OK submits the focused reaction and immediately increments its local count.
- The selected button receives a clear focus treatment and a short confirmation animation.
- Repeated OK presses should be debounced so one physical press creates one reaction.
- If the viewer is not authenticated, show a lightweight sign-in or `Open on phone` path rather than opening a text-entry workflow on Roku.
- Reaction submission must fail soft: the local UI can acknowledge the action while the task retries or reports failure without interrupting video.

The reaction bar is a **viewer interaction**, not a fact-check verdict. Do not conflate reaction counts with truth status.

### State C — Full commentary mode

Triggered by selecting `Read more`, pressing `OK` on the expanded annotation, or choosing `Open commentary`.

- Video pauses by default. Audio may alternatively be ducked to 20–30% if implemented consistently.
- A larger rounded panel or bottom sheet takes focus.
- Full quote, full comment, author, fact-check explanation, and reactions are readable.
- The viewer can browse comments associated with the same source.
- Back returns to State B, then State A.

### State D — QR expanded

Triggered by selecting `Open on phone` or the QR affordance.

- Display a high-contrast QR code at a readable size, target approximately 240–320 px square at FHD.
- Show a short URL or explanatory label below it.
- Show the exact context being transferred:
  - Source title.
  - Timestamp.
  - Annotation or comment identifier when available.
- Back closes the QR view.

### State E — Fact-check action

The viewer can start a fact-check action from the remote, but the Roku MVP must keep the interaction structured and low-friction.

The preferred flow is:

1. Viewer selects `Fact-check` from the bubble.
2. A compact choice panel presents exactly two verdict actions:
   - `Verified True`
   - `False`
3. Viewer selects one verdict with the D-pad and presses OK.
4. Roku submits a structured fact-check signal containing the source, annotation, timestamp, viewer identity, and selected verdict.
5. Roku shows a confirmation state and updates the displayed fact-check count/status only after the server accepts the signal.
6. For evidence, explanation, or dispute text, the viewer selects `Continue on phone`, which opens the QR context rather than requiring long-form typing on Roku.

The Roku channel must not label a claim as factually true or false based on one unmoderated remote vote. The remote selection is a **community fact-check signal**. A published fact-check bar is shown only when the backend returns an accepted explicit verdict.

### Fact-check bar visibility rule

The fact-check bar is conditional:

- Show it only when the active annotation has a backend-approved explicit verdict of `VERIFIED_TRUE` or `FALSE`.
- Hide it for neutral notes, opinions, reactions, `MISLEADING`, `CONTEXT_NEEDED`, pending votes, and unknown statuses in the default collapsed view.
- Use emerald styling for `Verified True`.
- Use red styling for `False`.
- Do not infer a verdict from reaction counts or from a majority reaction.
- If the verdict is pending moderation or has conflicting signals, show the normal annotation bubble without a fact-check bar.

When visible, the bar should contain:

- A clear verdict label: `VERIFIED TRUE` or `FALSE`.
- A short explanation or source count when available.
- A button to open full evidence on the phone.

### State F — No annotations

- Hide the bubble entirely.
- Keep the video fullscreen.
- Optionally show a lightweight QR that links to the source only if a canonical source URL exists.
- Do not show fake, synthetic, or placeholder comments.

### State G — Loading/error

- During feed loading, do not cover the video with a large error panel.
- If the feed fails, hide the annotation bubble and log the error.
- If the QR fails, retain the source/status UI and show a small retryable QR error only in State D.

---

## 4.2 Remote interaction map

Use explicit focus management. The active focus target must always be visually identifiable.

| Current state | Remote input | Result |
|---|---|---|
| Passive playback | `OK` | Pause/play video unless the bubble is explicitly focused |
| Passive playback | `*` / Options | Open bubble and move focus to bubble root when supported |
| Passive playback | `Left` / `Right` | Seek backward/forward according to existing playback behavior |
| Passive playback | `Up` / `Down` | Previous/next source or annotation item, preserving current product behavior |
| Bubble open | `Left` / `Right` | Previous/next annotation at or near the current timestamp |
| Bubble open | `Up` / `Down` | Move between bubble actions: read, react, QR, close |
| Bubble open | `OK` | Activate focused action or enter full commentary mode |
| Bubble open | `Back` | Close bubble and return to passive playback |
| Bubble open | Focus `Fact-check` then `OK` | Open the structured true/false fact-check choice panel |
| Reaction bar | `Left` / `Right` | Move between reaction buttons |
| Reaction bar | `OK` | Submit the focused reaction once and show confirmation |
| Fact-check choice | `Left` / `Right` | Choose `Verified True` or `False` |
| Fact-check choice | `OK` | Submit the selected community fact-check signal |
| Fact-check choice | `Back` | Cancel without submitting |
| Full commentary | `Up` / `Down` | Scroll annotation/comment content |
| Full commentary | `Left` / `Right` | Move between related comments or annotations |
| Full commentary | `OK` | Activate reaction, open QR, or select related content |
| Full commentary | `Back` | Return to bubble open, then passive playback |
| QR expanded | `Back` | Return to prior state |
| QR expanded | `OK` | No-op unless a secondary action is provided |

### Focus rules

- The video should own focus during passive playback.
- The bubble should own focus only when open or when the viewer explicitly navigates into it.
- Never leave focus on an invisible node.
- Never require the viewer to traverse dozens of controls before returning to video.
- Use `onKeyEvent()` and `setFocus(true)` consistently with the current SceneGraph architecture.

### Options key caution

Roku may display the system overlay when `*` is pressed while the `Video` node has focus and the app does not handle the event. If `*` is used for Annotated, the app must ensure the correct component owns focus and returns `true` from `onKeyEvent()` where appropriate. Test this behavior on target Roku OS versions.

---

## 5. Visual system

### 5.1 Brand tokens

Reuse the current Roku palette:

- Obsidian background: `#090D16`
- Surface: `#111827`
- Elevated surface: `#1F2937`
- Border: `#334155`
- Primary cyan: `#38BDF8`
- Verified emerald: `#34D399`
- Warning amber: `#F59E0B`
- Disputed/false red: `#EF4444`
- Primary text: `#F8FAFC`
- Secondary text: `#94A3B8`
- Brand period: `#EF4444`

### 5.2 Bubble styling

- Rounded card geometry matching the extension as closely as Roku capabilities allow.
- Radius target: 20–28 px at FHD.
- Surface opacity: 92–97% so text remains readable over video.
- Border: 1–2 px subdued border with a status-colored accent when relevant.
- Shadow: use a dark translucent backing or layered rectangles; do not depend on unsupported CSS-like shadows.
- Animation duration: 160–240 ms for open/close.
- Avoid fast or continuous animation while video is playing.

### 5.3 Rounded-corner compatibility

Core MVP must work without Roku OS 16-only effects.

Preferred implementation order:

1. Use the existing rectangle/group composition for broad compatibility.
2. Use a packaged rounded mask or rounded panel artwork where necessary.
3. If the runtime exposes the Roku OS 16 `Effect` node and `supported` is true, apply native rounded corners, borders, or gradients to `Rectangle` and `Poster` nodes.
4. If unsupported, retain the fallback artwork with no visual breakage.

Do not make launch dependent on `Effect` availability.

### 5.4 Safe zones

- Keep all interactive elements at least 64 px from screen edges.
- Keep QR at least 96 px from screen edges when expanded.
- Do not place QR over captions, score overlays, or the most important video action area.
- Respect the existing 1920 × 1080 safe-zone guidance.

---

## 6. Dynamic QR experience

### 6.1 QR purpose

The QR transfers the exact TV context to a phone or browser. It is not merely a generic homepage QR.

### 6.2 Canonical deep-link format

Implement a stable URL format owned by the web app. Recommended shape:

```text
https://annotated-repo.vercel.app/tv/source/{sourceId}?t={seconds}&annotation={annotationId}
```

Rules:

- `sourceId` must identify the source or clip.
- `t` is the current playback position in whole seconds.
- `annotation` is optional and included when a specific annotation is selected.
- The endpoint must work without authentication.
- The endpoint must render a mobile-friendly page with the source and selected context.
- The endpoint must provide an install/open action for the browser extension.

### 6.3 QR image endpoint

The Roku client should display a server-generated PNG rather than implement QR encoding locally.

Recommended endpoint:

```text
GET https://annotated-repo.vercel.app/api/qr?source={sourceId}&t={seconds}&annotation={annotationId}
```

Requirements:

- Return `image/png`.
- Use a high-contrast black/white QR by default.
- Include a quiet zone.
- Return a cacheable URL where possible.
- Generate a new URL when source, timestamp bucket, or annotation changes.
- Use timestamp buckets to avoid requesting a new image every playback tick. Default bucket: 15 seconds.

### 6.4 Client update policy

Update the QR context:

- When a new source starts.
- When playback crosses into a new 15-second bucket with a relevant annotation.
- When the active annotation changes.
- When the viewer opens State D.
- Do not refresh the QR image every second.

### 6.5 QR failure behavior

- Keep the QR affordance hidden until the image is ready.
- If loading fails, show `QR unavailable` in State D with a retry action.
- Never block playback on QR generation.

Roku's `Poster` node supports remote PNG/JPEG/WebP images and asynchronous loading, making it suitable for the QR asset.

---

## 7. Data and API requirements

### 7.1 Annotation model consumed by the Roku client

The existing feed fields remain supported. The client should normalize them into a view model similar to:

```json
{
  "id": "annotation-id",
  "sourceId": "youtube:video-id",
  "sourceUrl": "https://www.youtube.com/watch?v=...",
  "pageTitle": "Source title",
  "authorName": "Senti",
  "authorHandle": "@senti",
  "quote": "Quoted source material",
  "comment": "Community commentary",
  "timestampSeconds": 642,
  "durationSeconds": 21,
  "factCheck": {
    "status": "verified_true",
    "headline": "Verified True",
    "approved": true,
    "detail": "Community explanation"
  },
  "reactions": {
    "fire": 18,
    "think": 3,
    "idea": 7,
    "hundred": 11,
    "down": 1
  },
  "qrUrl": "https://.../api/qr?..."
}
```

### 7.2 Feed transport

- Continue using `AnnotationFeedTask` for network I/O outside the render thread.
- Use HTTPS with the standard Roku certificate bundle.
- Do not hardcode a local LAN media server as the only production path.
- Keep the existing direct Supabase fallback only if credentials and security policy permit it.
- Prefer a small server-side Roku feed endpoint that returns only fields needed by the channel.
- Normalize inconsistent fact-check values in one place.

### 7.3 Refresh strategy

MVP:

- Initial fetch on channel start.
- Refresh on source change.
- Refresh when the bubble opens if the previous feed is stale.
- Optional timer refresh no more frequently than every 30 seconds.

Future:

- SSE or WebSocket live updates on compatible Roku OS versions.
- Polling fallback for older devices.

Do not make Roku OS 16 beta APIs mandatory for the MVP.

### 7.4 Comments and source linkage

The expanded panel must show comments that are linked to the same source material. It must not mix unrelated global-feed entries unless the user explicitly chooses a global explore action.

Sort order for the initial implementation:

1. Same source and closest timestamp.
2. Highest community engagement.
3. Newest creation time.

### 7.5 Fact-check signal contract

The remote fact-check action should submit a structured payload through a dedicated task or the existing authenticated API layer:

```json
{
  "annotationId": "annotation-id",
  "sourceId": "youtube:video-id",
  "timestampSeconds": 642,
  "verdict": "VERIFIED_TRUE",
  "origin": "roku_remote",
  "clientVersion": "2.0.0"
}
```

Allowed MVP verdict values are exactly:

- `VERIFIED_TRUE`
- `FALSE`

The server must authenticate the viewer, deduplicate repeated submissions, apply rate limits, and return a pending/accepted/rejected result. The Roku client must show the published fact-check bar only from an accepted backend result with `approved=true`; a local vote must never directly rewrite the public verdict.

Long-form evidence, citations, or explanations should be completed on the phone through the QR context. If the viewer is anonymous, the Roku UI should offer `Continue on phone` rather than requiring a Roku keyboard.

---

## 8. SceneGraph implementation plan

### 8.1 Recommended component additions

Create focused components instead of making `MainScene.brs` responsible for every interaction.

Recommended files:

- `clients/roku/components/FloatingAnnotationBubble.xml`
- `clients/roku/components/FloatingAnnotationBubble.brs`
- `clients/roku/components/AnnotationDetailPanel.xml`
- `clients/roku/components/AnnotationDetailPanel.brs`
- `clients/roku/components/QrContextPanel.xml`
- `clients/roku/components/QrContextPanel.brs`
- `clients/roku/components/AnnotationViewModel.brs` or equivalent helper
- `clients/roku/components/QrImageTask.xml`
- `clients/roku/components/QrImageTask.brs`

If the AI IDE chooses different names, preserve the separation of concerns:

- Main scene owns playback and high-level state.
- Bubble owns compact overlay presentation and focus.
- Detail panel owns expanded reading state.
- QR panel owns QR loading and display state.
- Tasks own network I/O.

### 8.2 MainScene changes

Refactor `MainScene.xml` so that:

1. `mainVideo` can occupy the full canvas.
2. Existing fixed rail is hidden by default.
3. A new bubble layer is appended after the video layer so it renders above video.
4. A QR affordance layer is appended in a safe corner.
5. A modal/detail layer is appended above the bubble when opened.
6. Existing reaction and fact-check behavior is reused through a normalized active annotation model.

### 8.3 State machine

Use an explicit state enum or equivalent constants:

```text
PLAYBACK
BUBBLE_OPEN
DETAIL_OPEN
QR_OPEN
LOADING
ERROR_HIDDEN
```

Allowed transitions:

```text
PLAYBACK -> BUBBLE_OPEN      on bubble shortcut or bubble selection
BUBBLE_OPEN -> PLAYBACK      on Back or Close
BUBBLE_OPEN -> DETAIL_OPEN   on Read more / OK
BUBBLE_OPEN -> QR_OPEN      on Open on phone
DETAIL_OPEN -> BUBBLE_OPEN   on Back
QR_OPEN -> BUBBLE_OPEN       on Back
Any state -> PLAYBACK        on source change or fatal media error
```

Do not use several independent booleans that can create impossible combinations such as `bubbleVisible=true` and `detailVisible=true` while focus remains on an invisible rail.

### 8.4 Playback synchronization

- Observe `mainVideo.position`.
- Maintain a sorted annotation timeline for the active source.
- Determine the active annotation using a small time window around the current position.
- Update the bubble status only when the active annotation changes or the status count changes.
- Avoid rebuilding SceneGraph children on every position tick.
- Reuse fixed nodes or a small pool for visible reactions.

### 8.5 Performance constraints

- No network requests on the render thread.
- No QR request every second.
- No full SceneGraph tree rebuild for playback position updates.
- Avoid creating large numbers of nodes during playback.
- Use fixed-size text limits and truncation for the collapsed bubble.
- Test low-memory notifications and device performance on at least one lower-end Roku target.

---

## 9. Acceptance criteria

### 9.1 Functional acceptance

- [ ] Launching a source displays video in fullscreen mode.
- [ ] The default screen has no permanent right-side annotation rail.
- [ ] If relevant annotations exist, a compact bubble appears without blocking the center of the video.
- [ ] If no annotations exist, the bubble is hidden.
- [ ] Opening the bubble with the remote moves focus to a visible interactive element.
- [ ] The bubble can be closed with Back.
- [ ] The detail panel displays the source quote, comment, author, timestamp, and fact-check status.
- [ ] The bubble includes a horizontally navigable reaction bar.
- [ ] Pressing OK on a reaction submits one debounced reaction and updates the local count on success.
- [ ] The fact-check bar is hidden for notes, opinions, reactions, pending votes, unknown statuses, misleading claims, and context-needed claims.
- [ ] The fact-check bar appears only for an accepted backend verdict of `VERIFIED_TRUE` or `FALSE`.
- [ ] A viewer can select `Verified True` or `False` with the remote and submit a structured fact-check signal.
- [ ] An anonymous or unauthenticated viewer receives a phone handoff instead of a blocking text-entry flow.
- [ ] Previous/next annotation navigation works with Left/Right.
- [ ] Reactions continue to use the existing reaction model and task.
- [ ] The QR context corresponds to the currently selected source/timestamp/annotation.
- [ ] QR expansion does not pause or block the app indefinitely if the QR endpoint fails.
- [ ] The mobile QR destination opens without requiring a Roku login.
- [ ] Existing deep links still select and play the expected annotation.
- [ ] Existing feed fallback behavior remains functional.

### 9.2 Visual acceptance

- [ ] Bubble uses Annotated dark surfaces and status colors.
- [ ] Bubble has rounded visual treatment on devices where native effects are supported.
- [ ] Bubble has a graceful fallback on devices where native effects are not supported.
- [ ] Text is readable from a 10-foot viewing distance.
- [ ] No important content is inside unsafe screen margins.
- [ ] QR remains scannable in both collapsed and expanded states.
- [ ] The video remains visually primary.
- [ ] Open/close animation is brief and does not distract from playback.

### 9.3 Remote acceptance

- [ ] All states have deterministic focus.
- [ ] Back always exits the current overlay state before exiting the channel.
- [ ] No invisible node retains focus.
- [ ] Options key behavior is tested while video is playing.
- [ ] User can reach video controls within two remote actions after closing the bubble.

### 9.4 Reliability acceptance

- [ ] Feed timeout does not freeze playback.
- [ ] QR timeout does not freeze playback.
- [ ] Invalid annotation fields do not crash the channel.
- [ ] Unsupported Roku visual effects do not crash or blank the bubble.
- [ ] Low-memory events are logged and the UI can hide optional layers.
- [ ] The channel exits cleanly with no orphaned tasks.

---

## 10. Test plan for the AI coding IDE

### 10.1 Static checks

- Validate all SceneGraph XML files.
- Confirm all referenced node IDs exist.
- Confirm every new component is included in the package.
- Confirm no `localhost` or LAN-only URL is used as the sole production feed or QR path.
- Confirm all HTTPS requests configure Roku certificates.
- Confirm no unsupported browser APIs or CSS are introduced into Roku source.

### 10.2 Manual device smoke test

1. Launch channel.
2. Confirm fullscreen playback.
3. Wait for feed load.
4. Confirm bubble visibility only when annotations exist.
5. Open bubble with the configured remote action.
6. Navigate previous/next annotation.
7. Open full commentary.
8. Open QR panel and scan it with a phone.
9. Verify the phone lands on the correct source and timestamp.
10. Press Back through each overlay state.
11. Switch to another source.
12. Confirm old annotation and QR state are cleared.
13. Test feed failure and QR failure.
14. Test on a lower-end Roku device or simulator.

### 10.3 Automated/OODA loop

Use the existing Roku tooling under `tooling/roku-mcp` when available:

- Deploy package.
- Capture screenshots for `PLAYBACK`, `BUBBLE_OPEN`, `DETAIL_OPEN`, and `QR_OPEN`.
- Read BrightScript logs.
- Check for focus, layout, and runtime errors.
- Compare screenshots against safe zones and design tokens.

Suggested screenshot names:

```text
roku-floating-playback.png
roku-floating-bubble.png
roku-floating-detail.png
roku-floating-qr.png
```

### 10.4 Definition of done

The feature is complete when all acceptance criteria pass on a real or representative Roku target, screenshots show the intended hierarchy, QR links resolve to correct context, and no existing deep-link/feed/reaction behavior regresses.

---

## 11. Implementation phases

### Phase 1 — Refactor the stage

- Make video fullscreen.
- Hide the fixed rail by default.
- Preserve current feed and playback behavior.
- Add explicit UI state management.

### Phase 2 — Build the bubble

- Add compact bubble component.
- Bind status, count, timestamp, and active annotation.
- Add focus and remote behavior.
- Add open/close animation.

### Phase 3 — Build detail mode

- Add full commentary panel.
- Reuse existing modal data where possible.
- Add related comments and reactions.
- Add the remote reaction bar and connect it to `ReactionTask`.

### Phase 3.5 — Add structured remote fact-checking

- Add the `Fact-check` bubble action.
- Add the two-option `Verified True` / `False` choice panel.
- Add a dedicated fact-check signal task or API call with authentication, deduplication, and rate limiting.
- Render the fact-check bar only from approved explicit backend verdicts.
- Route evidence and explanation work to the phone via QR.

### Phase 4 — Build dynamic QR

- Add canonical web route and QR endpoint.
- Add QR task and poster component.
- Add context refresh policy and error state.

### Phase 5 — Compatibility and polish

- Add native rounded effects conditionally where available.
- Add fallback card treatment.
- Tune safe zones, text sizing, animation, and focus indicators.
- Run screenshot/OODA checks.

---

## 12. Engineering guardrails for the AI coding IDE

The coding agent must:

1. Read this PRD and the existing Roku PRD before editing files.
2. Inspect the current `MainScene.xml` and `MainScene.brs` before changing them.
3. Prefer small, reversible commits or changes by phase.
4. Reuse existing feed, reaction, and deep-link code rather than duplicating it.
5. Keep network I/O inside `Task` components or equivalent asynchronous boundaries.
6. Avoid inventing data fields without adding a normalization layer or documenting the backend requirement.
7. Do not remove memory monitoring, certificate configuration, or fallback behavior.
8. Do not use Roku OS 16-only APIs without a runtime capability check and a fallback.
9. Do not add placeholder comments or fake reaction counts.
10. After each phase, package and run the Roku smoke test before proceeding.
11. Report changed files, tests run, screenshots captured, and known limitations.

### Suggested first coding prompt

```text
Implement Phase 1 of clients/roku/annotated_roku_floating_bubble_prd.md only.

First inspect:
- clients/roku/components/MainScene.xml
- clients/roku/components/MainScene.brs
- clients/roku/components/AnnotationFeedTask.brs
- clients/roku/annotated_roku_prd_spec.md

Make the video fullscreen, hide the fixed annotation rail by default, preserve feed/playback/deep-link/reaction behavior, and introduce an explicit UI state model without implementing the bubble yet.

Do not remove memory monitoring or HTTPS certificate handling. Do not add placeholder content. After editing, validate XML, package the channel, run the existing Roku smoke tests if available, and report every changed file and test result.
```

---

## 13. Open decisions

These choices should be settled before Phase 2 if they materially affect implementation:

1. Bubble shortcut: `*`, `OK` on a visible status badge, or both.
2. Playback during full commentary: pause versus audio ducking.
3. QR timestamp bucket: 10 seconds, 15 seconds, or annotation timestamp only.
4. MVP feed endpoint: direct Supabase REST versus a dedicated server-side Roku feed endpoint.
5. Native rounded `Effect` support target: OS 16 enhancement only or no dependency until OS 16 is broadly available.
6. Whether the existing three-card rail remains as a hidden explore/debug mode.

Recommended defaults:

- Use `*` to open the bubble and `Back` to close it.
- Pause during full commentary.
- Use 15-second QR buckets plus annotation ID.
- Prefer a dedicated server-side feed endpoint for production.
- Treat OS 16 effects as progressive enhancement.
- Keep the old rail hidden but available for a future Explore screen.

---

## 14. Platform references

- [Roku Video node](https://developer.roku.com/dev/docs/video)
- [Roku remote/application events](https://developer.roku.com/dev/docs/handling-application-events)
- [Roku SceneGraph](https://developer.roku.com/dev/docs/scenegraph)
- [Roku Rectangle node](https://developer.roku.com/dev/docs/rectangle)
- [Roku Poster node](https://developer.roku.com/dev/docs/poster)
- [Roku roUrlTransfer](https://developer.roku.com/dev/docs/rourltransfer)
- [Roku OS 16 developer beta styling and networking update](https://blog.roku.com/developer/roku-os-16-0-beta)
