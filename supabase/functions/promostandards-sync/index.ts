import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    productDataUrl: 'https://productdata.imprintid.com/ProductDataT.svc',
    mediaContentUrl: 'https://mediacontent.imprintid.com/MediaContents.svc',
    pricingConfigUrl: 'https://productprice.imprintid.com/ProductPricingConfig.svc',
    usernameEnvKey: 'PROMOSTANDARDS_USERNAME',
    passwordEnvKey: 'PROMOSTANDARDS_PASSWORD',
    wsVersionProductData: '2.0.0',
    wsVersionMedia: '1.1.0',  // WSDL namespace is 1.0.0 but wsVersion value is 1.1.0
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

interface SyncRequest {
  action: 'search' | 'sync_product' | 'sync_media' | 'get_pricing' | 'get_sellable';
  supplier: 'imprintid' | 'hit';
  productId?: string;
  searchTerm?: string;
  partId?: string;
}

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

function extractAllTagValues(xml: string, tagName: string): string[] {
  const values: string[] = [];
  const patterns = [
    new RegExp(`<[^>]*:${tagName}[^>]*>([^<]*)<`, 'gi'),
    new RegExp(`<${tagName}[^>]*>([^<]*)<`, 'gi'),
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      if (match[1].trim()) values.push(match[1].trim());
    }
  }
  return values;
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

function parseServiceError(xml: string): { code: string; description: string } | null {
  const errorCode = extractTagValue(xml, 'code');
  const errorDesc = extractTagValue(xml, 'description');
  
  if (errorCode && errorDesc) {
    return { code: errorCode, description: errorDesc };
  }
  return null;
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
    throw new Error(`${config.name} credentials not configured (${config.usernameEnvKey})`);
  }

  console.log(`[${config.code}] SOAP request to ${url} with action: ${soapAction}`);

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
    console.error(`[${config.code}] SOAP Error:`, response.status, text.substring(0, 500));
    throw new Error(`SOAP request failed: ${response.status}`);
  }

  console.log(`[${config.code}] SOAP Response (${soapAction}):`, text.substring(0, 500));
  
  return text;
}

// ========== API Functions ==========

async function getSellableProducts(config: SupplierConfig): Promise<{ products: any[]; error?: { code: string; description: string } }> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/"
               xmlns:shar="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/SharedObjects/">
  <soap:Body>
    <ns:GetProductSellableRequest>
      <shar:wsVersion>${config.wsVersionProductData}</shar:wsVersion>
      <shar:id>${username}</shar:id>
      <shar:password>${password}</shar:password>
      <shar:isSellable>true</shar:isSellable>
    </ns:GetProductSellableRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    config.productDataUrl,
    'getProductSellable',
    soapBody,
    config
  );

  console.log(`[${config.code}] GetProductSellable full response length: ${response.length}`);

  const error = parseServiceError(response);
  if (error) {
    return { products: [], error };
  }

  const products = parseProductSellableResponse(response);
  return { products };
}

async function getProductDetails(productId: string, config: SupplierConfig): Promise<any> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  const ns = 'http://www.promostandards.org/WSDL/ProductDataService/2.0.0/';
  const shared = 'http://www.promostandards.org/WSDL/ProductDataService/2.0.0/SharedObjects/';

  // Use vendor-exact inline xmlns format for ImprintID compatibility
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetProductRequest xmlns="${ns}">
      <wsVersion xmlns="${shared}">${config.wsVersionProductData}</wsVersion>
      <id xmlns="${shared}">${username}</id>
      <password xmlns="${shared}">${password}</password>
      <localizationCountry xmlns="${shared}">US</localizationCountry>
      <localizationLanguage xmlns="${shared}">en</localizationLanguage>
      <productId xmlns="${shared}">${productId}</productId>
      <partId xmlns="${shared}"></partId>
      <colorName xmlns="${shared}"></colorName>
      <ApparelSizeArray xmlns="${shared}">
        <ApparelSize>
          <apparelStyle>Unisex</apparelStyle>
          <labelSize>OSFA</labelSize>
          <customSize></customSize>
        </ApparelSize>
      </ApparelSizeArray>
    </GetProductRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    config.productDataUrl,
    'getProduct',
    soapBody,
    config
  );

  console.log(`[${config.code}] GetProduct raw response length: ${response.length}`);
  console.log(`[${config.code}] GetProduct response preview:`, response.substring(0, 1000));

  return parseProductResponse(response);
}

async function getMediaContent(productId: string, config: SupplierConfig): Promise<any[]> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  // WSDL namespace is always 1.0.0, but wsVersion element value may differ
  const ns = `http://www.promostandards.org/WSDL/MediaService/1.0.0/`;
  const shared = `http://www.promostandards.org/WSDL/MediaService/1.0.0/SharedObjects/`;

  // Vendor-exact inline xmlns format matching ImprintID WSDL
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

  const response = await soapRequest(
    config.mediaContentUrl,
    'getMediaContent',
    soapBody,
    config
  );

  console.log(`[${config.code}] GetMediaContent raw response length: ${response.length}`);
  console.log(`[${config.code}] GetMediaContent response preview:`, response.substring(0, 1500));

  return parseMediaContentResponse(response);
}

async function getProductPricing(productId: string, config: SupplierConfig, partId?: string): Promise<any[]> {
  const username = Deno.env.get(config.usernameEnvKey);
  const password = Deno.env.get(config.passwordEnvKey);

  // Pricing & Configuration 1.0.0 - add localizationCountry/Language for ImprintID
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
      ${partId ? `<shar:partId>${partId}</shar:partId>` : ''}
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

function parseProductSellableResponse(xml: string): any[] {
  const products: any[] = [];
  const productBlocks = extractBlock(xml, 'ProductSellable');
  
  console.log(`Found ${productBlocks.length} ProductSellable blocks`);
  
  for (const block of productBlocks) {
    const productId = extractTagValue(block, 'productId');
    const partId = extractTagValue(block, 'partId');
    const productName = extractTagValue(block, 'productName');
    
    if (productId) {
      products.push({
        productId,
        partId,
        productName: productName || productId,
      });
    }
  }
  
  return products;
}

function parseProductResponse(xml: string): any {
  const error = parseServiceError(xml);
  if (error) {
    return { error };
  }

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

function parseMediaContentResponse(xml: string): any[] {
  const media: any[] = [];
  const mediaBlocks = extractBlock(xml, 'MediaContent');
  
  console.log(`[parseMedia] Found ${mediaBlocks.length} MediaContent blocks`);
  
  for (const block of mediaBlocks) {
    const url = extractTagValue(block, 'url');
    const mediaType = extractTagValue(block, 'mediaType') || 'Image';
    const width = extractTagValue(block, 'width');
    const height = extractTagValue(block, 'height');
    const color = extractTagValue(block, 'color');
    const description = extractTagValue(block, 'description');
    const singlePart = extractTagValue(block, 'singlePart');
    const partId = extractTagValue(block, 'partId');
    
    // Parse ClassType for image classification (Primary, Alternate, Thumbnail, etc.)
    const classTypeBlocks = extractBlock(block, 'ClassType');
    const classTypes: { id: number; name: string }[] = [];
    for (const ct of classTypeBlocks) {
      const ctId = extractTagValue(ct, 'classTypeId');
      const ctName = extractTagValue(ct, 'classTypeName');
      if (ctId && ctName) classTypes.push({ id: parseInt(ctId), name: ctName });
    }

    // Parse Location info
    const locationBlocks = extractBlock(block, 'Location');
    const locations: { id: number; name: string }[] = [];
    for (const loc of locationBlocks) {
      const locId = extractTagValue(loc, 'locationId');
      const locName = extractTagValue(loc, 'locationName');
      if (locId && locName) locations.push({ id: parseInt(locId), name: locName });
    }

    // Parse Decoration info
    const decorationBlocks = extractBlock(block, 'Decoration');
    const decorations: { id: number; name: string }[] = [];
    for (const dec of decorationBlocks) {
      const decId = extractTagValue(dec, 'decorationId');
      const decName = extractTagValue(dec, 'decorationName');
      if (decId && decName) decorations.push({ id: parseInt(decId), name: decName });
    }

    // Determine image type from classTypes
    const primaryType = classTypes.find(c => c.name.toLowerCase().includes('primary'));
    const type = primaryType ? 'Primary' : 
                 classTypes.find(c => c.name.toLowerCase().includes('alternate')) ? 'Alternate' :
                 classTypes.find(c => c.name.toLowerCase().includes('thumbnail')) ? 'Thumbnail' : 
                 classTypes[0]?.name || 'Other';

    // Determine view from classTypes or location
    const viewType = classTypes.find(c => /front|back|side|top|bottom|detail|lifestyle/i.test(c.name));
    const view = viewType?.name || locations[0]?.name || null;
    
    if (url) {
      media.push({
        url,
        mediaType,
        type,
        view,
        rank: primaryType ? 0 : 1,
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        color,
        description,
        partId,
        singlePart: singlePart === 'true',
        classTypes,
        locations,
        decorations,
      });
    }
  }

  // Sort: Primary first, then by rank
  media.sort((a, b) => a.rank - b.rank);
  
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
        quantityMin: minQuantity ? parseInt(minQuantity) : 1,
        price: parseFloat(price),
        discountCode,
      });
    }
  }
  
  return pricing;
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

    const { action, supplier = 'imprintid', productId, searchTerm, partId } = await req.json() as SyncRequest;

    // Get supplier config
    const config = SUPPLIER_CONFIGS[supplier];
    if (!config) {
      throw new Error(`Unknown supplier: ${supplier}. Valid options: ${Object.keys(SUPPLIER_CONFIGS).join(', ')}`);
    }

    console.log(`[${supplier}] Processing action: ${action}`);

    // Get supplier from database
    const { data: supplierData } = await supabase
      .from('promo_suppliers')
      .select('id')
      .eq('code', supplier)
      .single();

    if (!supplierData) {
      throw new Error(`Supplier '${supplier}' not found in database`);
    }

    let result: any = null;

    switch (action) {
      case 'get_sellable': {
        console.log(`[${supplier}] Fetching sellable products...`);
        const sellableResult = await getSellableProducts(config);
        
        if (sellableResult.error) {
          throw new Error(`PromoStandards API Error [${sellableResult.error.code}]: ${sellableResult.error.description}`);
        }
        
        console.log(`[${supplier}] Found ${sellableResult.products.length} sellable products`);
        result = { products: sellableResult.products, count: sellableResult.products.length, supplier };
        break;
      }

      case 'sync_product': {
        if (!productId) throw new Error('productId required');
        
        console.log(`[${supplier}] Syncing product ${productId}...`);
        const productData = await getProductDetails(productId, config);
        
        if (productData.error) {
          throw new Error(`PromoStandards API Error [${productData.error.code}]: ${productData.error.description}`);
        }
        
        if (!productData.productId) {
          throw new Error(`Product ${productId} not found in API response`);
        }

        const { data: upsertedProduct, error } = await supabase
          .from('promo_products')
          .upsert({
            supplier_id: supplierData.id,
            product_id: productData.productId,
            product_name: productData.productName,
            description: productData.description,
            price_type: productData.priceType,
            product_brand: productData.productBrand,
            product_category: productData.productCategory,
            product_sub_category: productData.productSubCategory,
            product_keywords: productData.keywords,
            last_synced_at: new Date().toISOString(),
          }, {
            onConflict: 'supplier_id,product_id',
          })
          .select()
          .single();

        if (error) throw error;
        result = { product: upsertedProduct, supplier };
        break;
      }

      case 'sync_media': {
        if (!productId) throw new Error('productId required');
        
        const { data: existingProduct } = await supabase
          .from('promo_products')
          .select('id')
          .eq('supplier_id', supplierData.id)
          .eq('product_id', productId)
          .single();

        if (!existingProduct) {
          throw new Error(`Product ${productId} not in database - sync it first`);
        }

        console.log(`[${supplier}] Fetching media for product ${productId}...`);
        const mediaItems = await getMediaContent(productId, config);
        console.log(`[${supplier}] Found ${mediaItems.length} media items`);

        await supabase
          .from('promo_media')
          .delete()
          .eq('promo_product_id', existingProduct.id);

        if (mediaItems.length > 0) {
          const mediaToInsert = mediaItems.map((m, idx) => ({
            promo_product_id: existingProduct.id,
            media_type: m.mediaType,
            url: m.url,
            width: m.width,
            height: m.height,
            color: m.color,
            decoration_method: m.decorationMethod,
            location: m.location,
            is_primary: idx === 0,
          }));

          const { error } = await supabase
            .from('promo_media')
            .insert(mediaToInsert);

          if (error) throw error;
        }

        result = { mediaCount: mediaItems.length, supplier };
        break;
      }

      case 'get_pricing': {
        if (!productId) throw new Error('productId required');
        
        const { data: existingProduct } = await supabase
          .from('promo_products')
          .select('id')
          .eq('supplier_id', supplierData.id)
          .eq('product_id', productId)
          .single();

        if (!existingProduct) {
          throw new Error(`Product ${productId} not in database - sync it first`);
        }

        console.log(`[${supplier}] Fetching pricing for product ${productId}...`);
        const pricingItems = await getProductPricing(productId, config, partId);
        console.log(`[${supplier}] Found ${pricingItems.length} price breaks`);

        await supabase
          .from('promo_pricing')
          .delete()
          .eq('promo_product_id', existingProduct.id);

        if (pricingItems.length > 0) {
          // Deduplicate by quantity_min+price to avoid storing repeated part-level rows
          const seen = new Set<string>();
          const uniquePricing = pricingItems.filter(p => {
            const key = `${p.quantityMin}|${p.price}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          console.log(`[${supplier}] Deduped pricing: ${pricingItems.length} -> ${uniquePricing.length}`);

          const pricingToInsert = uniquePricing.map(p => ({
            promo_product_id: existingProduct.id,
            currency: 'USD',
            quantity_min: p.quantityMin,
            price: p.price,
            discount_code: p.discountCode,
            last_synced_at: new Date().toISOString(),
          }));

          const { error } = await supabase
            .from('promo_pricing')
            .insert(pricingToInsert);

          if (error) throw error;
        }

        result = { pricingCount: pricingItems.length, pricing: pricingItems, supplier };
        break;
      }

      case 'search': {
        let query = supabase
          .from('promo_products')
          .select(`
            *,
            promo_media (url, is_primary),
            promo_pricing (quantity_min, price),
            promo_suppliers!inner (code, name)
          `)
          .eq('is_active', true);

        // Filter by supplier if not 'all'
        if (supplier !== 'all' as any) {
          query = query.eq('supplier_id', supplierData.id);
        }

        if (searchTerm) {
          query = query.or(`product_name.ilike.%${searchTerm}%,product_id.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.limit(50);
        if (error) throw error;

        result = { products: data };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in promostandards-sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
