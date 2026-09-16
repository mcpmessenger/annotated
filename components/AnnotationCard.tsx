import Link from "next/link";
import { Annotation } from "@/lib/types";

const intentColors: Record<string, string> = {
  highlight: "bg-yellow-100 text-yellow-900",
  question: "bg-blue-100 text-blue-900",
  critique: "bg-red-100 text-red-900",
  expand: "bg-green-100 text-green-900",
};

const intentLabels: Record<string, string> = {
  highlight: "Highlight",
  question: "Question",
  critique: "Critique",
  expand: "Expand",
};

export function AnnotationCard({ annotation }: { annotation: Annotation }) {
  const link = `/${annotation.username}/${annotation.slug}`;

  return (
    <Link href={link}>
      <article className="annotation-card cursor-pointer group">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg group-hover:text-[hsl(var(--accent))] transition-colors">
              {annotation.title}
            </h3>
            <p className="text-sm text-[hsl(var(--text-subtle))] mt-1">
              by{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">
                {annotation.userDisplayName}
              </span>
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
              intentColors[annotation.intent]
            }`}
          >
            {intentLabels[annotation.intent]}
          </span>
        </div>

        <div className="bg-gray-50 p-4 rounded my-4 border-l-4 border-[hsl(var(--accent))]">
          <p className="text-sm italic text-[hsl(var(--text-muted))]">
            &ldquo;{annotation.quoteText}&rdquo;
          </p>
          <p className="text-xs text-[hsl(var(--text-subtle))] mt-2">
            from {annotation.sourceTitle}
          </p>
        </div>

        <p className="text-base text-[hsl(var(--foreground))] line-clamp-2 mb-4">
          {annotation.commentary}
        </p>

        <div className="flex items-center justify-between text-xs text-[hsl(var(--text-subtle))]">
          <span>
            {annotation.views} views · {annotation.shares} shares
          </span>
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
