import Link from "next/link";
import { Annotation } from "@/lib/types";

export function AnnotationCard({ annotation }: { annotation: Annotation }) {
  const link = `/${annotation.username}/${annotation.slug}`;

  return (
    <Link href={link}>
      <article className="annotation-card cursor-pointer group hover:-translate-y-1 transition-transform">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 flex items-center gap-3">
            {annotation.avatar_url ? (
              <img src={annotation.avatar_url} alt={annotation.userDisplayName} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--border))] flex items-center justify-center font-bold text-[hsl(var(--text-muted))]">
                {annotation.userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg group-hover:text-[hsl(var(--accent))] transition-colors line-clamp-1">
                {annotation.title}
              </h3>
              <p className="text-sm text-[hsl(var(--text-subtle))] mt-1">
                by{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {annotation.userDisplayName}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded my-4 border-l-4 border-[hsl(var(--accent))] bg-[hsl(var(--border))]">
          <p className="text-sm italic text-[hsl(var(--text-muted))] line-clamp-3">
            &ldquo;{annotation.quoteText}&rdquo;
          </p>
          <p className="text-xs text-[hsl(var(--text-subtle))] mt-2">
            from {annotation.sourceTitle}
          </p>
        </div>
        
        {annotation.media_url && (
          <div className="my-4 rounded overflow-hidden border border-[hsl(var(--border))] bg-black">
            {annotation.media_type === "video" ? (
              <video src={annotation.media_url} controls className="w-full max-h-64 object-contain" />
            ) : (
              <img src={annotation.media_url} alt="Attached media" className="w-full max-h-64 object-contain" />
            )}
          </div>
        )}

        <p className="text-base text-[hsl(var(--foreground))] line-clamp-2 mb-4">
          {annotation.commentary}
        </p>

        <div className="flex items-center justify-between text-xs text-[hsl(var(--text-subtle))]">
          <span>
            {annotation.createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </article>
    </Link>
  );
}
