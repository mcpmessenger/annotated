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

## 4. Autonomous OODA Quality Loop (MCP Driven)

The app development cycle is governed by an automated **OODA (Observe, Orient, Decide, Act)** loop using the `annotated-roku-mcp` tools:

1. **Observe**:
   - `roku_capture_screenshot`: Ingests active TV screen frame buffer into AI vision context.
   - `roku_read_logs`: Ingests BrightScript runtime stack traces and debug output.
2. **Orient**:
   - Compares screen pixels, typography, line wraps, and color values against the PRD design tokens.
3. **Decide**:
   - Identifies layout discrepancies (e.g. text overlap, unaligned elements, contrast failures).
4. **Act**:
   - Updates SceneGraph XML/BRS files, triggers `package.ps1`, sideloads via `roku_install_channel`, and repeats.
