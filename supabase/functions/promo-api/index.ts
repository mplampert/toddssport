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
    wsVersionMedia: '1.1.0',
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

  // WSDL namespace is always 1.0.0, but wsVersion element value may differ
  const ns = `http://www.promostandards.org/WSDL/MediaService/1.0.0/`;
  const shared = `http://www.promostandards.org/WSDL/MediaService/1.0.0/SharedObjects/`;

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetMediaContentRequest xmlns="${ns}">
      <wsVersion xmlns="${shared}">${config.wsVersionMedia}</wsVersion>
      <id xmlns="${shared}">${username}</id>
      <password xmlns="${shared}">${password}</password>
      <mediaType xmlns="${shared}">Image</mediaType>
      <productId xmlns="${shared}">${productId}</productId>
    </GetMediaContentRequest>
  </soap:Body>
</soap:Envelope>`;

  console.log(`[promo-api] Media SOAP request for ${productId}`);

  const response = await soapRequest(
    config.mediaContentUrl,
    'getMediaContent',
    soapBody,
    config
  );

  console.log(`[promo-api] Media response length: ${response.length}`);
  console.log(`[promo-api] Media response preview:`, response.substring(0, 1500));

  return parseMediaResponse(response);
}

interface PricingResult {
  priceBreaks: any[];
  fobPoints: { id: string; name: string; postalCode: string | null }[];
  decorationMethods: string[];
  imprintLocations: { name: string; maxArea: string | null }[];
  leadTimeDays: number | null;
  rushAvailable: boolean;
  currency: string;
}

async function fetchPricingFromAPI(productId: string, config: SupplierConfig): Promise<PricingResult> {
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

  console.log(`[promo-api] Pricing SOAP request for ${productId} to ${config.pricingConfigUrl}`);

  try {
    const response = await soapRequest(
      config.pricingConfigUrl,
      'getConfigurationAndPricing',
      soapBody,
      config
    );

    console.log(`[promo-api] Pricing response length: ${response.length}`);
    console.log(`[promo-api] Pricing response preview:`, response.substring(0, 2000));

    return parsePricingResponse(response);
  } catch (err) {
    console.error(`[promo-api] Pricing API error for ${productId}:`, err);
    return {
      priceBreaks: [],
      fobPoints: [],
      decorationMethods: [],
      imprintLocations: [],
      leadTimeDays: null,
      rushAvailable: false,
      currency: 'USD',
    };
  }
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
  
  console.log(`[promo-api parseMedia] Found ${mediaBlocks.length} MediaContent blocks`);
  
  for (const block of mediaBlocks) {
    const url = extractTagValue(block, 'url');
    const mediaType = extractTagValue(block, 'mediaType') || 'Image';
    const color = extractTagValue(block, 'color');
    const description = extractTagValue(block, 'description');
    const partId = extractTagValue(block, 'partId');
    const width = extractTagValue(block, 'width');
    const height = extractTagValue(block, 'height');
    const singlePart = extractTagValue(block, 'singlePart');

    // Parse ClassType for classification
    const classTypeBlocks = extractBlock(block, 'ClassType');
    const classTypes: { id: number; name: string }[] = [];
    for (const ct of classTypeBlocks) {
      const ctId = extractTagValue(ct, 'classTypeId');
      const ctName = extractTagValue(ct, 'classTypeName');
      if (ctId && ctName) classTypes.push({ id: parseInt(ctId), name: ctName });
    }

    // Parse Location
    const locationBlocks = extractBlock(block, 'Location');
    const locations: { id: number; name: string }[] = [];
    for (const loc of locationBlocks) {
      const locId = extractTagValue(loc, 'locationId');
      const locName = extractTagValue(loc, 'locationName');
      if (locId && locName) locations.push({ id: parseInt(locId), name: locName });
    }

    // Determine type and view
    const primaryType = classTypes.find(c => c.name.toLowerCase().includes('primary'));
    const type = primaryType ? 'Primary' : 
                 classTypes.find(c => c.name.toLowerCase().includes('alternate')) ? 'Alternate' :
                 classTypes.find(c => c.name.toLowerCase().includes('thumbnail')) ? 'Thumbnail' : 
                 classTypes[0]?.name || 'Other';
    const viewType = classTypes.find(c => /front|back|side|top|bottom|detail|lifestyle/i.test(c.name));
    const view = viewType?.name || locations[0]?.name || null;
    
    if (url) {
      media.push({
        url,
        mediaType,
        type,
        view,
        rank: primaryType ? 0 : 1,
        color,
        description,
        partId,
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        singlePart: singlePart === 'true',
        classTypes,
        locations,
      });
    }
  }

  media.sort((a, b) => a.rank - b.rank);
  return media;
}

function parsePricingResponse(xml: string): PricingResult {
  const priceBreaks: any[] = [];
  const priceBlocks = extractBlock(xml, 'PartPrice');
  
  console.log(`[promo-api parsePricing] Found ${priceBlocks.length} PartPrice blocks`);
  
  for (const block of priceBlocks) {
    const minQuantity = extractTagValue(block, 'minQuantity');
    const price = extractTagValue(block, 'price');
    const discountCode = extractTagValue(block, 'discountCode');
    
    if (price) {
      priceBreaks.push({
        minQty: minQuantity ? parseInt(minQuantity) : 1,
        unitPrice: parseFloat(price),
        discountCode,
      });
    }
  }

  // Deduplicate price breaks by minQty (keep lowest price)
  const uniqueBreaks = new Map<number, any>();
  for (const pb of priceBreaks) {
    const existing = uniqueBreaks.get(pb.minQty);
    if (!existing || pb.unitPrice < existing.unitPrice) {
      uniqueBreaks.set(pb.minQty, pb);
    }
  }

  // Parse FOB points (shipping origins)
  const fobPoints: { id: string; name: string; postalCode: string | null }[] = [];
  const fobBlocks = extractBlock(xml, 'FobPoint');
  console.log(`[promo-api parsePricing] Found ${fobBlocks.length} FobPoint blocks`);
  for (const block of fobBlocks) {
    const fobId = extractTagValue(block, 'fobId');
    const fobName = extractTagValue(block, 'fobCity') || extractTagValue(block, 'fobState') || 'Unknown';
    const postalCode = extractTagValue(block, 'fobPostalCode');
    if (fobId) fobPoints.push({ id: fobId, name: fobName, postalCode });
  }

  // Parse decoration/imprint info from Configuration
  const decorationMethods: string[] = [];
  const imprintLocations: { name: string; maxArea: string | null }[] = [];
  
  const locationBlocks = extractBlock(xml, 'Location');
  console.log(`[promo-api parsePricing] Found ${locationBlocks.length} Location blocks`);
  for (const block of locationBlocks) {
    const locName = extractTagValue(block, 'locationName');
    const maxW = extractTagValue(block, 'maxImprintWidth');
    const maxH = extractTagValue(block, 'maxImprintHeight');
    const maxArea = maxW && maxH ? `${maxW}" x ${maxH}"` : null;
    if (locName) imprintLocations.push({ name: locName, maxArea });
    
    const methodName = extractTagValue(block, 'decorationName') || extractTagValue(block, 'methodName');
    if (methodName && !decorationMethods.includes(methodName)) decorationMethods.push(methodName);
  }

  // Also check DecorationMethod blocks directly
  const decoBlocks = extractBlock(xml, 'DecorationMethod');
  for (const block of decoBlocks) {
    const methodName = extractTagValue(block, 'decorationName') || extractTagValue(block, 'methodName');
    if (methodName && !decorationMethods.includes(methodName)) decorationMethods.push(methodName);
  }

  // Parse lead time
  let leadTimeDays: number | null = null;
  let rushAvailable = false;
  const leadTimeVal = extractTagValue(xml, 'leadTime');
  if (leadTimeVal) {
    const days = parseInt(leadTimeVal);
    if (!isNaN(days)) leadTimeDays = days;
  }
  const rushVal = extractTagValue(xml, 'rushService');
  if (rushVal?.toLowerCase() === 'true') rushAvailable = true;

  // Parse currency
  const currency = extractTagValue(xml, 'currency') || 'USD';

  // Check for error
  const errorMessage = extractTagValue(xml, 'ErrorMessage');
  if (errorMessage) {
    console.warn(`[promo-api parsePricing] API returned error: ${errorMessage}`);
  }

  console.log(`[promo-api parsePricing] Result: ${Array.from(uniqueBreaks.values()).length} price breaks, ${fobPoints.length} FOBs, ${decorationMethods.length} deco methods, ${imprintLocations.length} locations, leadTime=${leadTimeDays}`);

  return {
    priceBreaks: Array.from(uniqueBreaks.values()).sort((a, b) => a.minQty - b.minQty),
    fobPoints,
    decorationMethods,
    imprintLocations,
    leadTimeDays,
    rushAvailable,
    currency,
  };
}

// ========== Description Parser (fallback for missing structured data) ==========

function parseDescriptionForDetails(description: string | null): {
  leadTimeDays: number | null;
  rushAvailable: boolean;
  setupCharge: { amount: number; note: string } | null;
  decorationMethods: string[];
  fobOrigin: string | null;
} {
  if (!description) return { leadTimeDays: null, rushAvailable: false, setupCharge: null, decorationMethods: [], fobOrigin: null };

  const result: ReturnType<typeof parseDescriptionForDetails> = {
    leadTimeDays: null,
    rushAvailable: false,
    setupCharge: null,
    decorationMethods: [],
    fobOrigin: null,
  };

  // Lead time: "5-7 business days", "Produced in 5 business days", "Lead Time: 10 days"
  const leadMatch = description.match(/(?:lead\s*time|produced\s*in)[:\s]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:business\s*)?days/i);
  if (leadMatch) {
    // Use the higher number if range
    result.leadTimeDays = parseInt(leadMatch[2] || leadMatch[1]);
  }

  // Rush: "Rush available", "rush service"
  if (/rush\s*(?:available|service|option)/i.test(description)) {
    result.rushAvailable = true;
  }

  // Setup charge: "Setup: $40(V)", "Setup Charge: $50.00"
  const setupMatch = description.match(/setup[^:]*:\s*\$?([\d.]+)/i);
  if (setupMatch) {
    const afterSetup = description.substring(description.indexOf(setupMatch[0]));
    const noteMatch = afterSetup.match(/for\s+([^.]{3,40})/i);
    result.setupCharge = {
      amount: parseFloat(setupMatch[1]),
      note: noteMatch ? noteMatch[1].trim() : 'Setup charge',
    };
  }

  // Decoration methods: common promo terms
  const decoTerms = [
    'screen print', 'digital print', 'heat transfer', 'embroidery',
    'laser engrav', 'pad print', 'UV print', 'sublimation', 'deboss',
    'emboss', 'decal', 'full color', 'etching', 'hot stamp',
  ];
  for (const term of decoTerms) {
    if (new RegExp(term, 'i').test(description)) {
      result.decorationMethods.push(term.replace(/^\w/, c => c.toUpperCase()));
    }
  }

  // FOB / Ships from: "Ships from CA", "FOB: Los Angeles"
  const fobMatch = description.match(/(?:ships?\s*from|FOB)[:\s]*([A-Za-z\s,]+?)(?:\.|$)/i);
  if (fobMatch) {
    result.fobOrigin = fobMatch[1].trim();
  }

  return result;
}

// ========== Schema Mappers ==========

function mapToToddProductFull(
  supplierCode: string,
  productData: any,
  mediaData: any[],
  pricingData: PricingResult
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

  // Map pricing from enriched result
  const priceBreaks: ToddPriceBreak[] = pricingData.priceBreaks
    .sort((a: any, b: any) => a.minQty - b.minQty)
    .map((p: any) => ({
      minQty: p.minQty,
      unitPrice: p.unitPrice,
    }));

  // Extract features from description or keywords
  const features = productData.keywords || [];

  // Parse description for fallback data
  const descParsed = parseDescriptionForDetails(productData.description);

  // Build shipping origin: prefer API, fallback to description
  const shippingOrigin = pricingData.fobPoints.length > 0
    ? pricingData.fobPoints.map(f => f.postalCode ? `${f.name} (${f.postalCode})` : f.name).join(', ')
    : descParsed.fobOrigin;

  // Decoration methods: prefer API, fallback to description
  const allDecoMethods = pricingData.decorationMethods.length > 0
    ? pricingData.decorationMethods
    : descParsed.decorationMethods;

  // Lead time: prefer API, fallback to description
  const leadTimeDays = pricingData.leadTimeDays ?? descParsed.leadTimeDays;
  const rushAvailable = pricingData.rushAvailable || descParsed.rushAvailable;

  // Extra charges from description setup
  const extraCharges: ToddExtraCharge[] = [];
  if (descParsed.setupCharge) {
    extraCharges.push({
      type: 'Setup',
      amount: descParsed.setupCharge.amount,
      note: descParsed.setupCharge.note,
    });
  }

  return {
    id: `${supplierCode.toUpperCase()}:${productData.productId}`,
    supplier: supplierCode,
    itemNumber: productData.productId,
    name: productData.productName || productData.productId,
    shortName: null,
    
    description: productData.description,
    fabric: null,
    features,
    gender: null,
    fit: null,
    
    sizes: [],
    sizeNotes: null,
    colors: Array.from(colorMap.values()),
    
    imprint: {
      method: allDecoMethods.length > 0 ? allDecoMethods.join(', ') : null,
      includedLocation: pricingData.imprintLocations.length > 0 ? pricingData.imprintLocations[0].name : null,
      locations: pricingData.imprintLocations,
      maxColors: null,
      tapeCharge: null,
    },
    
    pricing: {
      currency: pricingData.currency,
      baseDecoration: allDecoMethods.length > 0 ? allDecoMethods[0] : null,
      priceBreaks,
      extraCharges,
    },
    
    leadTime: {
      standardDays: leadTimeDays,
      rushAvailable: rushAvailable,
    },
    
    shipping: {
      origin: shippingOrigin,
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

  console.log(`[promo-api] handleGetProduct: raw="${productId}" supplier="${supplierLower}" item="${itemNumber}"`);

  // First check database
  let query = supabase
    .from('promo_products')
    .select(`
      *,
      promo_media (*),
      promo_pricing (*),
      promo_suppliers!inner (code, name)
    `)
    .eq('product_id', itemNumber || productId);

  if (supplierLower) {
    query = query.eq('promo_suppliers.code', supplierLower);
  }

  const { data: dbProducts } = await query;

  if (dbProducts && dbProducts.length > 0 && !forceRefresh) {
    const dbProduct = dbProducts[0];
    const dbResult = mapDbProductToFull(dbProduct, dbProduct.promo_suppliers?.code || supplierLower);
    
    // If DB product has no pricing, enrich from API
    const hasPricing = dbResult.pricing.priceBreaks.length > 0;
    if (hasPricing) {
      return dbResult;
    }
    console.log(`[promo-api] DB product ${productId} has no pricing, enriching from API...`);
  }

  // If not in DB or force refresh, fetch from API
  // Resolve supplier: use parsed value, or try to detect from DB, or default to imprintid
  const resolvedSupplier = supplierLower || 'imprintid';
  const config = SUPPLIER_CONFIGS[resolvedSupplier];
  if (!config) {
    throw new Error(`Unknown supplier: ${resolvedSupplier}. Valid: ${Object.keys(SUPPLIER_CONFIGS).join(', ')}`);
  }

  try {
    const [productData, mediaData, pricingData] = await Promise.all([
      fetchProductFromAPI(itemNumber, config),
      fetchMediaFromAPI(itemNumber, config),
      fetchPricingFromAPI(itemNumber, config),
    ]);

    return mapToToddProductFull(resolvedSupplier, productData, mediaData, pricingData);
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
        
        case 'media': {
          if (!productId) throw new Error('productId required');
          // Parse supplier from productId or default to imprintid
          const [supCode, itemNum] = productId.includes(':') 
            ? productId.split(':') 
            : ['imprintid', productId];
          const mediaConfig = SUPPLIER_CONFIGS[supCode.toLowerCase()];
          if (!mediaConfig) throw new Error(`Unknown supplier: ${supCode}`);
          const mediaItems = await fetchMediaFromAPI(itemNum, mediaConfig);
          result = mediaItems;
          break;
        }
        
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
