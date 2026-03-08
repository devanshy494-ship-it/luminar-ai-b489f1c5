

## Problem

YouTube server-side transcript scraping is unreliable due to bot detection. Instead of fighting that battle, we should take a completely different approach: **use AI to generate the transcript directly from the video's topic/title**, bypassing scraping entirely.

## Solution: New `youtube-flashcards` Edge Function

Create a single edge function that takes a YouTube URL and does everything in one shot:

1. Extract the video ID from the URL
2. Fetch the video title via the `noembed.com` oEmbed API (this always works)
3. **Skip transcript extraction entirely** — instead, send the video title to Lovable AI and ask it to generate comprehensive flashcards about that topic
4. Save the topic and flashcards to the database
5. Return the topic ID and card count

This sidesteps the entire YouTube scraping problem. The AI model (Gemini) already has knowledge about most topics covered in educational YouTube videos, so the flashcards will be high quality based on the video's subject matter.

### Alternative: AI-Powered Transcript Generation

If you want the transcript itself (not just flashcards), we can ask the AI to generate a detailed educational text on the video's topic based on its title, then use that as the source material.

### Changes

**New file: `supabase/functions/youtube-flashcards/index.ts`**
- Accepts `{ url: string, cardCount?: number }` + auth header
- Extracts video ID, fetches title via oEmbed
- Calls Lovable AI (gemini-3-flash-preview) with tool calling to generate flashcards based on the video title/topic
- Creates a topic row and inserts flashcard rows in the database
- Returns `{ topicId, title, cardsGenerated }`

**Update: `supabase/config.toml`**
- Add `[functions.youtube-flashcards]` with `verify_jwt = false`

**Update: `src/components/FlashcardCreator.tsx`** (or wherever the YouTube URL input lives)
- Call the new `youtube-flashcards` function instead of the two-step transcript→flashcards flow
- Remove the manual transcript fallback since it's no longer needed
- Show a simple loading state: "Generating flashcards from video..."

**Update: `src/pages/Learn.tsx`**
- Simplify the YouTube flow to use the single new function

### Technical Detail

The AI prompt will be:
> "The user wants to study the topic from this YouTube video titled '{title}'. Generate {n} flashcards covering the key concepts, definitions, and important details that would be covered in a video about this subject."

This uses tool calling (same pattern as `generate-document-flashcards`) to get structured `{ front, back }` output.

