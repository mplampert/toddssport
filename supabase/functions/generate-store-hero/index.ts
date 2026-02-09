import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_DESCRIPTORS: Record<string, string> = {
  clean_minimal: "Clean, modern, minimal design with geometric shapes, soft gradients, and generous whitespace. Professional and sleek.",
  grunge: "Gritty, textured, raw grunge aesthetic with distressed surfaces, scratches, and urban decay. Edgy and intense.",
  neon: "Vibrant neon glow effects on dark backgrounds. Electric energy, light trails, futuristic sports aesthetic.",
  stadium: "Dramatic stadium lighting with beautiful bokeh effects, floodlights cutting through atmosphere, game-day energy.",
  retro: "Vintage sports aesthetic with warm tones, worn textures, retro typography feel, nostalgic Americana.",
  dynamic: "High-energy composition with motion blur, speed lines, dynamic angles, explosive movement frozen in time.",
  corporate: "Sleek, polished, business-professional aesthetic. Clean lines, sophisticated color palette, premium feel.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storeName, storeType, sport, mascotName, heroStyle, brandColors } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Generating hero image for store:", storeName, { storeType, sport, mascotName, heroStyle, brandColors });

    // Build style description
    const styleDesc = STYLE_DESCRIPTORS[heroStyle] || STYLE_DESCRIPTORS["clean_minimal"];

    // Build color instruction
    const colorDesc = brandColors?.length
      ? `Use these brand colors prominently as the dominant color palette: ${brandColors.join(", ")}.`
      : "";

    // Build sport/context
    const sportParts: string[] = [];
    if (sport && sport !== "general athletics") {
      sportParts.push(`The sport is ${sport}`);
      const sportTextures: Record<string, string> = {
        baseball: "diamond dirt texture, stitching patterns, chalk lines",
        basketball: "hardwood court texture, rim silhouettes, arena lighting",
        cheerleading: "confetti, pom-pom textures, spirit energy",
        football: "field turf texture, yard lines, helmet silhouettes",
        golf: "rolling greens, pin flag silhouettes, morning dew",
        hockey: "ice texture, rink boards, puck trails, cold atmosphere",
        lacrosse: "mesh patterns, turf, stick silhouettes",
        soccer: "pitch texture, net patterns, goal posts",
        softball: "infield dirt, stitching, batting cage netting",
        swimming: "water ripples, lane markers, splash effects",
        tennis: "court surface texture, net patterns, ball fuzz",
        track: "track surface lanes, starting blocks, motion streaks",
        volleyball: "net texture, sand or court, dynamic spikes",
        wrestling: "mat texture, spotlights, intensity",
      };
      if (sportTextures[sport]) {
        sportParts.push(`incorporate subtle sport-specific elements like ${sportTextures[sport]}`);
      }
    }
    const sportStr = sportParts.length > 0 ? sportParts.join(". ") + "." : "";

    // Build mascot/team context
    const mascotStr = mascotName
      ? `The team is called "${mascotName}". You may incorporate abstract shapes or energy that evoke the team identity, but do NOT include any text, words, letters, numbers, or logos.`
      : "";

    // Build context for store type
    const typeStr = storeType === "corporate"
      ? "This is for a corporate/company merchandise store."
      : "This is for a school/youth/club team spirit store.";

    const prompt = `Create a wide cinematic hero banner image for an online team store called "${storeName || "Team Store"}".

Art direction: ${styleDesc}

${typeStr}
${sportStr}
${mascotStr}
${colorDesc}

CRITICAL RULES:
- Absolutely NO text, NO words, NO letters, NO numbers, NO logos, NO brand marks anywhere in the image.
- The image must work as a background with HTML text overlaid on top.
- Create visual depth with layers so a dark gradient overlay can sit naturally on the left side.
- Wide 16:9 aspect ratio composition.
- Ultra high resolution, photorealistic or highly stylized depending on the art direction above.
- The image should feel premium, professional, and energetic.`;

    console.log("AI prompt:", prompt);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received, extracting image...");

    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No image was generated. Try again.");
    }

    // Extract base64 data and upload to Supabase Storage
    const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Unexpected image format from AI");
    }

    const imageExt = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const imageBytes = Uint8Array.from(atob(base64Match[2]), (c) => c.charCodeAt(0));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const fileName = `hero-${Date.now()}.${imageExt}`;
    const storagePath = `heroes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("store-heroes")
      .upload(storagePath, imageBytes, {
        contentType: `image/${base64Match[1]}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("store-heroes")
      .getPublicUrl(storagePath);

    console.log("Hero image uploaded:", publicUrl);

    return new Response(JSON.stringify({ heroImageUrl: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-store-hero error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
