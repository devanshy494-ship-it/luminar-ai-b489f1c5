import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { topicTitle, stepTitle, stepDescription } = await req.json();
    if (!topicTitle || !stepTitle) {
      return new Response(JSON.stringify({ error: "topicTitle and stepTitle are required" }), {
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
            content: `You are an expert educator. Generate a comprehensive, beginner-friendly lesson for a specific step in a learning roadmap. The lesson should be detailed, engaging, and include practical examples. Use clear explanations and break down complex concepts.`,
          },
          {
            role: "user",
            content: `Topic: "${topicTitle}"
Step: "${stepTitle}"
Step description: "${stepDescription || ''}"

Create a detailed lesson for this step.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_lesson",
              description: "Create a detailed lesson with sections",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string", description: "Section heading" },
                        content: { type: "string", description: "Detailed explanation in markdown format with examples" },
                      },
                      required: ["heading", "content"],
                      additionalProperties: false,
                    },
                  },
                  keyTakeaways: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key takeaways from this lesson",
                  },
                },
                required: ["sections", "keyTakeaways"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_lesson" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      await aiResponse.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const lesson = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(lesson),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-lesson error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
