// ─── Core Data Types ──────────────────────────────────────────────────────────

export interface Annotation {
  id?: string;
  slug?: string;
  user_id?: string;
  quote?: string;
  quote_text?: string;
  comment?: string;
  commentary?: string;
  intent?: string;
  page_title?: string;
  title?: string;
  url?: string;
  hostname?: string;
  media_url?: string;
  media_type?: string | null;
  audio_url?: string;
  media_timestamp?: number | null;
  created_at?: string;
  username?: string;
  user_name?: string;
  author_profile?: UserProfile;
  extractedTimestamp?: number | null;
  _hasScrolled?: boolean;
}

export interface UserProfile {
  id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  annotation_id: string;
  user_id: string;
  text?: string;
  content?: string;
  created_at: string;
  profile?: UserProfile;
}

export interface Reaction {
  annotation_id: string;
  user_id: string;
  emoji: string;
}

export interface PageContext {
  title: string;
  url: string;
  hostname: string;
}

export interface FactCheckResult {
  verdict?: string;
  headline?: string;
  explanation?: string;
  communityNote?: string;
  tweetIntentUrl?: string;
}

export interface NotificationRow {
  id: string;
  recipient_id: string;
  annotation_id?: string;
  message?: string;
  read: boolean;
  created_at?: string;
}
