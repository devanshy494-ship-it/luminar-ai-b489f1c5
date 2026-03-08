

## Plan: Add Scope/Focus Input & Context-Aware "Generate More"

### What you asked for
1. A new input field (tab/section) below the file upload and URL areas where you can specify the **scope or focus** for flashcard generation (e.g., "only cover chapter 3" or "focus on key formulas").
2. When clicking "Generate More Cards" on the Flashcards page, it should remember the **original topics, scope, and card count preferences** so new cards stay relevant.

### How it will work

**Feature 1: Scope/Focus Input**
- Add a new `Textarea` field in `FlashcardCreator.tsx` below the file/URL/text input area (visible in all three modes), labeled something like "Focus Instructions (optional)"
- Placeholder: "e.g., Focus only on chapter 3, or only cover key formulas..."
- This scope text gets passed to the `analyze-document` and `generate-document-flashcards` edge functions as an additional `scope` parameter
- Both edge functions will include the scope in their AI prompts so the analysis and card generation respect the user's narrowing instructions

**Feature 2: Persistent context for "Generate More"**
- Add a `generation_context` JSONB column to the `topics` table to store the original generation parameters (selected topics, scope, total cards requested)
- When flashcards are first generated via `generate-document-flashcards`, save `{ selectedTopics, scope, totalCards, content_summary }` into this column
- Update the `generate-flashcards` edge function (used by "Generate More") to read `generation_context` from the topic row and include those topics/scope in its AI prompt instead of just the topic title
- Update the Flashcards page's "Generate More" handler to pass a desired card count (default 10, or let user pick)

### Files to change

| File | Change |
|---|---|
| `src/components/FlashcardCreator.tsx` | Add scope textarea below input modes; pass scope to edge functions |
| `supabase/functions/analyze-document/index.ts` | Accept and use `scope` in AI prompt |
| `supabase/functions/generate-document-flashcards/index.ts` | Accept `scope`, save `generation_context` to topics table |
| `supabase/functions/generate-flashcards/index.ts` | Read `generation_context` from topic; use stored topics/scope in prompt |
| Database migration | Add `generation_context JSONB DEFAULT NULL` to `topics` table |
| `src/pages/Flashcards.tsx` | Minor: no major changes needed (existing "Generate More" already calls the right function) |

