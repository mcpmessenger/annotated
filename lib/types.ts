export interface Annotation {
  id: string;
  userId?: string;
  slug: string;
  username: string;
  userDisplayName: string;
  title: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDomain: string;
  quoteText: string;
  commentary: string;
  intent: string;
  createdAt: Date;
  views: number;
  shares: number;
  media_url?: string | null;
  audio_url?: string | null;
  media_type?: string | null;
  avatar_url?: string | null;
}

export interface User {
  id?: string;
  username: string;
  displayName: string;
  bio: string;
  annotationCount: number;
  followerCount?: number;
  followingCount?: number;
  avatar?: string | null;
}

export type Intent = "all" | string;
