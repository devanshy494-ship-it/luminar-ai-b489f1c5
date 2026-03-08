import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, sourceContent, strictMode } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasSource = sourceContent && typeof sourceContent === "string" && sourceContent.length > 50;
    const truncatedSource = hasSource ? sourceContent.slice(0, 15000) : "";
    const isStrict = hasSource && strictMode === true;

    const systemPrompt = `You are an expert mind map generator. Given a topic${hasSource ? " and source material" : ""}, create a detailed, hierarchical mind map structure.

The mind map should have:
- A central topic node
- 4-8 main branches (level 1)
- Each main branch should have 2-5 sub-branches (level 2)
- Important sub-branches can have 1-3 leaf nodes (level 3)

Make it comprehensive and well-organized. Each node should have a concise label and optionally a brief description.${hasSource && isStrict ? "\n\nCRITICAL: You MUST use ONLY information from the provided source material. Do NOT add any external knowledge. Every node must be directly derived from the source content." : hasSource ? "\n\nIMPORTANT: Base the mind map primarily on the provided source material. Extract the key concepts, structure, and relationships from the content. You may supplement with relevant context where the source has gaps." : ""}`;

    const userContent = hasSource
      ? `Create a detailed mind map for: "${topic.trim()}".\n\nSource material:\n\n${truncatedSource}`
      : `Create a detailed mind map for: "${topic.trim()}". Cover all major aspects comprehensively.`;

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
        tools: [{
          type: "function",
          function: {
            name: "create_mindmap",
            description: "Create a hierarchical mind map structure",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The central topic title" },
                branches: {
                  type: "array",
                  description: "Main branches of the mind map",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", description: "Branch label" },
                      description: { type: "string", description: "Brief description (1-2 sentences)" },
                      color: { type: "string", description: "A color name for this branch: blue, purple, green, orange, red, teal, pink, indigo" },
                      children: {
                        type: "array",
                        description: "Sub-branches",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string" },
                            description: { type: "string" },
                            children: {
                              type: "array",
                              description: "Leaf nodes",
                              items: {
                                type: "object",
                                properties: {
                                  label: { type: "string" },
                                  description: { type: "string" },
                                },
                                required: ["label"],
                                additionalProperties: false,
                              },
                            },
                          },
                          required: ["label"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["label", "color"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "branches"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_mindmap" } },
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

    const mindmap = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ mindmap }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-mindmap error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
