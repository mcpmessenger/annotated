# annotated. — Amazon Fire TV & Android TV 10-Foot Client

> **Living room truth at 10 feet.** Real-time video annotations, timestamped commentary, and community-driven consensus indicators engineered natively for Amazon Fire TV and Android TV.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Amazon Appstore](https://img.shields.io/badge/Amazon_Appstore-Fire_TV-FF9900?style=for-the-badge&logo=amazon)](https://developer.amazon.com)
[![Platform](https://img.shields.io/badge/Platform-FireOS%20%7C%20Android%20TV-3DDC84?style=for-the-badge&logo=android)](https://developer.amazon.com/fire-tv)
[![Hackathon](https://img.shields.io/badge/Amazon_Developer_Hackathon-2026-6366F1?style=for-the-badge)](https://developer.amazon.com)

---

## 📺 Overview

**annotated.** brings crowdsourced fact-checking, timestamp-synchronized annotations, and live video analysis to the biggest screen in the house.

While traditional television passively broadcasts unverified claims, **annotated.** transforms the living room experience into a participatory, truth-seeking platform. Full-screen HD streaming video is paired with a lightweight, glassmorphic HUD overlay, dynamic color-coded consensus badges, and instant smartphone interactivity via on-screen QR codes.

Built for the **Amazon Developer Hackathon (Deadline: Oct 23, 2026)**.

---

## ✨ Key Features

* **Edge-to-Edge 1080p Video Canvas**: Full-bleed video display (`100vw × 100vh`) with non-intrusive floating HUD elements tailored specifically for 10-foot viewing distances.
* **Dynamic Color-Coded Consensus Badges**:
  * 🟢 **`✓ VERIFIED ACCURATE`**: Supported by verifiable sources and verified consensus.
  * 🟡 **`⏳ NEEDS INFO / UNVERIFIED`**: Pending community review, satirical/comedy context (e.g., SNL, parody), or unverified claims.
  * 🔴 **`✕ RATED FALSE`**: Flagged by community fact-checkers as debunked or inaccurate.
* **Diagonal "FALSE" Rubber Stamp**: Iconic grunge stamp stamped diagonally across the screen whenever a clip or claim is rated false.
* **Dynamic Annotation Accent Line**: The quote boundary line dynamically matches the truth state (Green for verified, Yellow for needs context, Red for false).
* **Instant Smartphone Bridge**:
  * **`✏️ Annotate`**: Generates a live QR code allowing viewers to capture and comment on the exact video timestamp directly from their mobile phone.
  * **`⚠️ File Claim`**: Prompts an interactive dispute dialog to submit evidence, counter-arguments, and check audit logs.
* **Intuitive Remote Control (D-Pad)**:
  * **▲ Up / ▼ Down Arrows**: Seamlessly channel-surf through video clips.
  * **◄ Left / ► Right Arrows**: Glide smoothly across the bottom reaction dock.
  * **OK / Select**: Activate actions (Annotate, React, Dispute).
  * **Back Button**: Gracefully closes active overlays and modals before exiting.
* **Live S3 & Supabase Pipeline**: Streams H.264 video clips directly from Amazon S3 and Supabase REST feeds.

---

## 🛠️ Architecture & Tech Stack

Engineered for 60 FPS performance and sub-second startup times on Fire TV hardware (Fire TV Stick 4K, Fire TV Cube, Android TV):

* **Native Shell**: Kotlin + AndroidX WebView with Hardware Acceleration enabled (`android:hardwareAccelerated="true"`).
* **D-Pad Remote Interceptor**: Custom `KeyEvent` dispatcher in `MainActivity.kt` mapped to hardware remote control keycodes (`KEYCODE_DPAD_*`, `KEYCODE_ENTER`, `KEYCODE_BACK`).
* **Bidirectional JavaScript Bridge (`AndroidBridge`)**: Enables seamless remote control navigation and modal dismissals without mouse pointer simulation.
* **Leanback Manifest Compliance**: Declares `android.software.leanback` and `LEANBACK_LAUNCHER` with touchscreen requirements disabled (`android.hardware.touchscreen` = false).
* **Fast, Clean Builds**: Clean Kotlin DSL Gradle architecture with zero C++/CMake dependencies for sub-15 second compilation.

---

## 🚀 Building & Running

### Prerequisites
* **JDK 17 or JDK 21** (Adoptium / Eclipse Temurin recommended)
* **Android SDK**: API Level 26 minimum, API 35/36 target
* **Device / Emulator**: Android TV / Fire TV Emulator or physical Fire TV Stick with ADB Debugging enabled

### 1. Compile Debug APK
```bash
./gradlew.bat assembleDebug
```
Output: `app/build/outputs/apk/debug/app-debug.apk`

### 2. Install on Device or Emulator via ADB
```bash
# Connect to your Fire TV Stick over Wi-Fi:
adb connect 192.168.1.XXX:5555

# Install and launch:
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.annotated.app/.MainActivity
```

### 3. Build Production Signed Release APK
Create `app/keystore.properties` in your local environment (excluded from Git):
```properties
storeFile=release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=annotated
keyPassword=YOUR_KEY_PASSWORD
```

Then compile the signed release package:
```bash
./gradlew.bat assembleRelease
```
Output: `app/build/outputs/apk/release/app-release.apk`

---

## 🔒 Security & Privacy

* **Zero Personal Telemetry**: Requires no login or account creation to browse and watch public feeds.
* **No Third-Party Ad Trackers**: Completely free of advertising trackers and telemetry SDKs.
* **Full Privacy Policy**: Available at [https://annotated-repo.vercel.app/privacy](https://annotated-repo.vercel.app/privacy).
* **Terms of Service**: Available at [https://annotated-repo.vercel.app/terms](https://annotated-repo.vercel.app/terms).

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Annotated / Senti Labs.
