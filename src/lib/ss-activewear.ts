import { supabase } from "@/integrations/supabase/client";

export interface SSCategory {
  categoryID: number;
  name: string;
  parentID?: number;
  image?: string;
}

export interface SSStyle {
  styleID: number;
  styleName: string;
  brandName: string;
  title: string;
  description?: string;
  baseCategory?: string;
  styleImage?: string;
  brandImage?: string;
  partNumber?: string;
  catalogPage?: number;
}

export interface SSProduct {
  productId: number;
  styleID: number;
  brandName?: string;
  sku?: string;
  colorName: string;
  colorCode: string;
  colorGroup?: string;
  colorFrontImage?: string;
  colorSideImage?: string;
  colorBackImage?: string;
  colorDirectSideImage?: string;
  colorSwatchImage?: string;
  color1?: string;
  color2?: string;
  sizeName: string;
  sizeOrder?: string;
  caseQty?: number;
  unitWeight?: number;
  mapPrice?: number;
  piecePrice?: number;
  dozenPrice?: number;
  casePrice?: number;
  salePrice?: number;
  qty?: number;
  warehouses?: { warehouseAbbr: string; qty: number }[];
}

async function callSSApi<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ss-activewear", {
    body: { endpoint, params },
  });

  if (error) {
    console.error("SS API invoke error:", error);
    // If the edge function returned a 404, treat as empty result
    if (error.message?.includes("404")) {
      return [] as unknown as T;
    }
    throw new Error(error.message || "Failed to call S&S API");
  }

  if (data?.error) {
    // Handle 404 from S&S API (discontinued/not found items)
    if (data.error.includes("404")) {
      return [] as unknown as T;
    }
    throw new Error(data.error);
  }

  return data as T;
}

export async function getCategories(): Promise<SSCategory[]> {
  return callSSApi<SSCategory[]>("categories");
}

export async function getStyles(params?: {
  style?: string;
  brand?: string;
  category?: string;
}): Promise<SSStyle[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.style) queryParams.style = params.style;
  if (params?.brand) queryParams.brand = params.brand;
  if (params?.category) queryParams.category = params.category;
  return callSSApi<SSStyle[]>("styles", queryParams);
}

export async function getProducts(params?: {
  style?: string | number;
  brand?: string;
  category?: string;
}): Promise<SSProduct[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.style) queryParams.style = String(params.style);
  if (params?.brand) queryParams.brand = params.brand;
  if (params?.category) queryParams.category = params.category;
  return callSSApi<SSProduct[]>("products", queryParams);
}

export async function getInventory(styleId: number): Promise<SSProduct[]> {
  return callSSApi<SSProduct[]>(`products/${styleId}`);
}

export function formatSSPrice(price?: number | null): string {
  if (!price) return "—";
  return `$${price.toFixed(2)}`;
}

export function getStockStatus(qty?: number): { label: string; color: string } {
  if (qty === undefined || qty === null) return { label: "Check availability", color: "text-muted-foreground" };
  if (qty === 0) return { label: "Out of stock", color: "text-destructive" };
  if (qty < 12) return { label: `Low stock (${qty})`, color: "text-orange-500" };
  return { label: "In stock", color: "text-green-600" };
}
