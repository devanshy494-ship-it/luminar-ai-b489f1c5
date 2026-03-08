import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { topic } = await req.json();
    if (!topic || typeof topic !== "string" || topic.trim().length === 0 || topic.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid topic" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are an expert learning roadmap generator. Given a topic, create a comprehensive, detailed learning roadmap with 8-12 steps that covers the topic from beginner to advanced. 

Each step should have:
- A clear, specific title (not vague like "Introduction" — be specific about what is covered)
- A detailed description (3-5 sentences) explaining what the learner will study, key concepts, and why it matters
- A realistic estimated time (e.g. "2-3 hours", "1 week")
- 2-4 specific learning resources (e.g. "Official documentation", "Practice exercises", "Video tutorials on X")

Make the roadmap progressive — each step should build on the previous one. Include both theoretical knowledge and practical application steps. For complex topics, break them into granular sub-topics rather than broad categories.`,
          },
          {
            role: "user",
            content: `Create a detailed, comprehensive learning roadmap for: "${topic.trim()}". Make sure the steps are specific, actionable, and cover the topic thoroughly from fundamentals to advanced concepts.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_roadmap",
              description: "Create a comprehensive, detailed learning roadmap with 8-12 steps",
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
                        resources: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["title", "description", "estimatedTime"],
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const { steps } = JSON.parse(toolCall.function.arguments);

    // Save topic
    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .insert({ title: topic.trim(), user_id: user.id })
      .select("id")
      .single();

    if (topicError) throw topicError;

    // Save roadmap
    const { data: roadmapData, error: roadmapError } = await supabase
      .from("roadmaps")
      .insert({
        topic_id: topicData.id,
        user_id: user.id,
        steps: steps.map((s: any, i: number) => ({ ...s, completed: false, order: i })),
        progress: 0,
      })
      .select("id")
      .single();

    if (roadmapError) throw roadmapError;

    return new Response(
      JSON.stringify({ topicId: topicData.id, roadmapId: roadmapData.id, steps }),
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
