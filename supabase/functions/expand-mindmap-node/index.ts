import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nodeLabel, parentContext, rootTopic } = await req.json();

    if (!nodeLabel || typeof nodeLabel !== "string") {
      return new Response(JSON.stringify({ error: "nodeLabel is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contextStr = parentContext ? `\nParent context: ${parentContext}` : "";

    const systemPrompt = `You are an expert mind map expander. Given a specific topic node from a mind map about "${rootTopic || nodeLabel}", generate 3-6 detailed sub-topics that break down this concept further.${contextStr}

Each sub-topic should be a meaningful expansion of the node, providing deeper insight. Keep labels concise (2-6 words) and add brief descriptions.`;

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
          { role: "user", content: `Expand this mind map node into sub-topics: "${nodeLabel}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "expand_node",
            description: "Generate sub-topics for a mind map node",
            parameters: {
              type: "object",
              properties: {
                children: {
                  type: "array",
                  description: "Sub-topics for the expanded node",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", description: "Concise sub-topic label (2-6 words)" },
                      description: { type: "string", description: "Brief description (1-2 sentences)" },
                    },
                    required: ["label"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["children"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "expand_node" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      await aiResponse.text();
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ children: result.children }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("expand-mindmap-node error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
