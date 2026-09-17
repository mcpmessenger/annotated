# Comments & Reactions Implementation

- [ ] Database Schema
  - [ ] Generate SQL for `comments` table & RLS
  - [ ] Generate SQL for `annotation_reactions` table & RLS
  - [ ] Add emoji CHECK constraint to `annotations.intent`
- [ ] Extension Updates
  - [ ] Update `widget.html` with emoji hotkey buttons
  - [ ] Update `widget.js` to save the selected emoji hotkey
- [ ] Next.js Auth Setup
  - [ ] Install `@supabase/supabase-js`
  - [ ] Create simple Google Login button in `Header.tsx`
  - [ ] Manage auth state globally (client-side)
- [ ] Next.js UI
  - [ ] Update `AnnotationCard.tsx` to display emoji intent & reaction buttons
  - [ ] Build `CommentSection.tsx` component
  - [ ] Integrate comment section into `app/[username]/[slug]/page.tsx`
