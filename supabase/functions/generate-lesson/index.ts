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

    const { topicTitle, stepTitle, stepDescription, minWords, maxWords } = await req.json();
    if (!topicTitle || !stepTitle) {
      return new Response(JSON.stringify({ error: "topicTitle and stepTitle are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wordLimitInstruction = minWords || maxWords
      ? `\n\nIMPORTANT WORD LIMIT: The total lesson content (all sections combined) must be ${minWords ? `at least ${minWords} words` : ''}${minWords && maxWords ? ' and ' : ''}${maxWords ? `no more than ${maxWords} words` : ''}. Adjust the depth and number of examples accordingly to meet this requirement.`
      : '';

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert educator. Generate a comprehensive, beginner-friendly lesson for a specific step in a learning roadmap. The lesson should be detailed, engaging, and include practical examples. Use clear explanations and break down complex concepts.${wordLimitInstruction}`;

    const userPrompt = `Topic: "${topicTitle}"
Step: "${stepTitle}"
Step description: "${stepDescription || ''}"

Create a detailed lesson for this step.`;

    const lessonSchema = {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string" },
            },
            required: ["heading", "content"],
            additionalProperties: false,
          },
        },
        keyTakeaways: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["sections", "keyTakeaways"],
      additionalProperties: false,
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_lesson",
              description: "Emit the generated lesson.",
              parameters: lessonSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_lesson" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error: " + errorText }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;
    if (!rawArgs) throw new Error("No response from AI");

    const lesson = JSON.parse(rawArgs);

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
