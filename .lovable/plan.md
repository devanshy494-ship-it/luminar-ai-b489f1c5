

# Fix Edge Function Gemini API Key & Error Handling

## Problem
All 14 edge functions use `Deno.env.get("VITE_GEMINI_API_KEY")` which may not resolve correctly. The network logs confirm 500 errors from `analyze-document` with `{"error":"AI analysis failed"}` — a generic message that hides the real cause.

## Changes (2 fixes per file, 14 files)

### Fix 1: Fallback API key lookup
In every edge function, change:
```typescript
const GEMINI_API_KEY = Deno.env.get("VITE_GEMINI_API_KEY");
```
to:
```typescript
const GEMINI_API_KEY = Deno.env.get("VITE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
```

### Fix 2: Return actual Gemini error details
Replace each error handling block (currently discards the error text and throws generic message) with:
```typescript
if (!aiResponse.ok) {
  const errorText = await aiResponse.text();
  if (aiResponse.status === 429) return new Response(
    JSON.stringify({ error: "Rate limit exceeded." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
  return new Response(
    JSON.stringify({ error: "Gemini API error: " + errorText }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Files (14 total)
| File | Key line | Error block lines |
|------|----------|-------------------|
| `generate-flashcards/index.ts` | 47 | 110-115 |
| `generate-quiz/index.ts` | 47 | 86-91 |
| `generate-mindmap/index.ts` | 39 | 116-121 |
| `generate-roadmap/index.ts` | 127 | 211-221 |
| `generate-lesson/index.ts` | 32 | 79-88 |
| `generate-suggestions/index.ts` | 46 | 96-104 |
| `generate-extra-materials/index.ts` | 72 | 142-146 |
| `generate-document-flashcards/index.ts` | 56 | 102-111 |
| `generate-document-quiz/index.ts` | 41 | 88-93 |
| `analyze-document/index.ts` | 45 | 88-97 |
| `expand-mindmap-node/index.ts` | 20 | 61-66 |
| `youtube-flashcards/index.ts` | 79 | 116-122 |
| `youtube-quiz/index.ts` | 40 | 79-84 |
| `youtube-transcript/index.ts` | 364 | 382 (graceful fallback, minor fix) |

### What is NOT touched
- `src/integrations/lovable/` — untouched
- `src/contexts/AuthContext.tsx` — untouched
- All UI pages — untouched

### After deployment
You'll also need to set the secret under the name `GEMINI_API_KEY` (it's already set as `VITE_GEMINI_API_KEY` but the fallback ensures both work). You can do this from the Lovable Cloud secrets panel, or I can help set it after the code changes.

