import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const cleaned = url.trim();
  try {
    const parsed = new URL(cleaned);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.has("v")) {
      const v = parsed.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
  } catch {}
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\n/g, " ")
    .trim();
}

function parseTranscriptXml(xml: string): string {
  const textSegments: string[] = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = decodeHtmlEntities(match[1]);
    if (text) textSegments.push(text);
  }
  return textSegments.join(" ");
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Step 1: Fetch watch page to extract serialized player response and config
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageResponse = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (!pageResponse.ok) {
    throw new Error("Failed to fetch YouTube page");
  }

  const html = await pageResponse.text();

  // Extract API key and visitor data from the page
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
  const apiKey = apiKeyMatch?.[1] || "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
  
  const visitorDataMatch = html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/);
  const visitorData = visitorDataMatch?.[1] || "";

  // Strategy 1: Try to extract captions directly from the page's initial player response
  const transcript = await tryExtractFromPage(html, videoId);
  if (transcript) return transcript;

  // Strategy 2: Use the get_transcript innertube endpoint (WEB client)
  const transcript2 = await tryGetTranscriptEndpoint(videoId, apiKey, visitorData, html);
  if (transcript2) return transcript2;

  // Strategy 3: Use WEB client player endpoint
  const transcript3 = await tryWebPlayerEndpoint(videoId, apiKey, visitorData);
  if (transcript3) return transcript3;

  throw new Error("NO_CAPTIONS");
}

async function tryExtractFromPage(html: string, _videoId: string): Promise<string | null> {
  try {
    // Look for captionTracks in the serialized player response
    const captionTracksMatch = html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/);
    if (!captionTracksMatch) return null;

    // Fix escaped characters
    const tracksJson = captionTracksMatch[1]
      .replace(/\\u0026/g, "&")
      .replace(/\\"/g, '"');

    let tracks: any[];
    try {
      tracks = JSON.parse(tracksJson);
    } catch {
      return null;
    }

    if (!tracks || tracks.length === 0) return null;

    // Prefer English
    const enTrack = tracks.find((t: any) =>
      t.languageCode === "en" || t.languageCode?.startsWith("en")
    );
    const track = enTrack || tracks[0];
    let captionUrl = track.baseUrl;
    if (!captionUrl) return null;

    // Unescape the URL
    captionUrl = captionUrl.replace(/\\u0026/g, "&").replace(/\\"/g, '"');

    console.log(`Strategy 1: Found caption track from page: ${track.languageCode}`);

    const captionResponse = await fetch(captionUrl);
    if (!captionResponse.ok) return null;

    const xml = await captionResponse.text();
    const result = parseTranscriptXml(xml);
    return result.length > 50 ? result : null;
  } catch (e) {
    console.error("Strategy 1 failed:", e);
    return null;
  }
}

async function tryGetTranscriptEndpoint(
  videoId: string,
  apiKey: string,
  visitorData: string,
  html: string
): Promise<string | null> {
  try {
    // We need a serializedShareEntity or params from the page
    // Extract the engagement panel params for the transcript
    const paramsMatch = html.match(/"serializedShareEntity"\s*:\s*"([^"]+)"/);
    
    // Try to find transcript params from engagementPanels
    const transcriptParamsMatch = html.match(/"showEngagementPanelEndpoint"\s*:\s*\{[^}]*"panelIdentifier"\s*:\s*"engagement-panel-searchable-transcript"[^}]*\}/);
    
    // Build the get_transcript request
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    if (visitorData) {
      headers["X-Goog-Visitor-Id"] = visitorData;
    }

    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}&prettyPrint=false`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240313.05.00",
              hl: "en",
              gl: "US",
            },
          },
          params: btoa(`\n\x0b${videoId}`),
        }),
      }
    );

    if (!response.ok) {
      console.error("get_transcript failed:", response.status);
      return null;
    }

    const data = await response.json();
    
    // Parse the transcript response
    const transcriptRenderer = data?.actions?.[0]?.updateEngagementPanelAction?.content
      ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
      ?.transcriptSegmentListRenderer?.initialSegments;
    
    if (!transcriptRenderer) {
      // Try alternative path
      const segments = data?.actions?.[0]?.updateEngagementPanelAction?.content
        ?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups;
      
      if (segments && segments.length > 0) {
        const text = segments
          .map((g: any) => g.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer?.cue?.simpleText || "")
          .filter((t: string) => t.length > 0)
          .join(" ");
        if (text.length > 50) {
          console.log("Strategy 2: Got transcript from get_transcript (cueGroups)");
          return text;
        }
      }
      
      console.error("get_transcript: unexpected response structure");
      return null;
    }

    const text = transcriptRenderer
      .map((seg: any) => {
        const snippet = seg.transcriptSegmentRenderer?.snippet?.runs;
        if (snippet) return snippet.map((r: any) => r.text).join("");
        return "";
      })
      .filter((t: string) => t.length > 0)
      .join(" ");

    if (text.length > 50) {
      console.log("Strategy 2: Got transcript from get_transcript endpoint");
      return text;
    }
    return null;
  } catch (e) {
    console.error("Strategy 2 failed:", e);
    return null;
  }
}

async function tryWebPlayerEndpoint(
  videoId: string,
  apiKey: string,
  visitorData: string
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Origin": "https://www.youtube.com",
      "Referer": "https://www.youtube.com/",
    };
    if (visitorData) {
      headers["X-Goog-Visitor-Id"] = visitorData;
    }

    const playerResponse = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240313.05.00",
              hl: "en",
              gl: "US",
            },
          },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      }
    );

    if (!playerResponse.ok) {
      console.error("WEB player API failed:", playerResponse.status);
      return null;
    }

    const playerData = await playerResponse.json();
    const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) return null;

    const enTrack = tracks.find((t: any) =>
      t.languageCode === "en" || t.languageCode?.startsWith("en")
    );
    const track = enTrack || tracks[0];
    const captionUrl = track.baseUrl;
    if (!captionUrl) return null;

    console.log(`Strategy 3: Found caption via WEB player: ${track.languageCode}`);

    const captionResponse = await fetch(captionUrl);
    if (!captionResponse.ok) return null;

    const xml = await captionResponse.text();
    const result = parseTranscriptXml(xml);
    return result.length > 50 ? result : null;
  } catch (e) {
    console.error("Strategy 3 failed:", e);
    return null;
  }
}

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    return data.title || `YouTube Video ${videoId}`;
  } catch {
    return `YouTube Video ${videoId}`;
  }
}

async function cleanupTranscript(rawTranscript: string, videoTitle: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return rawTranscript;

  const truncated = rawTranscript.length > 12000 ? rawTranscript.slice(0, 12000) : rawTranscript;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a transcript editor. Fix grammar, punctuation, capitalization, and obvious speech-to-text errors in this YouTube video transcript. The video is titled "${videoTitle}". Keep ALL the original meaning and content — only fix errors. Add proper paragraph breaks where topics change. Do NOT summarize, skip, or add content. Return ONLY the cleaned transcript text.`,
          },
          { role: "user", content: truncated },
        ],
      }),
    });

    if (!response.ok) return rawTranscript;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || rawTranscript;
  } catch {
    return rawTranscript;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL. Please paste a valid YouTube video link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing YouTube video: ${videoId}`);

    const [rawTranscript, title] = await Promise.all([
      fetchTranscript(videoId),
      fetchVideoTitle(videoId),
    ]);

    const transcript = await cleanupTranscript(rawTranscript, title);

    return new Response(
      JSON.stringify({ transcript, title, videoId, charCount: transcript.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("youtube-transcript error:", e);
    const message = e instanceof Error && e.message === "NO_CAPTIONS"
      ? "This video doesn't have captions/subtitles available. Try a different video."
      : e instanceof Error ? e.message : "Failed to extract transcript";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
