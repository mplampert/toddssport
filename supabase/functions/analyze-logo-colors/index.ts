import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch image: ${imgRes.statusText}`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Simple color extraction: sample pixels from the image
    // For PNG/JPEG we'll use a basic approach - decode via canvas-like sampling
    // Since Deno doesn't have Canvas, we'll use a statistical approach on raw bytes
    
    const colors = extractColorsFromBytes(bytes);

    return new Response(JSON.stringify({ colors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractColorsFromBytes(bytes: Uint8Array): string[] {
  // Check for PNG signature
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  
  // For simplicity, we'll scan through the byte array looking for RGB triplets
  // This is a heuristic approach that works on uncompressed image data sections
  
  const colorCounts = new Map<string, number>();
  const step = Math.max(3, Math.floor(bytes.length / 10000)); // Sample ~10k pixels
  
  // Skip headers (first 100 bytes for PNG, 2 bytes for JPEG)
  const startOffset = isPng ? 100 : 20;
  
  for (let i = startOffset; i < bytes.length - 2; i += step) {
    const r = bytes[i];
    const g = bytes[i + 1];
    const b = bytes[i + 2];
    
    // Skip near-white, near-black, and very low-saturation colors
    if (r > 240 && g > 240 && b > 240) continue;
    if (r < 15 && g < 15 && b < 15) continue;
    
    // Quantize to reduce color space (round to nearest 16)
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    
    const key = `${qr},${qg},${qb}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }
  
  // Sort by frequency and get top colors
  const sorted = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  // Deduplicate similar colors
  const result: string[] = [];
  const MIN_DISTANCE = 80;
  
  for (const [key] of sorted) {
    const [r, g, b] = key.split(",").map(Number);
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
    
    // Check distance from already-selected colors
    const tooClose = result.some((existing) => {
      const er = parseInt(existing.slice(1, 3), 16);
      const eg = parseInt(existing.slice(3, 5), 16);
      const eb = parseInt(existing.slice(5, 7), 16);
      return Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2) < MIN_DISTANCE;
    });
    
    if (!tooClose) {
      result.push(hex);
      if (result.length >= 4) break;
    }
  }
  
  return result;
}
