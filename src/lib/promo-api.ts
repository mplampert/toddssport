import { supabase } from "@/integrations/supabase/client";

// ========== Todd's Standard Product Schema Types ==========

export interface ToddMediaItem {
  url: string;
  mediaType: string;
  type: string; // 'Primary' | 'Alternate' | 'Thumbnail' | 'Other'
  view: string | null;
  rank: number;
  color: string | null;
  description: string | null;
  partId: string | null;
  width: number | null;
  height: number | null;
  singlePart: boolean;
  classTypes: { id: number; name: string }[];
  locations: { id: number; name: string }[];
}

export interface ToddColor {
  code: string;
  name: string;
  imageUrl: string | null;
}

export interface ToddImprintLocation {
  name: string;
  maxArea: string | null;
}

export interface ToddImprint {
  method: string | null;
  includedLocation: string | null;
  locations: ToddImprintLocation[];
  maxColors: number | null;
  tapeCharge: {
    amount: number | null;
    currency: string;
    waivedAtQty: number | null;
    note: string | null;
  } | null;
}

export interface ToddPriceBreak {
  minQty: number;
  unitPrice: number;
}

export interface ToddExtraCharge {
  type: string;
  amount: number;
  note: string | null;
}

export interface ToddPricing {
  currency: string;
  baseDecoration: string | null;
  priceBreaks: ToddPriceBreak[];
  extraCharges: ToddExtraCharge[];
}

export interface ToddLeadTime {
  standardDays: number | null;
  rushAvailable: boolean;
}

export interface ToddShipping {
  origin: string | null;
  cartonInfo: string | null;
}

export interface ToddImage {
  type: 'front' | 'back' | 'detail' | 'lifestyle' | 'other';
  url: string;
}

export interface ToddProductFull {
  // Identification
  id: string;
  supplier: string;
  itemNumber: string;
  name: string;
  shortName: string | null;
  
  // Description & specs
  description: string | null;
  fabric: string | null;
  features: string[];
  gender: string | null;
  fit: string | null;
  
  // Sizes & colors
  sizes: string[];
  sizeNotes: string | null;
  colors: ToddColor[];
  
  // Imprint / decoration
  imprint: ToddImprint;
  
  // Pricing
  pricing: ToddPricing;
  
  // Lead time & shipping
  leadTime: ToddLeadTime;
  shipping: ToddShipping;
  
  // Media
  images: ToddImage[];
  
  // Metadata
  category: string | null;
  subCategory: string | null;
  brand: string | null;
  keywords: string[];
  lastSyncedAt: string | null;
}

export interface ToddProductSummary {
  id: string;
  supplier: string;
  itemNumber: string;
  name: string;
  thumbnail: string | null;
  startingPrice: number | null;
  leadTime: number | null;
  category: string | null;
  brand: string | null;
}

export interface ToddPricingResponse {
  id: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  currency: string;
  priceBreaks: ToddPriceBreak[];
  extraCharges: ToddExtraCharge[];
}

export interface ListProductsParams {
  search?: string;
  supplier?: 'imprintid' | 'hit' | 'all';
  category?: string;
  limit?: number;
  offset?: number;
}

// ========== API Client ==========

class PromoAPIClient {
  /**
   * List products with optional filters
   */
  async listProducts(params: ListProductsParams = {}): Promise<ToddProductSummary[]> {
    const { data, error } = await supabase.functions.invoke('promo-api', {
      body: {
        action: 'list',
        search: params.search,
        supplier: params.supplier,
        category: params.category,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Get full product details by ID
   * @param productId Format: SUPPLIER:itemNumber (e.g., "IMPRINTID:123990-M")
   * @param refresh Force refresh from supplier API
   */
  async getProduct(productId: string, refresh: boolean = false): Promise<ToddProductFull> {
    const { data, error } = await supabase.functions.invoke('promo-api', {
      body: {
        action: 'get',
        productId,
        refresh,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Get media/images for a product directly from the supplier API
   * @param productId Format: SUPPLIER:itemNumber or just itemNumber (defaults to imprintid)
   */
  async getMedia(productId: string): Promise<ToddMediaItem[]> {
    const { data, error } = await supabase.functions.invoke('promo-api', {
      body: {
        action: 'media',
        productId,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Get pricing for a specific quantity
   */
  async getPricing(productId: string, quantity: number): Promise<ToddPricingResponse> {
    const { data, error } = await supabase.functions.invoke('promo-api', {
      body: {
        action: 'pricing',
        productId,
        quantity,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Build a product ID from supplier and item number
   */
  buildProductId(supplier: string, itemNumber: string): string {
    return `${supplier.toUpperCase()}:${itemNumber}`;
  }

  /**
   * Parse a product ID into supplier and item number
   */
  parseProductId(productId: string): { supplier: string; itemNumber: string } {
    const [supplier, ...rest] = productId.split(':');
    return {
      supplier: supplier.toLowerCase(),
      itemNumber: rest.join(':'),
    };
  }
}

export const promoAPI = new PromoAPIClient();
