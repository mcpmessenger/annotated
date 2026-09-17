<div align="center">
  <img src="public/logo.png" alt="Annotated Logo" width="128" />
  <h1>Annotated</h1>
  <p><strong>A public space to share commentary, questions, and insights about the web we read.</strong></p>
  <a href="https://annotated-repo.vercel.app">Website</a> |
  <a href="https://annotated-repo.vercel.app/explore">Explore Feed</a> |
  <a href="https://annotated-repo.vercel.app/install">Install</a>
</div>

<br />

## 🌟 What is Annotated?

The internet is full of static content, but the real value is in the ideas, critiques, and questions that content generates. **Annotated** is a Chrome Extension and companion web platform that transforms solitary reading into a multiplayer experience. 

It allows anyone to seamlessly highlight text on any webpage across the internet and attach their thoughts. Once published, these annotations become instantly visible to the community via a global feed and are persistently highlighted in-browser for any other Annotated users who visit that same URL.

## 🚀 Key Features

*   **Frictionless In-Browser Highlighting:** Just select text on any webpage, right-click, and drop your thoughts. No tab-switching required.
*   **Community Highlights:** When you visit a webpage, Annotated automatically fetches community insights. If someone else has annotated a sentence you're reading, it will be highlighted in yellow right on your screen.
*   **Global "Explore" Feed:** Discover trending insights, fact-checks, and critiques across the internet in a centralized, beautifully designed Next.js feed.
*   **Rich Profiles & Identity:** Powered by Google OAuth. Users have dedicated profile pages showcasing their intellectual footprint across the web.

## 🛠️ The Tech Stack

Built for speed, scale, and a flawless developer experience:

*   **Frontend Web App:** Next.js (App Router), React, TailwindCSS, Lucide Icons, deployed on **Vercel**.
*   **Browser Extension:** Google Chrome Manifest V3, pure vanilla JS/CSS for zero-overhead DOM injection, custom SidePanel UI.
*   **Backend & Auth:** **Supabase** (PostgreSQL). Handling real-time REST data fetching and Google OAuth integration directly within the extension's isolated environment.

## 💡 Why This Wins

Annotated isn't just an app; it's a new layer on top of the internet. By breaking commentary out of walled gardens (like Twitter threads or Reddit) and attaching it directly to the source material, Annotated curates a higher quality of discourse. 

It solves the "context collapse" problem of modern social media by literally pointing to the context.

---

## 💻 Developer Quick Setup

Want to run this locally? 

### 1. Load the Extension
1. Open Chrome -> `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** -> select the `extension/` folder
4. Note the **Extension ID** shown on the card

### 2. Configure Credentials
Update `extension/widget.js` and `extension/content.js` with your Supabase credentials:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 3. Run the Database Schema
Execute the SQL in `supabase/schema.sql` inside your Supabase SQL Editor.

### 4. Next.js Web App
```bash
npm install
npm run dev
```

## 📬 Contact
Have questions or feature requests? Reach out at [magnetarsenti@gmail.com](mailto:magnetarsenti@gmail.com).
