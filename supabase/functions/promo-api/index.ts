import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== Todd's Standard Product Schema Types ==========

interface ToddColor {
  code: string;
  name: string;
  imageUrl: string | null;
}

interface ToddImprintLocation {
  name: string;
  maxArea: string | null;
}

interface ToddImprint {
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

interface ToddPriceBreak {
  minQty: number;
  unitPrice: number;
}

interface ToddExtraCharge {
  type: string;
  amount: number;
  note: string | null;
}

interface ToddPricing {
  currency: string;
  baseDecoration: string | null;
  priceBreaks: ToddPriceBreak[];
  extraCharges: ToddExtraCharge[];
}

interface ToddLeadTime {
  standardDays: number | null;
  rushAvailable: boolean;
}

interface ToddShipping {
  origin: string | null;
  cartonInfo: string | null;
}

interface ToddImage {
  type: 'front' | 'back' | 'detail' | 'lifestyle' | 'other';
  url: string;
}

interface ToddProductFull {
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

interface ToddProductSummary {
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

interface ToddPricingResponse {
  id: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  currency: string;
  priceBreaks: ToddPriceBreak[];
  extraCharges: ToddExtraCharge[];
}

// ========== Supplier Configuration ==========

interface SupplierConfig {
  code: string;
  name: string;
  productDataUrl: string;
  mediaContentUrl: string;
  pricingConfigUrl: string;
  usernameEnvKey: string;
  passwordEnvKey: string;
  wsVersionProductData: string;
  wsVersionMedia: string;
  wsVersionPricing: string;
}

const SUPPLIER_CONFIGS: Record<string, SupplierConfig> = {
  imprintid: {
    code: 'imprintid',
    name: 'ImprintID',
    // Direct ImprintID endpoints (dc-onesource requires separate registration)
    productDataUrl: 'https://productdata.imprintid.com/ProductDataT.svc',
    mediaContentUrl: 'https://mediacontent.imprintid.com/MediaContents.svc',
    pricingConfigUrl: 'https://productprice.imprintid.com/ProductPricingConfig.svc',
    usernameEnvKey: 'PROMOSTANDARDS_USERNAME',
    passwordEnvKey: 'PROMOSTANDARDS_PASSWORD',
    wsVersionProductData: '2.0.0',
    wsVersionMedia: '1.0.0',
    wsVersionPricing: '1.0.0',
  },
  hit: {
    code: 'hit',
    name: 'HIT Promotional Products',
    productDataUrl: 'https://ppds.hitpromo.net/productDataV2RC1?ws=1',
    mediaContentUrl: 'https://ppds.hitpromo.net/productMedia?ws=1',
    pricingConfigUrl: 'https://ppds.hitpromo.net/pricingAndConfiguration?ws=1',
    usernameEnvKey: 'HIT_PS_USERNAME',
    passwordEnvKey: 'HIT_PS_PASSWORD',
    wsVersionProductData: '2.0.0',
    wsVersionMedia: '1.1.0',
    wsVersionPricing: '1.0.0',
  },
};

// ========== XML Parsing Helpers ==========

function extractTagValue(xml: string, tagName: string): string | null {
  const patterns = [
    new RegExp(`<[^>]*:${tagName}[^>]*>([^<]*)<`, 'i'),
    new RegExp(`<${tagName}[^>]*>([^<]*)<`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractBlock(xml: string, tagName: string): string[] {
  const blocks: string[] = [];
  const pattern = new RegExp(`<[^>]*:?${tagName}[^>]*>(.*?)</[^>]*:?${tagName}>`, 'gis');
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

// ========== SOAP Request Helper ==========

async function soapRequest(
  url: string, 
  soapAction: string, 
  body: string,
  config: SupplierConfig
): Promise<string> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  if (!username || !password) {
    throw new Error(`${config.name} credentials not configured`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': soapAction,
    },
    body: body,
  });

  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`SOAP request failed: ${response.status}`);
  }
  
  return text;
}

// ========== PromoStandards API Functions ==========

async function fetchProductFromAPI(productId: string, config: SupplierConfig): Promise<any> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  console.log(`[promo-api] Fetching product ${productId} from ${config.name}`);
  console.log(`[promo-api] Endpoint: ${config.productDataUrl}`);
  console.log(`[promo-api] Username configured: ${!!username}, Password configured: ${!!password}`);

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/"
               xmlns:shar="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/SharedObjects/">
  <soap:Body>
    <ns:GetProductRequest>
      <shar:wsVersion>${config.wsVersionProductData}</shar:wsVersion>
      <shar:id>${username}</shar:id>
      <shar:password>${password}</shar:password>
      <shar:localizationCountry>US</shar:localizationCountry>
      <shar:localizationLanguage>en</shar:localizationLanguage>
      <shar:productId>${productId}</shar:productId>
    </ns:GetProductRequest>
  </soap:Body>
</soap:Envelope>`;

  console.log(`[promo-api] SOAP Request body (partial): ${soapBody.substring(0, 500)}...`);

  const response = await soapRequest(
    config.productDataUrl,
    'getProduct',
    soapBody,
    config
  );

  console.log(`[promo-api] SOAP Response (partial): ${response.substring(0, 1000)}...`);

  return parseProductResponse(response);
}

async function fetchMediaFromAPI(productId: string, config: SupplierConfig): Promise<any[]> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://www.promostandards.org/WSDL/MediaService/${config.wsVersionMedia}/"
               xmlns:shar="http://www.promostandards.org/WSDL/MediaService/${config.wsVersionMedia}/SharedObjects/">
  <soap:Body>
    <ns:GetMediaContentRequest>
      <shar:wsVersion>${config.wsVersionMedia}</shar:wsVersion>
      <shar:id>${username}</shar:id>
      <shar:password>${password}</shar:password>
      <shar:mediaType>Image</shar:mediaType>
      <shar:productId>${productId}</shar:productId>
    </ns:GetMediaContentRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    config.mediaContentUrl,
    'getMediaContent',
    soapBody,
    config
  );

  return parseMediaResponse(response);
}

async function fetchPricingFromAPI(productId: string, config: SupplierConfig): Promise<any[]> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://www.promostandards.org/WSDL/PricingAndConfiguration/${config.wsVersionPricing}/"
               xmlns:shar="http://www.promostandards.org/WSDL/PricingAndConfiguration/${config.wsVersionPricing}/SharedObjects/">
  <soap:Body>
    <ns:GetConfigurationAndPricingRequest>
      <shar:wsVersion>${config.wsVersionPricing}</shar:wsVersion>
      <shar:id>${username}</shar:id>
      <shar:password>${password}</shar:password>
      <shar:productId>${productId}</shar:productId>
      <shar:currency>USD</shar:currency>
      <shar:fobId>1</shar:fobId>
      <shar:priceType>Net</shar:priceType>
      <shar:localizationCountry>US</shar:localizationCountry>
      <shar:localizationLanguage>en</shar:localizationLanguage>
      <shar:configurationType>Blank</shar:configurationType>
    </ns:GetConfigurationAndPricingRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    config.pricingConfigUrl,
    'getConfigurationAndPricing',
    soapBody,
    config
  );

  return parsePricingResponse(response);
}

// ========== Response Parsers ==========

function parseProductResponse(xml: string): any {
  const productId = extractTagValue(xml, 'productId');
  const productName = extractTagValue(xml, 'productName');
  const description = extractTagValue(xml, 'description');
  const priceType = extractTagValue(xml, 'priceType');
  const productBrand = extractTagValue(xml, 'productBrand');
  
  const categoryBlocks = extractBlock(xml, 'ProductCategory');
  let productCategory = null;
  let productSubCategory = null;
  
  if (categoryBlocks.length > 0) {
    productCategory = extractTagValue(categoryBlocks[0], 'category');
    productSubCategory = extractTagValue(categoryBlocks[0], 'subCategory');
  }
  
  const keywordBlocks = extractBlock(xml, 'ProductKeyword');
  const keywords: string[] = [];
  for (const block of keywordBlocks) {
    const keyword = extractTagValue(block, 'keyword');
    if (keyword) keywords.push(keyword);
  }

  return {
    productId,
    productName,
    description,
    priceType,
    productBrand,
    productCategory,
    productSubCategory,
    keywords,
  };
}

function parseMediaResponse(xml: string): any[] {
  const media: any[] = [];
  const mediaBlocks = extractBlock(xml, 'MediaContent');
  
  for (const block of mediaBlocks) {
    const url = extractTagValue(block, 'url');
    const mediaType = extractTagValue(block, 'mediaType') || 'Image';
    const color = extractTagValue(block, 'color');
    const decorationMethod = extractTagValue(block, 'decorationMethod');
    const location = extractTagValue(block, 'location');
    
    if (url) {
      media.push({ url, mediaType, color, decorationMethod, location });
    }
  }
  
  return media;
}

function parsePricingResponse(xml: string): any[] {
  const pricing: any[] = [];
  const priceBlocks = extractBlock(xml, 'PartPrice');
  
  for (const block of priceBlocks) {
    const minQuantity = extractTagValue(block, 'minQuantity');
    const price = extractTagValue(block, 'price');
    const discountCode = extractTagValue(block, 'discountCode');
    
    if (price) {
      pricing.push({
        minQty: minQuantity ? parseInt(minQuantity) : 1,
        unitPrice: parseFloat(price),
        discountCode,
      });
    }
  }
  
  return pricing;
}

// ========== Schema Mappers ==========

function mapToToddProductFull(
  supplierCode: string,
  productData: any,
  mediaData: any[],
  pricingData: any[]
): ToddProductFull {
  // Map media to images with type inference
  const images: ToddImage[] = mediaData.map(m => {
    let type: ToddImage['type'] = 'other';
    const url = m.url?.toLowerCase() || '';
    const location = m.location?.toLowerCase() || '';
    
    if (url.includes('front') || location.includes('front')) type = 'front';
    else if (url.includes('back') || location.includes('back')) type = 'back';
    else if (url.includes('detail') || url.includes('closeup')) type = 'detail';
    else if (url.includes('lifestyle') || url.includes('model')) type = 'lifestyle';
    
    return { type, url: m.url };
  });

  // Extract colors from media
  const colorMap = new Map<string, ToddColor>();
  for (const m of mediaData) {
    if (m.color && !colorMap.has(m.color)) {
      colorMap.set(m.color, {
        code: m.color.replace(/\s+/g, '-').toLowerCase(),
        name: m.color,
        imageUrl: m.url,
      });
    }
  }

  // Map pricing
  const priceBreaks: ToddPriceBreak[] = pricingData
    .sort((a, b) => a.minQty - b.minQty)
    .map(p => ({
      minQty: p.minQty,
      unitPrice: p.unitPrice,
    }));

  // Extract features from description or keywords
  const features = productData.keywords || [];

  return {
    id: `${supplierCode.toUpperCase()}:${productData.productId}`,
    supplier: supplierCode,
    itemNumber: productData.productId,
    name: productData.productName || productData.productId,
    shortName: null,
    
    description: productData.description,
    fabric: null, // Would need to parse from description or specs
    features,
    gender: null, // Would need to infer from product name/category
    fit: null,
    
    sizes: [], // PromoStandards doesn't always provide this clearly
    sizeNotes: null,
    colors: Array.from(colorMap.values()),
    
    imprint: {
      method: null,
      includedLocation: null,
      locations: [],
      maxColors: null,
      tapeCharge: null,
    },
    
    pricing: {
      currency: 'USD',
      baseDecoration: null,
      priceBreaks,
      extraCharges: [],
    },
    
    leadTime: {
      standardDays: null,
      rushAvailable: false,
    },
    
    shipping: {
      origin: null,
      cartonInfo: null,
    },
    
    images,
    
    category: productData.productCategory,
    subCategory: productData.productSubCategory,
    brand: productData.productBrand,
    keywords: productData.keywords || [],
    lastSyncedAt: new Date().toISOString(),
  };
}

function mapDbProductToSummary(dbProduct: any, supplierCode: string): ToddProductSummary {
  const primaryMedia = dbProduct.promo_media?.find((m: any) => m.is_primary) || dbProduct.promo_media?.[0];
  const lowestPrice = dbProduct.promo_pricing?.sort((a: any, b: any) => (a.quantity_min || 1) - (b.quantity_min || 1))?.[0];

  return {
    id: `${supplierCode.toUpperCase()}:${dbProduct.product_id}`,
    supplier: supplierCode,
    itemNumber: dbProduct.product_id,
    name: dbProduct.product_name,
    thumbnail: primaryMedia?.url || null,
    startingPrice: lowestPrice?.price || null,
    leadTime: null,
    category: dbProduct.product_category,
    brand: dbProduct.product_brand,
  };
}

function mapDbProductToFull(dbProduct: any, supplierCode: string): ToddProductFull {
  const images: ToddImage[] = (dbProduct.promo_media || []).map((m: any) => ({
    type: 'other' as const,
    url: m.url,
  }));

  const colorMap = new Map<string, ToddColor>();
  for (const m of dbProduct.promo_media || []) {
    if (m.color && !colorMap.has(m.color)) {
      colorMap.set(m.color, {
        code: m.color.replace(/\s+/g, '-').toLowerCase(),
        name: m.color,
        imageUrl: m.url,
      });
    }
  }

  const priceBreaks: ToddPriceBreak[] = (dbProduct.promo_pricing || [])
    .sort((a: any, b: any) => (a.quantity_min || 1) - (b.quantity_min || 1))
    .map((p: any) => ({
      minQty: p.quantity_min || 1,
      unitPrice: p.price,
    }));

  return {
    id: `${supplierCode.toUpperCase()}:${dbProduct.product_id}`,
    supplier: supplierCode,
    itemNumber: dbProduct.product_id,
    name: dbProduct.product_name,
    shortName: null,
    
    description: dbProduct.description,
    fabric: null,
    features: dbProduct.product_keywords || [],
    gender: null,
    fit: null,
    
    sizes: [],
    sizeNotes: null,
    colors: Array.from(colorMap.values()),
    
    imprint: {
      method: null,
      includedLocation: null,
      locations: [],
      maxColors: null,
      tapeCharge: null,
    },
    
    pricing: {
      currency: 'USD',
      baseDecoration: null,
      priceBreaks,
      extraCharges: [],
    },
    
    leadTime: {
      standardDays: null,
      rushAvailable: false,
    },
    
    shipping: {
      origin: null,
      cartonInfo: null,
    },
    
    images,
    
    category: dbProduct.product_category,
    subCategory: dbProduct.product_sub_category,
    brand: dbProduct.product_brand,
    keywords: dbProduct.product_keywords || [],
    lastSyncedAt: dbProduct.last_synced_at,
  };
}

// ========== Request Handlers ==========

async function handleListProducts(
  supabase: any,
  params: URLSearchParams
): Promise<ToddProductSummary[]> {
  const search = params.get('search');
  const supplier = params.get('supplier');
  const category = params.get('category');
  const limit = parseInt(params.get('limit') || '50');
  const offset = parseInt(params.get('offset') || '0');

  let query = supabase
    .from('promo_products')
    .select(`
      *,
      promo_media (url, is_primary, color),
      promo_pricing (quantity_min, price),
      promo_suppliers!inner (code, name)
    `)
    .eq('is_active', true);

  if (supplier && supplier !== 'all') {
    query = query.eq('promo_suppliers.code', supplier);
  }

  if (search) {
    query = query.or(`product_name.ilike.%${search}%,product_id.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (category) {
    query = query.ilike('product_category', `%${category}%`);
  }

  const { data, error } = await query
    .range(offset, offset + limit - 1)
    .order('product_name');

  if (error) throw error;

  return (data || []).map((p: any) => mapDbProductToSummary(p, p.promo_suppliers?.code || 'unknown'));
}

async function handleGetProduct(
  supabase: any,
  productId: string,
  forceRefresh: boolean = false
): Promise<ToddProductFull | null> {
  // Parse the ID format: SUPPLIER:itemNumber
  const [supplierCode, itemNumber] = productId.includes(':') 
    ? productId.split(':') 
    : ['', productId];

  const supplierLower = supplierCode.toLowerCase();

  // First check database
  let query = supabase
    .from('promo_products')
    .select(`
      *,
      promo_media (*),
      promo_pricing (*),
      promo_suppliers!inner (code, name)
    `)
    .eq('product_id', itemNumber);

  if (supplierLower) {
    query = query.eq('promo_suppliers.code', supplierLower);
  }

  const { data: dbProducts } = await query;

  if (dbProducts && dbProducts.length > 0 && !forceRefresh) {
    const dbProduct = dbProducts[0];
    return mapDbProductToFull(dbProduct, dbProduct.promo_suppliers?.code || supplierLower);
  }

  // If not in DB or force refresh, fetch from API
  const config = SUPPLIER_CONFIGS[supplierLower];
  if (!config) {
    throw new Error(`Unknown supplier: ${supplierCode}`);
  }

  try {
    const [productData, mediaData, pricingData] = await Promise.all([
      fetchProductFromAPI(itemNumber, config),
      fetchMediaFromAPI(itemNumber, config),
      fetchPricingFromAPI(itemNumber, config),
    ]);

    return mapToToddProductFull(supplierLower, productData, mediaData, pricingData);
  } catch (error) {
    console.error(`Error fetching from ${config.name}:`, error);
    throw error;
  }
}

async function handleGetPricing(
  supabase: any,
  productId: string,
  quantity: number
): Promise<ToddPricingResponse> {
  const product = await handleGetProduct(supabase, productId);
  
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  // Find applicable price break
  const sortedBreaks = [...product.pricing.priceBreaks].sort((a, b) => b.minQty - a.minQty);
  const applicableBreak = sortedBreaks.find(b => quantity >= b.minQty);
  
  const unitPrice = applicableBreak?.unitPrice || null;
  const totalPrice = unitPrice ? unitPrice * quantity : null;

  return {
    id: product.id,
    quantity,
    unitPrice,
    totalPrice,
    currency: product.pricing.currency,
    priceBreaks: product.pricing.priceBreaks,
    extraCharges: product.pricing.extraCharges,
  };
}

// ========== Main Handler ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Remove 'promo-api' from path if present (edge function name)
    const apiPath = pathParts.join('/');
    
    console.log(`[promo-api] Request: ${req.method} ${apiPath}`);

    let result: any;

    // Route: GET /products
    if (req.method === 'GET' && (apiPath === 'promo-api' || apiPath === 'promo-api/products' || apiPath === 'products' || apiPath === '')) {
      result = await handleListProducts(supabase, url.searchParams);
    }
    // Route: GET /products/:id/pricing
    else if (req.method === 'GET' && apiPath.match(/^(promo-api\/)?products\/[^/]+\/pricing$/)) {
      const productId = decodeURIComponent(pathParts[pathParts.length - 2]);
      const qty = parseInt(url.searchParams.get('qty') || '1');
      result = await handleGetPricing(supabase, productId, qty);
    }
    // Route: GET /products/:id
    else if (req.method === 'GET' && apiPath.match(/^(promo-api\/)?products\/[^/]+$/)) {
      const productId = decodeURIComponent(pathParts[pathParts.length - 1]);
      const forceRefresh = url.searchParams.get('refresh') === 'true';
      result = await handleGetProduct(supabase, productId, forceRefresh);
      
      if (!result) {
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // POST handler for body-based requests
    else if (req.method === 'POST') {
      const body = await req.json();
      const { action, productId, search, supplier, category, quantity } = body;

      switch (action) {
        case 'list':
          const params = new URLSearchParams();
          if (search) params.set('search', search);
          if (supplier) params.set('supplier', supplier);
          if (category) params.set('category', category);
          result = await handleListProducts(supabase, params);
          break;
        
        case 'get':
          if (!productId) throw new Error('productId required');
          result = await handleGetProduct(supabase, productId, body.refresh === true);
          break;
        
        case 'pricing':
          if (!productId) throw new Error('productId required');
          result = await handleGetPricing(supabase, productId, quantity || 1);
          break;
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
    else {
      return new Response(
        JSON.stringify({ 
          error: 'Not found',
          availableRoutes: [
            'GET /products - List products',
            'GET /products/:id - Get product details',
            'GET /products/:id/pricing?qty=### - Get pricing for quantity',
            'POST with action: list, get, pricing'
          ]
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[promo-api] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
