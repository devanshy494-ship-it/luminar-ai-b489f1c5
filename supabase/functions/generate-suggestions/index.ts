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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's past data in parallel
    const [topicsRes, mindmapsRes, flashcardGroupsRes, quizResultsRes] = await Promise.all([
      supabase.from("topics").select("title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("mindmaps").select("topic, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("flashcard_groups").select("name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("quiz_results").select("topic_id, completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(20),
    ]);

    const pastTopics = (topicsRes.data || []).map(t => t.title);
    const pastMindmaps = (mindmapsRes.data || []).map(m => m.topic);
    const pastFlashcards = (flashcardGroupsRes.data || []).map(f => f.name);

    const allPastItems = [...new Set([...pastTopics, ...pastMindmaps, ...pastFlashcards])];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userHistory = allPastItems.length > 0
      ? `User's past learning topics: ${allPastItems.slice(0, 15).join(", ")}`
      : "User has no past learning history yet.";

    const systemPrompt = `You are a learning recommendation engine. Given a user's past learning history, generate exactly 6 topic suggestions for their next learning roadmap.

Rules:
- Suggestion 1-2: Directly based on the user's past topics. These should deepen or extend what they've already studied. If they studied "React", suggest "React Performance Optimization" or "React Testing with Jest".
- Suggestion 3-4: Completely random interesting topics unrelated to their history. These should be diverse and engaging (science, history, art, music, cooking, philosophy, etc).
- Suggestion 5-6: Tangentially related topics that aren't closely related but would be useful for the user. If they study programming, suggest "Technical Writing" or "Public Speaking for Engineers". Think of complementary skills.

Each suggestion should be 2-5 words, specific enough to generate a roadmap from.
Do NOT repeat any topic the user has already studied.
If the user has no history, make all 6 suggestions diverse and interesting across different fields.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userHistory },
        ],
        tools: [{
          type: "function",
          function: {
            name: "provide_suggestions",
            description: "Return 6 topic suggestions categorized by type",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  minItems: 6,
                  maxItems: 6,
                  items: {
                    type: "object",
                    properties: {
                      topic: { type: "string", description: "The topic suggestion, 2-5 words" },
                      category: { type: "string", enum: ["based_on_history", "random", "tangential"] },
                    },
                    required: ["topic", "category"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "provide_suggestions" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const { suggestions } = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-suggestions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
