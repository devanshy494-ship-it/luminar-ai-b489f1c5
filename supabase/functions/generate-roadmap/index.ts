import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── YouTube Search via Innertube (no API key needed) ──
async function searchYouTube(query: string, maxResults = 2): Promise<Array<{ name: string; url: string; type: "video" }>> {
  try {
    const response = await fetch(
      "https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20240313.05.00",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240313.05.00",
              hl: "en",
              gl: "US",
            },
          },
          query,
        }),
      }
    );

    if (!response.ok) {
      console.log(`YouTube search returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents) return [];

    const results: Array<{ name: string; url: string; type: "video" }> = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents;
      if (!items) continue;
      for (const item of items) {
        const vid = item?.videoRenderer;
        if (!vid?.videoId) continue;
        const title =
          vid.title?.runs?.[0]?.text || vid.title?.simpleText || "YouTube Video";
        results.push({
          name: title,
          url: `https://www.youtube.com/watch?v=${vid.videoId}`,
          type: "video",
        });
        if (results.length >= maxResults) break;
      }
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (e) {
    console.error("YouTube search error:", e);
    return [];
  }
}

// ── URL Verification via HEAD request ──
async function verifyUrl(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)",
      },
    });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topic, sourceContent } = await req.json();
    if (!topic || typeof topic !== "string" || topic.trim().length === 0 || topic.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid topic" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasSource = sourceContent && typeof sourceContent === "string" && sourceContent.length > 50;
    const truncatedSource = hasSource ? sourceContent.slice(0, 15000) : "";

    // ── Phase 1: AI generates roadmap structure with search queries ──
    const systemPrompt = `You are an expert learning roadmap generator. Given a topic${hasSource ? " and source material" : ""}, create a comprehensive learning roadmap with 8-12 steps from beginner to advanced.

Each step must have:
- A clear, specific title
- A detailed description (3-5 sentences)
- A realistic estimated time (e.g. "2-3 hours", "1 week")
- A videoSearchQuery: a YouTube search query to find the best tutorial video for this step (be specific, e.g. "React hooks useState useEffect tutorial for beginners")
- 2-4 suggestedResources: non-video resources (docs, websites, exercises) with REAL URLs from well-known sites (MDN, W3Schools, freeCodeCamp, GeeksforGeeks, official docs, Khan Academy, LeetCode, Exercism, etc.)

For suggestedResources:
- Use REAL URLs you are confident exist on well-known domains
- Types: "website", "docs", "exercise"
- Do NOT include video resources here — videos will be found via live YouTube search

Make the roadmap progressive — each step builds on the previous one.${hasSource ? "\n\nIMPORTANT: Use the provided source material to create a highly relevant roadmap aligned with the material." : ""}`;

    const userContent = hasSource
      ? `Create a learning roadmap for: "${topic.trim()}".\n\nSource material:\n\n${truncatedSource}`
      : `Create a learning roadmap for: "${topic.trim()}". Cover fundamentals to advanced concepts.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_roadmap",
              description: "Create a learning roadmap with search queries for live resource discovery",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    minItems: 8,
                    maxItems: 12,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        estimatedTime: { type: "string" },
                        videoSearchQuery: {
                          type: "string",
                          description: "YouTube search query to find best tutorial video for this step",
                        },
                        suggestedResources: {
                          type: "array",
                          description: "Non-video resources with real URLs",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              url: { type: "string" },
                              type: { type: "string", enum: ["website", "docs", "exercise"] },
                            },
                            required: ["name", "url", "type"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["title", "description", "estimatedTime", "videoSearchQuery"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_roadmap" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const { steps: rawSteps } = JSON.parse(toolCall.function.arguments);
    console.log(`AI generated ${rawSteps.length} steps, now searching for real resources...`);

    // ── Phase 2: Live YouTube search + URL verification (all in parallel) ──
    const enrichedSteps = await Promise.all(
      rawSteps.map(async (step: any, i: number) => {
        // Run YouTube search and URL verification concurrently for this step
        const [youtubeResults, verifiedResources] = await Promise.all([
          // Search YouTube for real videos
          searchYouTube(step.videoSearchQuery, 2),

          // Verify suggested non-video URLs in parallel
          (async () => {
            const suggested = step.suggestedResources || [];
            const verifications = await Promise.allSettled(
              suggested.map(async (r: any) => {
                const valid = await verifyUrl(r.url);
                return valid ? r : null;
              })
            );
            return verifications
              .filter((v): v is PromiseFulfilledResult<any> => v.status === "fulfilled" && v.value !== null)
              .map((v) => v.value);
          })(),
        ]);

        // Combine: verified non-video resources + real YouTube videos
        const resources = [
          ...youtubeResults,
          ...verifiedResources,
        ];

        console.log(
          `Step ${i + 1} "${step.title}": ${youtubeResults.length} YouTube videos, ${verifiedResources.length}/${(step.suggestedResources || []).length} URLs verified`
        );

        return {
          title: step.title,
          description: step.description,
          estimatedTime: step.estimatedTime,
          resources,
          completed: false,
          order: i,
        };
      })
    );

    // ── Save to database ──
    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .insert({ title: topic.trim(), user_id: user.id })
      .select("id")
      .single();

    if (topicError) throw topicError;

    const { data: roadmapData, error: roadmapError } = await supabase
      .from("roadmaps")
      .insert({
        topic_id: topicData.id,
        user_id: user.id,
        steps: enrichedSteps,
        progress: 0,
      })
      .select("id")
      .single();

    if (roadmapError) throw roadmapError;

    return new Response(
      JSON.stringify({ topicId: topicData.id, roadmapId: roadmapData.id, steps: enrichedSteps }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-roadmap error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
