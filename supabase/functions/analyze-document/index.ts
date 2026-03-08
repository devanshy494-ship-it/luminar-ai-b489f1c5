import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, url, scope } = await req.json();

    let textContent = content || "";

    if (url && !textContent) {
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; LuminarBot/1.0)" },
        });
        const html = await response.text();
        textContent = html
          .replace(new RegExp("<script[^>]*>[\\s\\S]*?<\\/script>", "gi"), "")
          .replace(new RegExp("<style[^>]*>[\\s\\S]*?<\\/style>", "gi"), "")
          .replace(new RegExp("<[^>]+>", "g"), " ")
          .replace(new RegExp("\\s+", "g"), " ")
          .trim();
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch URL content" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!textContent || textContent.length < 50) {
      return new Response(
        JSON.stringify({ error: "Content is too short to analyze. Please provide more text." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const truncated = textContent.length > 15000 ? textContent.slice(0, 15000) + "\n[...content truncated...]" : textContent;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const scopeInstruction = scope
      ? `\n\nIMPORTANT: The user has specified a focus/scope for the flashcards: "${scope}". Only analyze and identify topics relevant to this scope. Ignore content outside this scope.`
      : "";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a content analyzer. Analyze the provided text and identify the main topics and subtopics that could be turned into flashcards. For each topic, estimate how many meaningful flashcards can be created. Be thorough but realistic.${scopeInstruction}`,
          },
          {
            role: "user",
            content: `Analyze this content and identify topics/subtopics for flashcard generation:\n\n${truncated}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_content",
              description: "Analyze content and return topics with flashcard recommendations",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "A concise title for this content/document" },
                  topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Topic name" },
                        subtopics: { type: "array", items: { type: "string" }, description: "List of subtopics under this topic" },
                        estimatedCards: { type: "number", description: "Estimated number of flashcards for this topic" },
                      },
                      required: ["name", "subtopics", "estimatedCards"],
                      additionalProperties: false,
                    },
                  },
                  totalRecommendedCards: { type: "number", description: "Total recommended number of flashcards across all topics" },
                  summary: { type: "string", description: "Brief 1-2 sentence summary of the content" },
                },
                required: ["title", "topics", "totalRecommendedCards", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_content" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      await aiResponse.text();
      if (status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ analysis, contentLength: textContent.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
