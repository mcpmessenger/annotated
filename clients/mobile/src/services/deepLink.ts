import * as Linking from 'expo-linking';

export interface ParsedLink {
  type: 'note' | 'feed' | 'share';
  slug?: string;
  sharedUrl?: string;
}

export function parseDeepLink(url: string | null): ParsedLink {
  if (!url) return { type: 'feed' };

  try {
    const parsed = Linking.parse(url);

    // 1. Custom scheme: annotated://note/:slug or annotated://n/:slug
    if (parsed.scheme === 'annotated') {
      const pathParts = (parsed.path || '').split('/').filter(Boolean);
      if (pathParts[0] === 'note' || pathParts[0] === 'n') {
        return { type: 'note', slug: pathParts[1] };
      }
      if (parsed.queryParams?.slug) {
        return { type: 'note', slug: String(parsed.queryParams.slug) };
      }
    }

    // 2. Web universal link: https://annotated-repo.vercel.app/@author/slug
    if (url.includes('annotated-repo.vercel.app')) {
      const parts = url.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && !lastPart.startsWith('@') && lastPart !== 'annotated-repo.vercel.app') {
        return { type: 'note', slug: lastPart };
      }
    }

    // 3. Android Share Intent passing plain text URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return { type: 'share', sharedUrl: url };
    }
  } catch (err) {
    console.warn('[DeepLink] Parse error:', err);
  }

  return { type: 'feed' };
}
