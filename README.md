# Annotated Extension

Web annotation Chrome extension with Google OAuth and Supabase persistence.

## 🚀 Quick Setup

### 1. Load the Extension
- Open Chrome → `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked** → select the `extension/` folder
- Note the **Extension ID** shown on the card

### 2. Create a Supabase Project
- Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
- Copy your **Project URL** and **anon key** from Settings → API

### 3. Run the Database Schema
- Go to **SQL Editor** in your Supabase dashboard
- Paste and run the contents of `supabase/schema.sql`

### 4. Enable Google OAuth in Supabase
- Go to **Authentication → Providers → Google**
- Enable it and paste your Google OAuth Client ID + Secret

### 5. Create Google OAuth Credentials
- Go to [console.cloud.google.com](https://console.cloud.google.com/apis/credentials?project=annotated-ext-0916)
- **Create credentials → OAuth 2.0 Client ID**
- Application type: **Chrome Extension**
- Your extension ID: *(from step 1)*
- Note the **Client ID**

### 6. Configure the Extension
Update `extension/supabase-client.js` with your values:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
```

Also update `extension/manifest.json`:
```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"
}
```

### 7. Reload Extension
Back in `chrome://extensions` → click the refresh icon on the extension card.

## 📖 How to Annotate
1. Navigate to any webpage
2. **Select / highlight text**
3. **Right-click** → **"Annotate with Annotated"**
4. The side panel opens with your selected text pre-filled
5. Add your comment, choose an intent, and publish!

## 🗂 Project Structure
```
extension/            Chrome extension (MV3)
  manifest.json       Permissions and config
  background.js       Service worker + context menu
  content.js          Highlight renderer + selection capture
  sidepanel.html      Side panel UI
  sidepanel.js        Side panel logic + auth + Supabase
  sidepanel.css       Styles
  supabase-client.js  Lightweight Supabase REST + auth client

supabase/
  schema.sql          Database schema + RLS policies
```

## 🔗 Links
- Site: [annotated-six.vercel.app](https://annotated-six.vercel.app)
- GCP Project: [annotated-ext-0916](https://console.cloud.google.com/home/dashboard?project=annotated-ext-0916)
