import { Annotation, User } from "./types";

const now = new Date();

export const SEED_ANNOTATIONS: Annotation[] = [
  {
    id: "1",
    slug: "web-futures-commentary",
    username: "alexchen",
    userDisplayName: "Alex Chen",
    title: "On the future of web annotation",
    sourceUrl: "https://example.com/article/web-futures",
    sourceTitle: "The Future of Web Annotation: Why It Matters",
    sourceDomain: "example.com",
    quoteText: "Annotation represents a fundamental shift in how we engage with digital content.",
    commentary:
      "This captures an important moment in digital literacy. As we move toward participatory reading, the ability to annotate becomes a core civic skill. Libraries have understood this for centuries—marginalia is thinking in action.",
    intent: "expand",
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    views: 342,
    shares: 18,
  },
  {
    id: "2",
    slug: "rethinking-digital-literacy",
    username: "sarakim",
    userDisplayName: "Sara Kim",
    title: "Rethinking digital literacy for the age of annotation",
    sourceUrl: "https://example.com/article/literacy",
    sourceTitle: "Digital Literacy in 2026",
    sourceDomain: "example.com",
    quoteText: "Digital literacy has traditionally meant the ability to consume and create content.",
    commentary:
      "True—but what's missing? The ability to *respond* and *contextualize* in place. Annotation closes that loop. It transforms passive reading into active dialogue with authors and other readers.",
    intent: "critique",
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    views: 521,
    shares: 34,
  },
  {
    id: "3",
    slug: "margins-and-meaning",
    username: "marcus_w",
    userDisplayName: "Marcus Washington",
    title: "Margins and meaning: the scholarly tradition",
    sourceUrl: "https://example.com/article/margins",
    sourceTitle: "Reading in the Margins: A History",
    sourceDomain: "example.com",
    quoteText:
      "Scholars have always written in the margins. That marginalia is often as important as the text itself.",
    commentary: "Exactly. The digital turn forced margins to disappear for decades. We're witnessing a welcome return.",
    intent: "highlight",
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    views: 189,
    shares: 12,
  },
  {
    id: "4",
    slug: "content-moderation-questions",
    username: "jenna_patel",
    userDisplayName: "Jenna Patel",
    title: "Questions about content moderation at scale",
    sourceUrl: "https://example.com/article/moderation",
    sourceTitle: "Moderating the Web: Challenges and Trade-offs",
    sourceDomain: "example.com",
    quoteText: "How do we maintain civil discourse while preserving freedom of expression?",
    commentary:
      "This is the hard question. Annotation platforms inherit this tension. Does the ability to respond everywhere create dialogue, or does it invite harassment? The answer probably depends on design choices we haven't fully explored yet.",
    intent: "question",
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    views: 267,
    shares: 21,
  },
  {
    id: "5",
    slug: "accessibility-first-design",
    username: "alexchen",
    userDisplayName: "Alex Chen",
    title: "Annotation must be accessible first",
    sourceUrl: "https://example.com/article/accessibility",
    sourceTitle: "Building Accessible Annotation Interfaces",
    sourceDomain: "example.com",
    quoteText:
      "If annotation tools are inaccessible to people with disabilities, they reinforce existing exclusions.",
    commentary:
      "This principle should be non-negotiable. Annotation is about amplifying voice. Inaccessible tools silence people. Keyboard navigation, screen reader support, and color contrast aren't nice-to-haves—they're the foundation.",
    intent: "expand",
    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    views: 418,
    shares: 29,
  },
  {
    id: "6",
    slug: "publishing-workflows-evolution",
    username: "sarakim",
    userDisplayName: "Sara Kim",
    title: "How annotation changes publishing workflows",
    sourceUrl: "https://example.com/article/publishing",
    sourceTitle: "The Future of Publishing in an Annotated Web",
    sourceDomain: "example.com",
    quoteText: "Publishers fear losing control of their narratives.",
    commentary:
      "A fair concern—but also an opportunity. Smart publishers recognize that annotation isn't a threat to authority, it's a way to deepen engagement. The most trusted voices often invite conversation.",
    intent: "critique",
    createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    views: 356,
    shares: 25,
  },
];

export const SEED_USERS: User[] = [
  {
    username: "alexchen",
    displayName: "Alex Chen",
    bio: "Thinking about the future of digital reading, annotation, and knowledge work. Writer & researcher.",
    annotationCount: 47,
  },
  {
    username: "sarakim",
    displayName: "Sara Kim",
    bio: "Digital literacy educator. Interested in how tools shape thinking. Based in Oakland.",
    annotationCount: 34,
  },
  {
    username: "marcus_w",
    displayName: "Marcus Washington",
    bio: "Historian of technology and print culture. Believes margins matter.",
    annotationCount: 28,
  },
  {
    username: "jenna_patel",
    displayName: "Jenna Patel",
    bio: "Researcher in human-computer interaction. Exploring collaborative reading.",
    annotationCount: 52,
  },
];

export function getAnnotation(username: string, slug: string): Annotation | undefined {
  return SEED_ANNOTATIONS.find((a) => a.username === username && a.slug === slug);
}

export function getUser(username: string): User | undefined {
  return SEED_USERS.find((u) => u.username === username);
}

export function getUserAnnotations(username: string): Annotation[] {
  return SEED_ANNOTATIONS.filter((a) => a.username === username);
}

export function getAnnotationsByIntent(intent: string): Annotation[] {
  if (intent === "all") return SEED_ANNOTATIONS;
  return SEED_ANNOTATIONS.filter((a) => a.intent === intent);
}
