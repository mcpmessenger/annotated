import { supabase } from "./supabase";
import { Annotation, User } from "./types";

// Helper to map DB row to our UI Type
function mapRowToAnnotation(row: any): Annotation {
  const profile = row.profiles || {};
  const email = profile.email || "user@example.com";
  const username = email.split("@")[0];
  
  let sourceUrl = row.url;
  // Resolve known historical tweet annotations that were captured on x.com/Jason
  if (sourceUrl === 'https://x.com/Jason' && row.quote?.includes('$5,000 prize')) {
    sourceUrl = 'https://x.com/Jason/status/2100272625289433254';
  }

  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug || row.id,
    username: username,
    userDisplayName: profile.full_name || username,
    avatar_url: profile.avatar_url,
    title: row.page_title || row.hostname || "Webpage",
    sourceUrl: sourceUrl,
    sourceTitle: row.page_title || row.hostname,
    sourceDomain: row.hostname || "",
    quoteText: row.quote,
    commentary: row.comment,
    intent: (row.intent || "").toLowerCase().replace(" ", "-"),
    createdAt: new Date(row.created_at),
    views: 0,
    shares: 0,
    media_url: row.media_url,
      audio_url: row.audio_url,
    media_type: row.media_type,
  };
}

export async function getRecentAnnotations(): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error("Error fetching annotations:", error);
    return [];
  }
  
  const userIds = Array.from(new Set(data.map(a => a.user_id).filter(Boolean)));
  const { data: pData } = await supabase.from("profiles").select("*").in("id", userIds);
  const profilesMap: Record<string, any> = {};
  if (pData) pData.forEach(p => { profilesMap[p.id] = p; });

  return data.map(row => {
    row.profiles = profilesMap[row.user_id] || {};
    return mapRowToAnnotation(row);
  });
}

export async function getAnnotationBySlug(slug: string): Promise<Annotation | undefined> {
  const cleanSlug = decodeURIComponent(slug || "").trim();
  if (!cleanSlug) return undefined;

  // 1. Direct slug match
  let { data } = await supabase
    .from("annotations")
    .select("*")
    .eq("slug", cleanSlug)
    .maybeSingle();

  // 2. Contains slug match (e.g. if slug has leading dashes or short suffix)
  const stripped = cleanSlug.replace(/^-+/, "");
  if (!data && stripped.length >= 4) {
    const { data: bySlugLike } = await supabase
      .from("annotations")
      .select("*")
      .ilike("slug", `%${stripped}%`)
      .maybeSingle();
    if (bySlugLike) data = bySlugLike;
  }

  // 3. Exact UUID match if cleanSlug or stripped is a valid 36-char UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stripped);
  if (!data && isUuid) {
    const { data: byId } = await supabase
      .from("annotations")
      .select("*")
      .eq("id", stripped)
      .maybeSingle();
    if (byId) data = byId;
  }

  // 4. Fallback search over recent annotations matching id prefix or slug substring
  if (!data && stripped.length >= 4) {
    const { data: allRecent } = await supabase
      .from("annotations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (Array.isArray(allRecent)) {
      data = allRecent.find(a => 
        String(a.slug || "").includes(stripped) || 
        String(a.id || "").toLowerCase().startsWith(stripped.toLowerCase())
      );
    }
  }

  if (!data) return undefined;
  
  if (data.user_id) {
    const { data: pData } = await supabase.from("profiles").select("*").eq("id", data.user_id).maybeSingle();
    if (pData) data.profiles = pData;
  }
  return mapRowToAnnotation(data);
}

export async function getUserProfile(username: string): Promise<User | undefined> {
  const cleanUsername = decodeURIComponent(username || "").trim();
  if (!cleanUsername) return undefined;

  // 1. Try matching by email prefix
  let { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", `${cleanUsername}@%`)
    .maybeSingle();

  // 2. Try matching by full_name
  if (!data) {
    const res = await supabase
      .from("profiles")
      .select("*")
      .ilike("full_name", cleanUsername)
      .maybeSingle();
    data = res.data;
  }

  // 3. Try matching by exact user id
  if (!data) {
    const res = await supabase
      .from("profiles")
      .select("*")
      .eq("id", cleanUsername)
      .maybeSingle();
    data = res.data;
  }

  if (!data) return undefined;
  
  // get annotation count
  const { count } = await supabase
    .from("annotations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", data.id);

  // get followers count
  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", data.id);

  // get following count
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", data.id);

  const resolvedUsername = data.email ? data.email.split("@")[0] : cleanUsername;

  return {
    id: data.id,
    username: resolvedUsername,
    displayName: data.full_name || resolvedUsername,
    bio: "Annotated community member.",
    annotationCount: count || 0,
    followerCount: followerCount || 0,
    followingCount: followingCount || 0,
    avatar: data.avatar_url,
  };
}

export async function getUserAnnotations(username: string): Promise<Annotation[]> {
  const cleanUsername = decodeURIComponent(username || "").trim();
  if (!cleanUsername) return [];

  // First get the user id
  let { data: user } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", `${cleanUsername}@%`)
    .maybeSingle();

  if (!user) {
    const res = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", cleanUsername)
      .maybeSingle();
    user = res.data;
  }

  if (!user) {
    const res = await supabase
      .from("profiles")
      .select("id")
      .eq("id", cleanUsername)
      .maybeSingle();
    user = res.data;
  }

  if (!user) return [];

  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  
  const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  
  return data.map(row => {
    row.profiles = pData || {};
    return mapRowToAnnotation(row);
  });
}

export async function getAnnotationsByIntent(intent: string): Promise<Annotation[]> {
  if (intent === "all") return getRecentAnnotations();
  
  // Reverse the slugification of the intent
  const dbIntent = intent.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .ilike("intent", dbIntent)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  
  const userIds = Array.from(new Set(data.map(a => a.user_id).filter(Boolean)));
  const { data: pData } = await supabase.from("profiles").select("*").in("id", userIds);
  const profilesMap: Record<string, any> = {};
  if (pData) pData.forEach(p => { profilesMap[p.id] = p; });

  return data.map(row => {
    row.profiles = profilesMap[row.user_id] || {};
    return mapRowToAnnotation(row);
  });
}