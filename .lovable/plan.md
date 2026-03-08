

## Plan: Integrate Real Web Search into Roadmap Resource Generation

### Problem
Currently, the AI generates resource URLs from memory, which means many links may be fabricated or broken. The user wants verified, real URLs — similar to how `youtube-transcript` scrapes YouTube directly.

### Approach: Two-Phase Generation with Live Search Verification

**Phase 1 — AI generates roadmap structure** (keep existing)
The AI still generates step titles, descriptions, estimated times, and *search queries* for resources (instead of guessing URLs).

**Phase 2 — Live web search + YouTube search** (new)
After getting the roadmap structure, the edge function:
1. **Searches YouTube** via the Innertube search API (same pattern as `youtube-transcript` — no API key needed) to find real video lectures for each step
2. **Verifies non-YouTube URLs** with HEAD requests, dropping any that return 404/error
3. **Fills in missing resources** with search-discovered ones

### Changes

| File | What |
|---|---|
| `supabase/functions/generate-roadmap/index.ts` | Major rewrite: (1) Change AI tool schema so it outputs `searchQueries` per step instead of full URLs. (2) Add `searchYouTube(query)` function using Innertube search endpoint (reusing the same YouTube scraping approach from `youtube-transcript`). (3) Add `verifyUrl(url)` function that does HEAD requests. (4) After AI generates steps, loop through each step: search YouTube for 1-2 real videos, verify AI-suggested doc/website URLs, build final verified resource list. |
| No UI changes needed | `src/pages/Roadmap.tsx` already renders structured `Resource` objects with icons — fully compatible. |

### Technical Detail

**YouTube Search via Innertube** (no API key):
```text
POST https://www.youtube.com/youtubei/v1/search
Body: { context: { client: { clientName: "WEB", ... } }, query: "learn React hooks tutorial" }
→ Extract video IDs + titles from response → build real youtube.com/watch?v=... URLs
```

**URL Verification:**
```text
For each AI-suggested URL → HEAD request → if status 200-399, keep it → else drop it
Timeout: 3s per URL to avoid slowing down generation
```

**Parallel execution:** All YouTube searches + URL verifications run in parallel via `Promise.allSettled` to keep total time reasonable (adds ~3-5s to generation).

### Schema Change in AI Prompt

The AI will now output resources with `suggestedUrl` (best guess) AND `searchQuery` (for live lookup). The edge function uses the search query to find real URLs, falls back to verified suggested URLs.

