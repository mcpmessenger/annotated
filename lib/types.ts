export interface Annotation {
  id: string;
  slug: string;
  username: string;
  userDisplayName: string;
  title: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDomain: string;
  quoteText: string;
  commentary: string;
  intent: "highlight" | "question" | "critique" | "expand";
  createdAt: Date;
  views: number;
  shares: number;
}

export interface User {
  username: string;
  displayName: string;
  bio: string;
  annotationCount: number;
  avatar?: string;
}

export type Intent = "all" | "highlight" | "question" | "critique" | "expand";
