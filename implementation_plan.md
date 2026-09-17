# Implementation Plan: Fix Card Navigation, "See More" Logic & Comment Accessibility

## Problem Analysis
1. **"See More / See Less" showing on short text:**
   - The character threshold in `AnnotationCard.tsx` was set too low (150 chars), causing "See more" to display on short text that already fits inside the 3-line box without any visual truncation.
   - **Fix:** Increase threshold to > 240 characters (or actual 3-line overflow) so "See more" only renders when text is actually cut off.

2. **Comment Section not reachable/visible:**
   - `AnnotationCard.tsx` had `relative z-10` / `relative z-20` wrappers over the quote and commentary text. This stacked the text elements ABOVE the card link (`before:absolute before:inset-0`), preventing clicks on 90% of the card area from navigating to the detail page.
   - Users couldn't reach `/[username]/[slug]` where the `CommentSection` resides.
   - **Fix:** 
     - Clean up card z-indexing so clicking the card reliably navigates to `/[username]/[slug]`.
     - Add an explicit **"💬 Comments" button** to the bottom row of every `AnnotationCard` showing the comment count and linking directly to the comment section (`/[username]/[slug]#comments`).

## Proposed Changes

### `components/AnnotationCard.tsx`
- Increase character threshold for `showToggle` from 150 to 240+ chars.
- Remove blocking `relative z-10` / `relative z-20` on static text containers while keeping interactive elements (`a`, `button`, `ReactionRow`) cleanly clickable.
- Fetch comment count for each card (or display interactive comment button).
- Add a explicit comment action button `💬 Comments` at the bottom of each card.

### `components/CommentSection.tsx`
- Ensure smooth scrolling to `#comments` anchor tag.
- Verify robust error logging for Supabase comment fetching and insertion.

## Verification Plan
1. Test card text length: verify short quotes/tweets do NOT display "See more".
2. Test card clickability: verify clicking anywhere on a feed card navigates to the detail page.
3. Test comment section: verify clicking "💬 Comments" on a feed card opens the detail page scrolled directly to the comment section.
