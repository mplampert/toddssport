import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, data } = await req.json();

    if (!type || !data || !Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: 'Missing type or data array' }),
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
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
