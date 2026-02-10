import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_TYPES = ['styles', 'specs', 'categories'];
const MAX_BATCH_SIZE = 10000;

interface StyleRow {
  styleID: number;
  partNumber: string;
  brandName: string;
  styleName: string;
  uniqueStyleName: string;
  title: string;
  description: string;
  baseCategory: string;
  categories: string;
  catalogPageNumber: number;
  newStyle: number | boolean;
  comparableGroup: number;
  companionGroup: number;
  brandImage: string;
  styleImage: string;
  Prop65Chemicals: string;
  SustainableStyle: string | boolean;
}

interface SpecRow {
  specID: number;
  styleID: number;
  partNumber: string;
  brandName: string;
  styleName: string;
  sizeName: string;
  sizeOrder: string;
  specName: string;
  value: string;
}

interface CategoryRow {
  categoryID: number;
  name: string;
  url: string;
  image: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Auth check (admin only) ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Input validation ──
    const { type, data } = await req.json();

    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Data must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Data exceeds maximum batch size of ${MAX_BATCH_SIZE}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let insertedCount = 0;
    let errorCount = 0;
    const batchSize = 500;

    if (type === 'styles') {
      console.log(`Importing ${data.length} styles...`);
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize) as StyleRow[];
        const formatted = batch.map(row => ({
          style_id: row.styleID,
          part_number: row.partNumber || null,
          brand_name: row.brandName || 'Unknown',
          style_name: row.styleName || '',
          unique_style_name: row.uniqueStyleName || null,
          title: row.title || null,
          description: row.description || null,
          base_category: row.baseCategory || null,
          categories: row.categories || null,
          catalog_page_number: row.catalogPageNumber || null,
          new_style: row.newStyle === 1 || row.newStyle === true,
          comparable_group: row.comparableGroup || null,
          companion_group: row.companionGroup || null,
          brand_image: row.brandImage || null,
          style_image: row.styleImage || null,
          prop65_chemicals: row.Prop65Chemicals || null,
          sustainable_style: row.SustainableStyle === 'TRUE' || row.SustainableStyle === true,
        }));

        const { error } = await supabase
          .from('catalog_styles')
          .upsert(formatted, { onConflict: 'style_id' });

        if (error) {
          console.error('Batch insert error:', error);
          errorCount += batch.length;
        } else {
          insertedCount += batch.length;
        }
      }
    } else if (type === 'specs') {
      console.log(`Importing ${data.length} specs...`);
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize) as SpecRow[];
        const formatted = batch.map(row => ({
          spec_id: row.specID,
          style_id: row.styleID,
          part_number: row.partNumber || null,
          brand_name: row.brandName || null,
          style_name: row.styleName || null,
          size_name: row.sizeName || null,
          size_order: row.sizeOrder || null,
          spec_name: row.specName || '',
          value: row.value || null,
        }));

        const { error } = await supabase
          .from('catalog_specs')
          .upsert(formatted, { onConflict: 'spec_id' });

        if (error) {
          console.error('Batch insert error:', error);
          errorCount += batch.length;
        } else {
          insertedCount += batch.length;
        }
      }
    } else if (type === 'categories') {
      console.log(`Importing ${data.length} categories...`);
      
      const formatted = (data as CategoryRow[]).map(row => ({
        category_id: row.categoryID,
        name: row.name || '',
        url: row.url || null,
        image: row.image || null,
      }));

      const { error } = await supabase
        .from('catalog_categories')
        .upsert(formatted, { onConflict: 'category_id' });

      if (error) {
        console.error('Categories insert error:', error);
        errorCount = data.length;
      } else {
        insertedCount = data.length;
      }
    }

    console.log(`Import complete: ${insertedCount} inserted, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type,
        inserted: insertedCount,
        errors: errorCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-catalog:', error);
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
