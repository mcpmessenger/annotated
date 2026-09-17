import re

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/lib/data.ts', 'r', encoding='utf-8') as f:
    text = f.read()

def replace_func(match):
    return """export async function getRecentAnnotations(): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error("Error fetching annotations:", error);
    return [];
  }
  
  const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))];
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
}"""

pattern1 = re.compile(r'export async function getRecentAnnotations\(\): Promise<Annotation\[\]> \{[\s\S]*?export async function getUserProfile')

def replace_func2(match):
    return """export async function getUserProfile(username: string): Promise<User | undefined> {
  // Since we don't have usernames natively yet, we do a wildcard search on email
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", `${username}@%`)
    .single();

  if (error || !data) return undefined;
  
  // get count
  const { count } = await supabase
    .from("annotations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", data.id);

  return {
    username,
    displayName: data.full_name || username,
    bio: "Annotated community member.",
    annotationCount: count || 0,
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
  
  const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))];
  const { data: pData } = await supabase.from("profiles").select("*").in("id", userIds);
  const profilesMap: Record<string, any> = {};
  if (pData) pData.forEach(p => { profilesMap[p.id] = p; });

  return data.map(row => {
    row.profiles = profilesMap[row.user_id] || {};
    return mapRowToAnnotation(row);
  });
}"""

# Actually, let's just replace everything from getRecentAnnotations to the end.
with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/lib/data.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text[:text.find('export async function getRecentAnnotations')] + replace_func(None) + "\n\n" + replace_func2(None)

with open('C:/Users/senti/OneDrive/Desktop/Extensions/Annotated/annotated-repo/lib/data.ts', 'w', encoding='utf-8') as f:
    f.write(text)

