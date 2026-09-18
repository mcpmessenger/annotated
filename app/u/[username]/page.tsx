import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnotationCard } from "@/components/AnnotationCard";
import { FollowButton } from "@/components/FollowButton";
import { getUserProfile, getUserAnnotations } from "@/lib/data";

export const revalidate = 0;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }> | { username: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const username = decodeURIComponent(resolvedParams?.username || "").trim();
  const user = await getUserProfile(username);

  if (!user) {
    notFound();
  }

  const annotations = await getUserAnnotations(username);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Profile Header */}
        <section className="border-b border-[hsl(var(--border))] bg-white">
          <div className="editorial-container py-12">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent-muted))] mb-4 flex items-center justify-center text-white font-bold text-2xl">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
              <h1 className="editorial-heading">{user.displayName}</h1>
              {user.id && (
                <FollowButton targetUserId={user.id} initialFollowerCount={user.followerCount} />
              )}
            </div>
            <p className="text-sm text-[hsl(var(--text-muted))] mb-4 max-w-2xl leading-relaxed">
              {user.bio}
            </p>
            <div className="flex items-center gap-3 text-sm font-medium text-[hsl(var(--foreground))] flex-wrap">
              <span>{user.annotationCount} annotation{user.annotationCount !== 1 ? "s" : ""}</span>
              <span className="text-[hsl(var(--border))]">•</span>
              <span>{user.followerCount || 0} follower{(user.followerCount || 0) !== 1 ? "s" : ""}</span>
              <span className="text-[hsl(var(--border))]">•</span>
              <span>{user.followingCount || 0} following</span>
            </div>
          </div>
        </section>

        {/* Annotations */}
        <section className="editorial-container py-12">
          {annotations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[hsl(var(--text-muted))]">No annotations yet.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-8">
                {user.displayName}'s Annotations
              </h2>
              <div className="space-y-6 grid gap-6 sm:grid-cols-1 lg:grid-cols-1">
                {annotations.map((annotation) => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
