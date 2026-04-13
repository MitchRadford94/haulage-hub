import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { addresses, drivers, depot } = await req.json();

    if (!addresses?.length || !drivers?.length) {
      return new Response(JSON.stringify({ error: "addresses and drivers are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const driverList = drivers.map((d: any, i: number) => `Driver ${i}: ${d.name} (Vehicle: ${d.vehicle})`).join("\n");
    const addressList = addresses.map((a: string, i: number) => `${i}: ${a}`).join("\n");

    const systemPrompt = `You are an expert logistics route optimizer for UK HGV deliveries. Given a list of delivery addresses and available drivers, assign each address to a driver and order each driver's stops to minimize total driving distance. Consider geographic clustering — group nearby stops together for the same driver. ${depot ? `All drivers start and end at the depot: ${depot}` : ""}`;

    const userPrompt = `Available drivers:\n${driverList}\n\nDelivery addresses:\n${addressList}\n\nAssign all addresses to drivers and order each driver's stops optimally. Every address must be assigned to exactly one driver. Distribute work roughly evenly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assign_routes",
              description: "Assign delivery stops to drivers in optimized order",
              parameters: {
                type: "object",
                properties: {
                  assignments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        driverIndex: { type: "number", description: "Index of the driver (0-based)" },
                        stops: {
                          type: "array",
                          items: { type: "string" },
                          description: "Ordered list of addresses for this driver",
                        },
                      },
                      required: ["driverIndex", "stops"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["assignments"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assign_routes" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI optimization failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assignments = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(assignments), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-routes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
