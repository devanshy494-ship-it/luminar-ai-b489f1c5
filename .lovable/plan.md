

## Problem

The `generate-flashcards` edge function creates individual flashcard rows but never creates a corresponding `flashcard_groups` record. The Dashboard queries only `flashcard_groups` to display sets, so it shows 0. The MyFlashcards page works because it has custom grouping logic over raw `flashcards`.

## Solution

Fix the `generate-flashcards` edge function to also create a `flashcard_groups` entry and assign it to the generated flashcards. Also update the Dashboard to show ungrouped flashcards as a fallback.

### Changes

1. **`supabase/functions/generate-flashcards/index.ts`** — After inserting flashcard rows, create a `flashcard_groups` record (using topic title + step title as name) and update the flashcards with the new `group_id`.

2. **`src/pages/Dashboard.tsx`** — Add a secondary query: after fetching `flashcard_groups`, also fetch distinct flashcard counts grouped by `topic_id` for flashcards with `group_id IS NULL`. Merge these into the displayed list so ungrouped flashcards still appear. This ensures existing orphaned flashcards show up immediately without a migration.

3. **`src/pages/MyFlashcards.tsx`** — No changes needed (already handles ungrouped flashcards).

### Technical details

- In the edge function, after `supabase.from("flashcards").insert(flashcardRows)`, add:
  - Insert into `flashcard_groups` with `user_id`, `name` (topic title), `topic_id`
  - Update the just-inserted flashcards to set `group_id` to the new group ID
- In Dashboard, after the main `Promise.all`, run a fallback query for flashcards where `group_id IS NULL`, group them client-side by `topic_id`, fetch topic titles, and merge into `flashcardGroups` state as synthetic entries

