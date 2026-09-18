import { supabase } from "./supabase";
import { Annotation, User } from "./types";

// Helper to map DB row to our UI Type
function mapRowToAnnotation(row: any): Annotation {
  const profile = row.profiles || {};
  const email = profile.email || "user@example.com";
  const username = email.split("@")[0];
  
  return {
    id: row.id,
    slug: row.slug || row.id,
    username: username,
    userDisplayName: profile.full_name || username,
    avatar_url: profile.avatar_url,
    title: row.page_title || row.hostname || "Webpage",
    sourceUrl: row.url,
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
  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return undefined;
  
  if (data.user_id) {
    const { data: pData } = await supabase.from("profiles").select("*").eq("id", data.user_id).single();
    if (pData) data.profiles = pData;
  }
  return mapRowToAnnotation(data);
}

export async function getUserProfile(username: string): Promise<User | undefined> {
  // Since we don't have usernames natively yet, we do a wildcard search on email
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", `${username}@%`)
    .single();

  if (error || !data) return undefined;
  
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

  return {
    id: data.id,
    username,
    displayName: data.full_name || username,
    bio: "Annotated community member.",
    annotationCount: count || 0,
    followerCount: followerCount || 0,
    followingCount: followingCount || 0,
    avatar: data.avatar_url,
  };
}

export async function getUserAnnotations(username: string): Promise<Annotation[]> {
  // First get the user id
  const { data: user } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", `${username}@%`)
    .single();

  if (!user) return [];

  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  
  const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  
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