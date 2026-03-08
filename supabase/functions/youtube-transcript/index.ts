import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Fetch the YouTube watch page to extract caption track info
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch YouTube page");
  }

  const html = await response.text();

  // Extract captions JSON from the page source
  const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s);
  if (!captionMatch) {
    // Try alternative pattern
    const altMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
    if (!altMatch) {
      throw new Error("NO_CAPTIONS");
    }
    const tracks = JSON.parse(altMatch[1]);
    if (!tracks || tracks.length === 0) throw new Error("NO_CAPTIONS");
    
    // Prefer English, fall back to first available
    const englishTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en"));
    const track = englishTrack || tracks[0];
    return await fetchCaptionXml(track.baseUrl);
  }

  // Parse the captions object
  try {
    const captionsJson = JSON.parse(captionMatch[1]);
    const tracks = captionsJson?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) throw new Error("NO_CAPTIONS");

    // Prefer English auto-generated or manual
    const englishTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en"));
    const track = englishTrack || tracks[0];
    return await fetchCaptionXml(track.baseUrl);
  } catch (e) {
    if (e instanceof Error && e.message === "NO_CAPTIONS") throw e;
    throw new Error("Failed to parse caption data");
  }
}

async function fetchCaptionXml(captionUrl: string): Promise<string> {
  const res = await fetch(captionUrl);
  if (!res.ok) throw new Error("Failed to fetch caption track");
  const xml = await res.text();

  // Parse XML caption entries and extract text
  const textSegments: string[] = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();
    if (text) textSegments.push(text);
  }

  if (textSegments.length === 0) throw new Error("NO_CAPTIONS");
  return textSegments.join(" ");
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
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch transcript and title in parallel
    const [transcript, title] = await Promise.all([
      fetchTranscript(videoId),
      fetchVideoTitle(videoId),
    ]);

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
