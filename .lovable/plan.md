

## Problem

YouTube actively blocks server-side transcript scraping. The current edge function tries to parse `ytInitialPlayerResponse` from YouTube's HTML, but YouTube returns different/reduced HTML to server-side requests (bot detection), so the regex never matches and it falls through to "NO_CAPTIONS."

This has failed across 5+ different approaches because they all rely on scraping YouTube's watch page from a server, which YouTube increasingly blocks.

## Solution

**Abandon server-side YouTube scraping entirely.** Instead, use a two-part approach:

1. **Extract the transcript client-side** (in the browser), where YouTube serves the full page with all player data, then send the extracted text to the backend.

2. **Keep the edge function as a thin fallback** that tries the Innertube API with a more reliable method, but the primary path is client-side extraction.

### Implementation Details

**Client-side extraction (primary path) in `src/pages/Learn.tsx` and `src/components/FlashcardCreator.tsx`:**
- When user pastes a YouTube URL, fetch the watch page in an iframe or use the `oEmbed` API to get the video title
- Use the YouTube IFrame Player API or directly fetch the transcript via the browser (same-origin is not needed since YouTube serves CORS for some endpoints)
- Actually, the most reliable client-side approach: call YouTube's `/api/timedtext` endpoint directly from the browser with the video ID, which works because browsers have proper cookies/sessions

**Revised approach -- use a proven third-party transcript service:**
- The `https://yt.lemnoslife.com/` free API or similar public YouTube transcript API
- OR simply switch to using the Innertube `/get_transcript` endpoint with proper parameters

**Simplest reliable fix -- Innertube `get_transcript` endpoint:**
- Rewrite the edge function to use YouTube's internal `get_transcript` Innertube endpoint with a proper `INNERTUBE_CONTEXT` for web client
- The key fix: use the correct request body format with `params` that encodes the video ID properly
- This endpoint is more reliable than scraping HTML because it's a direct API call

### Changes

**File: `supabase/functions/youtube-transcript/index.ts`**
- Replace `fetchTranscript` with a new implementation that:
  1. First tries the Innertube `get_transcript` endpoint (POST to `https://www.youtube.com/youtubei/v1/get_transcript`) with proper web client context and encoded video params
  2. Falls back to fetching the watch page with a cookie consent bypass (`CONSENT=YES+` cookie) to get past EU consent walls that break scraping
  3. If both fail, returns a clear error suggesting the user paste the transcript manually

- Add a `CONSENT=YES+cb` cookie header to the watch page fetch to bypass consent screens
- Use a more permissive regex for `ytInitialPlayerResponse` that handles YouTube's current output format: `/var ytInitialPlayerResponse = ({.*?});/s` or scanning for `"captionTracks"` directly in the HTML
- Add the Innertube `get_transcript` method as the **primary** approach (it doesn't require scraping HTML at all)

**File: `src/components/FlashcardCreator.tsx` and `src/pages/Learn.tsx`**
- Add a fallback UI: if the YouTube transcript extraction fails, show a text area prompting the user to manually paste the transcript (with a link to a guide on how to copy YouTube captions)
- This ensures the feature always works even if YouTube blocks all server-side methods

### Technical Detail: Innertube `get_transcript` Request

The correct request format:
```
POST https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8
Body: {
  "context": { "client": { "clientName": "WEB", "clientVersion": "2.2024..." } },
  "params": "<base64-encoded protobuf with video ID>"
}
```

The `params` value encodes the video ID in a specific protobuf format. The encoding is: `btoa("\n\x0b" + videoId)` for the inner part, then wrapped in another protobuf layer.

