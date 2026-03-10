

# Replace Lovable AI with Google Gemini API

## Overview

All 14 edge functions currently call the Lovable AI gateway (`ai.gateway.lovable.dev`) using OpenAI-compatible format. Each will be updated to call the Google Gemini API directly at `generativelanguage.googleapis.com`.

## Important Note on API Key

The AI calls happen in **backend functions** (edge functions), not client-side. Storing the key as `VITE_GEMINI_API_KEY` would expose it in the browser. Instead, it will be stored as a **backend secret** (`GEMINI_API_KEY`) accessible via `Deno.env.get("GEMINI_API_KEY")` in edge functions. This keeps your key secure. The end result is identical — just safer.

## Changes Per File (same pattern across all 14 functions)

For each edge function:

1. Replace `LOVABLE_API_KEY` → `GEMINI_API_KEY`
2. Change URL to: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
3. Convert request body from OpenAI format to Gemini format:

```text
BEFORE (OpenAI):
{
  model: "...",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  tools: [...],
  tool_choice: { ... }
}

AFTER (Gemini):
{
  systemInstruction: { parts: [{ text: systemPrompt }] },
  contents: [{ parts: [{ text: userPrompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: { ... }   // same schema from tools
  }
}
```

4. Parse response: `JSON.parse(data.candidates[0].content.parts[0].text)` instead of extracting from tool calls

## Files to Update (14 total)

| File | Notes |
|------|-------|
| `supabase/functions/generate-roadmap/index.ts` | Structured output (roadmap steps) |
| `supabase/functions/generate-flashcards/index.ts` | Structured output (flashcards) |
| `supabase/functions/generate-quiz/index.ts` | Structured output (questions) |
| `supabase/functions/generate-mindmap/index.ts` | Structured output (mind map) |
| `supabase/functions/generate-lesson/index.ts` | Structured output (lesson sections) |
| `supabase/functions/generate-suggestions/index.ts` | Structured output (suggestions) |
| `supabase/functions/generate-extra-materials/index.ts` | Structured output (materials) |
| `supabase/functions/generate-document-flashcards/index.ts` | Structured output (flashcards) |
| `supabase/functions/generate-document-quiz/index.ts` | Structured output (questions) |
| `supabase/functions/analyze-document/index.ts` | Structured output (analysis) |
| `supabase/functions/expand-mindmap-node/index.ts` | Structured output (children) |
| `supabase/functions/youtube-flashcards/index.ts` | Structured output (flashcards) |
| `supabase/functions/youtube-quiz/index.ts` | Structured output (questions) |
| `supabase/functions/youtube-transcript/index.ts` | Plain text cleanup (no schema needed) |

## Setup

- Store `GEMINI_API_KEY` as a backend secret (you'll be prompted to enter it)
- No UI changes — all existing UI stays exactly the same
- Error handling preserved: 429 rate limits, empty responses, malformed JSON

