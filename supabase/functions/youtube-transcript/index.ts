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

function parseJson3Transcript(json: any): string {
  try {
    const events = json?.events;
    if (!events || !Array.isArray(events)) return "";
    const segments: string[] = [];
    for (const event of events) {
      if (event.segs) {
        for (const seg of event.segs) {
          if (seg.utf8 && seg.utf8.trim() !== "\n") {
            segments.push(seg.utf8.trim());
          }
        }
      }
    }
    return segments.join(" ");
  } catch {
    return "";
  }
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Fetch the watch page
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageResponse = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!pageResponse.ok) {
    throw new Error("Failed to fetch YouTube page");
  }

  const html = await pageResponse.text();

  // Extract ytInitialPlayerResponse from the page
  const playerResponseMatch = html.match(
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/
  );

  if (!playerResponseMatch) {
    console.error("Could not find ytInitialPlayerResponse in page");
    throw new Error("NO_CAPTIONS");
  }

  let playerData: any;
  try {
    playerData = JSON.parse(playerResponseMatch[1]);
  } catch (e) {
    console.error("Failed to parse ytInitialPlayerResponse:", e);
    throw new Error("NO_CAPTIONS");
  }

  const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    console.error("No caption tracks in ytInitialPlayerResponse");
    throw new Error("NO_CAPTIONS");
  }

  // Prefer English, fallback to first available
  const enTrack = tracks.find((t: any) =>
    t.languageCode === "en" || t.languageCode?.startsWith("en")
  );
  const track = enTrack || tracks[0];
  let captionUrl = track.baseUrl;

  if (!captionUrl) {
    console.error("No baseUrl in caption track");
    throw new Error("NO_CAPTIONS");
  }

  console.log(`Found caption track: ${track.languageCode} (${track.name?.simpleText || "unknown"})`);

  // Try json3 format first (more reliable parsing), fallback to XML
  try {
    const json3Url = captionUrl + "&fmt=json3";
    const json3Response = await fetch(json3Url);
    if (json3Response.ok) {
      const json3Data = await json3Response.json();
      const text = parseJson3Transcript(json3Data);
      if (text.length > 50) {
        console.log(`Got transcript via json3 format (${text.length} chars)`);
        return text;
      }
    }
  } catch (e) {
    console.error("json3 fetch failed, trying XML:", e);
  }

  // Fallback to XML format
  const captionResponse = await fetch(captionUrl);
  if (!captionResponse.ok) {
    console.error("Caption XML fetch failed:", captionResponse.status);
    throw new Error("Failed to fetch caption data");
  }

  const xml = await captionResponse.text();
  const result = parseTranscriptXml(xml);

  if (result.length < 50) {
    console.error("Transcript too short:", result.length);
    throw new Error("NO_CAPTIONS");
  }

  console.log(`Got transcript via XML format (${result.length} chars)`);
  return result;
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
