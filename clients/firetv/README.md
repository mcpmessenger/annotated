# annotated. — Amazon Fire TV & Android TV 10-Foot Experience

> **Living room truth at 10 feet.** Real-time video annotations, timestamped commentary, and community-driven fact-checking designed natively for Amazon Fire TV and Android TV.

[![Amazon Appstore](https://img.shields.io/badge/Amazon_Appstore-Fire_TV-FF9900?style=for-the-badge&logo=amazon)](https://developer.amazon.com)
[![Platform](https://img.shields.io/badge/Platform-FireOS%20%7C%20Android%20TV-3DDC84?style=for-the-badge&logo=android)](https://developer.amazon.com/fire-tv)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)

---

## 📺 Overview

**annotated.** transforms the living room television experience into a participatory, truth-seeking platform. 

While traditional television passively broadcasts unverified claims, **annotated.** pairs full-screen HD video streaming with crowdsourced fact-checking, timestamp-synchronized commentary, and instant smartphone verification via on-screen QR codes.

Built for the **Amazon Developer Hackathon (Deadline: Oct 23, 2026)**.

---

## ✨ Key Features

* **Edge-to-Edge 1080p Canvas**: Clean, high-contrast Obsidian (`#000000` / `#090D16`) presentation engineered specifically for 10-foot viewing distances.
* **Dynamic Consensus Indicators**:
  * 🟢 **`✓ VERIFIED ACCURATE`**: High community confidence and cross-referenced sources.
  * 🟡 **`⏳ NEEDS INFO / UNVERIFIED`**: Pending community review or contested claims.
  * 🔴 **`✕ RATED FALSE`**: Flagged by community consensus.
* **Diagonal "FALSE" Rubber Stamp**: Iconic grunge rubber-stamp banner stamped diagonally across the screen whenever a claim is rated false.
* **Channel-Surfing Remote Navigation**:
  * **▲ Up / ▼ Down Arrows**: Instantly channel-surf through live S3/Supabase video clips.
  * **◄ Left / ► Right Arrows**: Glide smoothly across the bottom cinematic reaction dock.
  * **OK / Enter**: Trigger actions (Annotate, React, or File Claim).
  * **Back**: Gracefully dismisses active dialogs before exiting.
* **Instant Smartphone Bridge**:
  * **`✏️ Annotate`**: Generates a dynamic QR code allowing viewers to capture and comment on the exact timestamp from their mobile phones.
  * **`⚠️ File Claim`**: Prompts an interactive dispute dialog to submit evidence and review the cryptographic audit log.
* **Live S3 & Supabase Pipeline**: Ingests real transcoded H.264 MP4 clips from Amazon S3 and Supabase REST feeds.

---

## 🛠️ Architecture & Tech Stack

Designed for maximum performance and sub-second startup times on Fire TV Stick hardware:

* **Native Shell**: Kotlin + AndroidX WebView with Hardware Acceleration.
* **D-Pad Remote Interceptor**: Custom `KeyEvent` dispatcher in `MainActivity.kt` mapped to hardware remote control codes (`KEYCODE_DPAD_*`, `KEYCODE_ENTER`, `KEYCODE_BACK`).
* **Bidirectional JavaScript Bridge (`AndroidBridge`)**: Enables seamless remote key handling and deep modal dismissals.
* **Leanback Manifest Compliance**: Declares `android.software.leanback` and `LEANBACK_LAUNCHER` with touch-screen requirements set to false for pure D-pad remote operation.
* **Zero CMake/Ninja Lockups**: Clean 11-second compilation times with no heavy C++ toolchain deadlocks.

---

## 🚀 Building & Running

### Prerequisites
* JDK 17 or JDK 21 (Adoptium recommended)
* Android SDK (API Level 26 minimum, API 35/36 target)
* Android TV / Fire TV Emulator or physical Fire TV Stick with ADB enabled

### 1. Compile Debug APK
```bash
./gradlew.bat assembleDebug
```
Output: `app/build/outputs/apk/debug/app-debug.apk`

### 2. Install on Device or Emulator
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.annotated.app/.MainActivity
```

### 3. Build Production Signed Release APK
Create a local `app/keystore.properties` (ignored by git):
```properties
storeFile=release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=annotated
keyPassword=YOUR_KEY_PASSWORD
```
Then run:
```bash
./gradlew.bat assembleRelease
```
Output: `app/build/outputs/apk/release/app-release.apk`

---

## 🔒 Security & Privacy

* **Zero Personal Telemetry**: Requires no account or login to browse and watch public feeds.
* **No Third-Party Ad Trackers**: No analytics or ad-network SDKs.
* **Full Privacy Policy**: Available at [https://annotated-repo.vercel.app/privacy](https://annotated-repo.vercel.app/privacy).

---

## 📄 License

Apache License 2.0. Copyright (c) 2026 Senti Labs / Annotated.
