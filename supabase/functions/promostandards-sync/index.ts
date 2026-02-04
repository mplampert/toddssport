import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// PromoStandards API endpoints for ImprintID
// Note: These use WCF services with specific SOAPAction formats
const PRODUCT_DATA_URL = 'https://productdata.imprintid.com/ProductDataT.svc';
const MEDIA_CONTENT_URL = 'https://mediacontent.imprintid.com/MediaContents.svc';
const PRICING_CONFIG_URL = 'https://productprice.imprintid.com/ProductPricingConfig.svc';

interface SyncRequest {
  action: 'search' | 'sync_product' | 'sync_media' | 'get_pricing' | 'get_sellable';
  productId?: string;
  searchTerm?: string;
  partId?: string;
}

// Helper to make SOAP requests
async function soapRequest(url: string, soapAction: string, body: string): Promise<string> {
  const username = Deno.env.get('PROMOSTANDARDS_USERNAME');
  const password = Deno.env.get('PROMOSTANDARDS_PASSWORD');

  if (!username || !password) {
    throw new Error('PromoStandards credentials not configured');
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
    console.error('SOAP Error:', response.status, text);
    throw new Error(`SOAP request failed: ${response.status}`);
  }

  // Log successful response for debugging (first 500 chars)
  console.log(`SOAP Response (${soapAction}):`, text.substring(0, 500));
  
  return text;
}

// Get sellable products list from Product Data API
async function getSellableProducts(): Promise<any[]> {
  const username = Deno.env.get('PROMOSTANDARDS_USERNAME');
  const password = Deno.env.get('PROMOSTANDARDS_PASSWORD');

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/"
               xmlns:shar="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/SharedObjects/">
  <soap:Body>
    <ns:GetProductSellableRequest>
      <shar:wsVersion>2.0.0</shar:wsVersion>
      <shar:id>${username}</shar:id>
      <shar:password>${password}</shar:password>
      <shar:isSellable>true</shar:isSellable>
    </ns:GetProductSellableRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    PRODUCT_DATA_URL,
    'getProductSellable',
    soapBody
  );

  // Log full response for debugging
  console.log('GetProductSellable full response:', response);

  // Parse the XML response
  const products = parseProductSellableResponse(response);
  return products;
}

// Get product details from Product Data API
async function getProductDetails(productId: string): Promise<any> {
  const username = Deno.env.get('PROMOSTANDARDS_USERNAME');
  const password = Deno.env.get('PROMOSTANDARDS_PASSWORD');

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/"
               xmlns:shar="http://www.promostandards.org/WSDL/ProductDataService/2.0.0/SharedObjects/">
  <soap:Body>
    <ns:GetProductRequest>
      <shar:wsVersion>2.0.0</shar:wsVersion>
      <shar:id>${username}</shar:id>
      <shar:password>${password}</shar:password>
      <shar:productId>${productId}</shar:productId>
    </ns:GetProductRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    PRODUCT_DATA_URL,
    'getProduct',
    soapBody
  );

  return parseProductResponse(response);
}

// Get media content for a product
async function getMediaContent(productId: string): Promise<any[]> {
  const username = Deno.env.get('PROMOSTANDARDS_USERNAME');
  const password = Deno.env.get('PROMOSTANDARDS_PASSWORD');

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetMediaContentRequest xmlns="http://www.promostandards.org/WSDL/MediaService/1.1.0/">
      <wsVersion>1.1.0</wsVersion>
      <id>${username}</id>
      <password>${password}</password>
      <productId>${productId}</productId>
      <mediaType>Image</mediaType>
    </GetMediaContentRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    MEDIA_CONTENT_URL,
    'getMediaContent',
    soapBody
  );

  return parseMediaContentResponse(response);
}

// Get pricing for a product
async function getProductPricing(productId: string, partId?: string): Promise<any[]> {
  const username = Deno.env.get('PROMOSTANDARDS_USERNAME');
  const password = Deno.env.get('PROMOSTANDARDS_PASSWORD');

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetConfigurationAndPricingRequest xmlns="http://www.promostandards.org/WSDL/PricingAndConfiguration/1.0.0/">
      <wsVersion>1.0.0</wsVersion>
      <id>${username}</id>
      <password>${password}</password>
      <productId>${productId}</productId>
      ${partId ? `<partId>${partId}</partId>` : ''}
      <currency>USD</currency>
      <fobId>1</fobId>
      <configurationType>Blank</configurationType>
    </GetConfigurationAndPricingRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await soapRequest(
    PRICING_CONFIG_URL,
    'getConfigurationAndPricing',
    soapBody
  );

  return parsePricingResponse(response);
}

// Simple XML parsing helpers (no external dependencies)
function extractTagValue(xml: string, tagName: string): string | null {
  // Handle namespaced tags like ns1:productId or just productId
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

function parseProductSellableResponse(xml: string): any[] {
  const products: any[] = [];
  const productBlocks = extractBlock(xml, 'ProductSellable');
  
  for (const block of productBlocks) {
    const productId = extractTagValue(block, 'productId');
    const productName = extractTagValue(block, 'productName');
    
    if (productId && productName) {
      products.push({
        productId,
        productName,
      });
    }
  }
  
  return products;
}

function parseProductResponse(xml: string): any {
  const productId = extractTagValue(xml, 'productId');
  const productName = extractTagValue(xml, 'productName');
  const description = extractTagValue(xml, 'description');
  const priceType = extractTagValue(xml, 'priceType');
  const productBrand = extractTagValue(xml, 'productBrand');
  
  // Extract categories
  const categoryBlocks = extractBlock(xml, 'ProductCategory');
  let productCategory = null;
  let productSubCategory = null;
  
  if (categoryBlocks.length > 0) {
    productCategory = extractTagValue(categoryBlocks[0], 'category');
    productSubCategory = extractTagValue(categoryBlocks[0], 'subCategory');
  }
  
  // Extract keywords
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
  
  for (const block of mediaBlocks) {
    const url = extractTagValue(block, 'url');
    const mediaType = extractTagValue(block, 'mediaType') || 'Image';
    const width = extractTagValue(block, 'width');
    const height = extractTagValue(block, 'height');
    const color = extractTagValue(block, 'color');
    const decorationMethod = extractTagValue(block, 'decorationMethod');
    const location = extractTagValue(block, 'location');
    
    if (url) {
      media.push({
        url,
        mediaType,
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        color,
        decorationMethod,
        location,
      });
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
        quantityMin: minQuantity ? parseInt(minQuantity) : 1,
        price: parseFloat(price),
        discountCode,
      });
    }
  }
  
  return pricing;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, productId, searchTerm, partId } = await req.json() as SyncRequest;

    // Get ImprintID supplier
    const { data: supplier } = await supabase
      .from('promo_suppliers')
      .select('id')
      .eq('code', 'imprintid')
      .single();

    if (!supplier) {
      throw new Error('ImprintID supplier not found');
    }

    let result: any = null;

    switch (action) {
      case 'get_sellable': {
        // Get list of sellable products
        console.log('Fetching sellable products from PromoStandards...');
        const products = await getSellableProducts();
        console.log(`Found ${products.length} sellable products`);
        result = { products, count: products.length };
        break;
      }

      case 'sync_product': {
        if (!productId) throw new Error('productId required');
        
        console.log(`Syncing product ${productId}...`);
        const productData = await getProductDetails(productId);
        
        if (!productData.productId) {
          throw new Error(`Product ${productId} not found`);
        }

        // Upsert product
        const { data: upsertedProduct, error } = await supabase
          .from('promo_products')
          .upsert({
            supplier_id: supplier.id,
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
        result = { product: upsertedProduct };
        break;
      }

      case 'sync_media': {
        if (!productId) throw new Error('productId required');
        
        // Find the product in our DB
        const { data: existingProduct } = await supabase
          .from('promo_products')
          .select('id')
          .eq('supplier_id', supplier.id)
          .eq('product_id', productId)
          .single();

        if (!existingProduct) {
          throw new Error(`Product ${productId} not in database - sync it first`);
        }

        console.log(`Fetching media for product ${productId}...`);
        const mediaItems = await getMediaContent(productId);
        console.log(`Found ${mediaItems.length} media items`);

        // Delete existing media and insert new
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

        result = { mediaCount: mediaItems.length };
        break;
      }

      case 'get_pricing': {
        if (!productId) throw new Error('productId required');
        
        // Find the product in our DB
        const { data: existingProduct } = await supabase
          .from('promo_products')
          .select('id')
          .eq('supplier_id', supplier.id)
          .eq('product_id', productId)
          .single();

        if (!existingProduct) {
          throw new Error(`Product ${productId} not in database - sync it first`);
        }

        console.log(`Fetching pricing for product ${productId}...`);
        const pricingItems = await getProductPricing(productId, partId);
        console.log(`Found ${pricingItems.length} price breaks`);

        // Update pricing cache
        await supabase
          .from('promo_pricing')
          .delete()
          .eq('promo_product_id', existingProduct.id);

        if (pricingItems.length > 0) {
          const pricingToInsert = pricingItems.map(p => ({
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

        result = { pricingCount: pricingItems.length, pricing: pricingItems };
        break;
      }

      case 'search': {
        // Search local database
        let query = supabase
          .from('promo_products')
          .select(`
            *,
            promo_media (url, is_primary),
            promo_pricing (quantity_min, price)
          `)
          .eq('is_active', true);

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
