/**
 * Composites a garment image with logo overlays into a single PNG image.
 * Uses HTML Canvas for client-side compositing.
 */

import { supabase } from "@/integrations/supabase/client";

const CANVAS_SIZE = 1200; // px — output mockup dimensions
const PADDING_FRACTION = 0.08; // match the 8% padding from the canvas/storefront

interface LogoOverlay {
  url: string;
  x: number; // 0-1
  y: number; // 0-1
  scale: number; // 0-1 (fraction of canvas width)
}

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  scale: number;
  fontFamily: string;
  fontWeight: string | number;
  fontSizePx: number;
  fillColor: string;
  outlineColor?: string;
  outlineThickness?: number;
  letterSpacing?: number;
  lineHeight?: number;
  alignment?: string;
}

interface CompositeMockupOptions {
  garmentImageUrl: string;
  logos: LogoOverlay[];
  textLayers?: TextOverlay[];
  productId: string;
  colorCode: string;
  view?: string;
}

/**
 * Load an image, using a proxy for cross-origin URLs.
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  // Determine if the URL is same-origin or our Supabase storage
  const isSameOrigin =
    url.startsWith("/") ||
    url.startsWith(window.location.origin) ||
    url.includes("supabase.co/storage");

  let blobUrl: string;

  if (isSameOrigin) {
    // Can load directly
    blobUrl = url;
  } else {
    // Proxy through our edge function to avoid CORS issues
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const proxyRes = await fetch(`${projectUrl}/functions/v1/proxy-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({ url }),
    });

    if (!proxyRes.ok) {
      throw new Error(`Failed to proxy image: ${proxyRes.status}`);
    }

    const blob = await proxyRes.blob();
    blobUrl = URL.createObjectURL(blob);
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = blobUrl;
  });
}

/**
 * Composite garment + logos into a single PNG blob.
 */
export async function compositeMockup(
  options: CompositeMockupOptions
): Promise<Blob> {
  const { garmentImageUrl, logos, textLayers = [] } = options;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = Math.round(CANVAS_SIZE * (4 / 3)); // 3:4 aspect ratio like PlacementCanvas
  const ctx = canvas.getContext("2d")!;

  // Fill with white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Load and draw garment image with padding
  try {
    const garmentImg = await loadImage(garmentImageUrl);
    const pad = PADDING_FRACTION * canvas.width;
    const drawW = canvas.width - pad * 2;
    const drawH = canvas.height - pad * 2;

    // Maintain aspect ratio within the padded area
    const imgAspect = garmentImg.width / garmentImg.height;
    const areaAspect = drawW / drawH;
    let finalW: number, finalH: number, offsetX: number, offsetY: number;

    if (imgAspect > areaAspect) {
      finalW = drawW;
      finalH = drawW / imgAspect;
      offsetX = pad;
      offsetY = pad + (drawH - finalH) / 2;
    } else {
      finalH = drawH;
      finalW = drawH * imgAspect;
      offsetX = pad + (drawW - finalW) / 2;
      offsetY = pad;
    }

    ctx.drawImage(garmentImg, offsetX, offsetY, finalW, finalH);
  } catch (e) {
    console.error("Failed to load garment image:", e);
    // Continue — we'll still composite logos on white background
  }

  // Draw logo overlays
  for (const logo of logos) {
    try {
      const logoImg = await loadImage(logo.url);
      const logoW = logo.scale * canvas.width;
      const logoAspect = logoImg.width / logoImg.height;
      const logoH = logoW / logoAspect;
      const logoX = logo.x * canvas.width - logoW / 2;
      const logoY = logo.y * canvas.height - logoH / 2;
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    } catch (e) {
      console.error("Failed to load logo image:", e);
    }
  }

  // Draw text overlays
  for (const text of textLayers) {
    const fontSize = Math.max(8, Math.round(text.fontSizePx * (text.scale * canvas.width / 100)));
    ctx.font = `${text.fontWeight} ${fontSize}px ${text.fontFamily}`;
    ctx.textAlign = (text.alignment as CanvasTextAlign) || "center";
    ctx.textBaseline = "middle";

    const tx = text.x * canvas.width;
    const ty = text.y * canvas.height;

    if (text.outlineThickness && text.outlineThickness > 0) {
      ctx.strokeStyle = text.outlineColor || "#000";
      ctx.lineWidth = text.outlineThickness * 2;
      ctx.strokeText(text.text, tx, ty);
    }

    ctx.fillStyle = text.fillColor;
    ctx.fillText(text.text, tx, ty);
  }

  // Export as PNG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/png",
      1.0
    );
  });
}

/**
 * Composite and upload a mockup image, returning the public URL.
 */
export async function compositeAndUploadMockup(
  options: CompositeMockupOptions
): Promise<string | null> {
  const { productId, colorCode, view = "front" } = options;

  try {
    const blob = await compositeMockup(options);

    // Upload to store-product-images bucket
    const filename = `mockups/${productId}/${colorCode}-${view}-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("store-product-images")
      .upload(filename, blob, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Mockup upload error:", uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("store-product-images")
      .getPublicUrl(uploadData.path);

    return urlData.publicUrl;
  } catch (e) {
    console.error("Failed to composite mockup:", e);
    return null;
  }
}

/**
 * Save or update the mockup URL in the variant images table.
 */
export async function saveMockupUrl(
  productId: string,
  colorCode: string,
  view: string,
  mockupUrl: string
): Promise<void> {
  // Check if a mockup record already exists
  const { data: existing } = await supabase
    .from("team_store_product_variant_images")
    .select("id")
    .eq("team_store_product_id", productId)
    .eq("color", colorCode)
    .eq("view", view)
    .eq("image_type", "mockup")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("team_store_product_variant_images")
      .update({ image_url: mockupUrl } as any)
      .eq("id", existing.id);
  } else {
    await supabase.from("team_store_product_variant_images").insert({
      team_store_product_id: productId,
      color: colorCode,
      image_url: mockupUrl,
      image_type: "mockup",
      is_primary: false,
      sort_order: 999,
      view,
    } as any);
  }
}
