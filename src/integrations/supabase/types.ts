export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          order_index: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          order_index?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          order_index?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          category: string | null
          champro_session_id: string
          created_at: string
          id: string
          lead_time: string
          product_master: string | null
          quantity: number
          session_id: string
          sport_slug: string
          sport_title: string | null
          team_name: string | null
          unit_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          champro_session_id: string
          created_at?: string
          id?: string
          lead_time?: string
          product_master?: string | null
          quantity?: number
          session_id: string
          sport_slug: string
          sport_title?: string | null
          team_name?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          champro_session_id?: string
          created_at?: string
          id?: string
          lead_time?: string
          product_master?: string | null
          quantity?: number
          session_id?: string
          sport_slug?: string
          sport_title?: string | null
          team_name?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      catalog_categories: {
        Row: {
          category_id: number
          created_at: string
          id: number
          image: string | null
          name: string
          url: string | null
        }
        Insert: {
          category_id: number
          created_at?: string
          id?: number
          image?: string | null
          name: string
          url?: string | null
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: number
          image?: string | null
          name?: string
          url?: string | null
        }
        Relationships: []
      }
      catalog_specs: {
        Row: {
          brand_name: string | null
          created_at: string
          id: number
          part_number: string | null
          size_name: string | null
          size_order: string | null
          spec_id: number
          spec_name: string
          style_id: number
          style_name: string | null
          value: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          id?: number
          part_number?: string | null
          size_name?: string | null
          size_order?: string | null
          spec_id: number
          spec_name: string
          style_id: number
          style_name?: string | null
          value?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          id?: number
          part_number?: string | null
          size_name?: string | null
          size_order?: string | null
          spec_id?: number
          spec_name?: string
          style_id?: number
          style_name?: string | null
          value?: string | null
        }
        Relationships: []
      }
      catalog_styles: {
        Row: {
          base_category: string | null
          brand_image: string | null
          brand_name: string
          catalog_page_number: number | null
          categories: string | null
          companion_group: number | null
          comparable_group: number | null
          created_at: string
          description: string | null
          id: number
          is_active: boolean | null
          is_featured: boolean | null
          new_style: boolean | null
          part_number: string | null
          prop65_chemicals: string | null
          style_id: number
          style_image: string | null
          style_name: string
          sustainable_style: boolean | null
          title: string | null
          unique_style_name: string | null
          updated_at: string
        }
        Insert: {
          base_category?: string | null
          brand_image?: string | null
          brand_name: string
          catalog_page_number?: number | null
          categories?: string | null
          companion_group?: number | null
          comparable_group?: number | null
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean | null
          is_featured?: boolean | null
          new_style?: boolean | null
          part_number?: string | null
          prop65_chemicals?: string | null
          style_id: number
          style_image?: string | null
          style_name: string
          sustainable_style?: boolean | null
          title?: string | null
          unique_style_name?: string | null
          updated_at?: string
        }
        Update: {
          base_category?: string | null
          brand_image?: string | null
          brand_name?: string
          catalog_page_number?: number | null
          categories?: string | null
          companion_group?: number | null
          comparable_group?: number | null
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean | null
          is_featured?: boolean | null
          new_style?: boolean | null
          part_number?: string | null
          prop65_chemicals?: string | null
          style_id?: number
          style_image?: string | null
          style_name?: string
          sustainable_style?: boolean | null
          title?: string | null
          unique_style_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalog_transit_days: {
        Row: {
          created_at: string
          id: number
          ship_from: string
          ship_to: string
          transit_days: number
        }
        Insert: {
          created_at?: string
          id?: number
          ship_from: string
          ship_to: string
          transit_days: number
        }
        Update: {
          created_at?: string
          id?: number
          ship_from?: string
          ship_to?: string
          transit_days?: number
        }
        Relationships: []
      }
      catalogs: {
        Row: {
          catalog_url: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          catalog_url: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          catalog_url?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      champro_orders: {
        Row: {
          champro_order_number: string | null
          created_at: string
          customer_email: string | null
          id: string
          needs_manual_champro: boolean
          order_type: Database["public"]["Enums"]["champro_order_type"]
          po: string
          request_payload: Json
          response_payload: Json | null
          sent_to_champro: boolean
          session_id: string | null
          status: string
          sub_order_ids: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          champro_order_number?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          needs_manual_champro?: boolean
          order_type: Database["public"]["Enums"]["champro_order_type"]
          po: string
          request_payload: Json
          response_payload?: Json | null
          sent_to_champro?: boolean
          session_id?: string | null
          status?: string
          sub_order_ids?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          champro_order_number?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          needs_manual_champro?: boolean
          order_type?: Database["public"]["Enums"]["champro_order_type"]
          po?: string
          request_payload?: Json
          response_payload?: Json | null
          sent_to_champro?: boolean
          session_id?: string | null
          status?: string
          sub_order_ids?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      champro_pricing_settings: {
        Row: {
          created_at: string
          id: string
          markup_percent: number
          rush_percent: number
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          markup_percent?: number
          rush_percent?: number
          scope: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          markup_percent?: number
          rush_percent?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      champro_products: {
        Row: {
          category: string
          created_at: string
          default_lead_time_name: string | null
          has_sizes: boolean
          id: string
          moq_custom: number
          msrp: number | null
          name: string
          parent_category: string | null
          product_master: string
          sku: string | null
          sport: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_lead_time_name?: string | null
          has_sizes?: boolean
          id?: string
          moq_custom?: number
          msrp?: number | null
          name: string
          parent_category?: string | null
          product_master: string
          sku?: string | null
          sport: string
          type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_lead_time_name?: string | null
          has_sizes?: boolean
          id?: string
          moq_custom?: number
          msrp?: number | null
          name?: string
          parent_category?: string | null
          product_master?: string
          sku?: string | null
          sport?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      champro_wholesale: {
        Row: {
          base_cost: number
          champro_product_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          base_cost: number
          champro_product_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          base_cost?: number
          champro_product_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "champro_wholesale_champro_product_id_fkey"
            columns: ["champro_product_id"]
            isOneToOne: true
            referencedRelation: "champro_products"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_leads: {
        Row: {
          additional_info: string | null
          budget_range: string | null
          company_name: string
          created_at: string
          email: string
          id: string
          industry: string | null
          interested_in_apparel: boolean | null
          interested_in_fulfillment: boolean | null
          interested_in_promo_products: boolean | null
          interested_in_web_store: boolean | null
          internal_notes: string | null
          name: string
          number_of_employees: string | null
          phone: string | null
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          budget_range?: string | null
          company_name: string
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          interested_in_apparel?: boolean | null
          interested_in_fulfillment?: boolean | null
          interested_in_promo_products?: boolean | null
          interested_in_web_store?: boolean | null
          internal_notes?: string | null
          name: string
          number_of_employees?: string | null
          phone?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          budget_range?: string | null
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          interested_in_apparel?: boolean | null
          interested_in_fulfillment?: boolean | null
          interested_in_promo_products?: boolean | null
          interested_in_web_store?: boolean | null
          internal_notes?: string | null
          name?: string
          number_of_employees?: string | null
          phone?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fanwear_leads: {
        Row: {
          additional_info: string | null
          approximate_size: string | null
          created_at: string
          email: string
          id: string
          interested_in_fundraising: boolean | null
          internal_notes: string | null
          launch_date: string | null
          name: string
          organization: string
          phone: string | null
          role: string
          sports_or_groups: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          approximate_size?: string | null
          created_at?: string
          email: string
          id?: string
          interested_in_fundraising?: boolean | null
          internal_notes?: string | null
          launch_date?: string | null
          name: string
          organization: string
          phone?: string | null
          role: string
          sports_or_groups?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          approximate_size?: string | null
          created_at?: string
          email?: string
          id?: string
          interested_in_fundraising?: boolean | null
          internal_notes?: string | null
          launch_date?: string | null
          name?: string
          organization?: string
          phone?: string | null
          role?: string
          sports_or_groups?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      flyers: {
        Row: {
          bullet_points: string[] | null
          client_address: string | null
          client_city: string | null
          client_contact_name: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          client_state: string | null
          client_zip: string | null
          created_at: string
          fundraising_line: string | null
          id: string
          image_url: string | null
          notes_cta: string | null
          pdf_url: string | null
          price_line: string | null
          product_name: string
          products: Json | null
          rep_id: string | null
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          bullet_points?: string[] | null
          client_address?: string | null
          client_city?: string | null
          client_contact_name?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_state?: string | null
          client_zip?: string | null
          created_at?: string
          fundraising_line?: string | null
          id?: string
          image_url?: string | null
          notes_cta?: string | null
          pdf_url?: string | null
          price_line?: string | null
          product_name: string
          products?: Json | null
          rep_id?: string | null
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          bullet_points?: string[] | null
          client_address?: string | null
          client_city?: string | null
          client_contact_name?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_state?: string | null
          client_zip?: string | null
          created_at?: string
          fundraising_line?: string | null
          id?: string
          image_url?: string | null
          notes_cta?: string | null
          pdf_url?: string | null
          price_line?: string | null
          product_name?: string
          products?: Json | null
          rep_id?: string | null
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyers_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
        ]
      }
      lookbook_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          msrp: number | null
          name: string
          sort_order: number
          sport: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          msrp?: number | null
          name: string
          sort_order?: number
          sport: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          msrp?: number | null
          name?: string
          sort_order?: number
          sport?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_leads: {
        Row: {
          company_name: string
          created_at: string
          email: string
          id: string
          interested_in_branded_merch: boolean | null
          interested_in_company_store: boolean | null
          interested_in_employee_gifts: boolean | null
          interested_in_event_kits: boolean | null
          interested_in_other: boolean | null
          internal_notes: string | null
          name: string
          phone: string | null
          project_details: string | null
          quantity_and_budget: string | null
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          id?: string
          interested_in_branded_merch?: boolean | null
          interested_in_company_store?: boolean | null
          interested_in_employee_gifts?: boolean | null
          interested_in_event_kits?: boolean | null
          interested_in_other?: boolean | null
          internal_notes?: string | null
          name: string
          phone?: string | null
          project_details?: string | null
          quantity_and_budget?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          interested_in_branded_merch?: boolean | null
          interested_in_company_store?: boolean | null
          interested_in_employee_gifts?: boolean | null
          interested_in_event_kits?: boolean | null
          interested_in_other?: boolean | null
          internal_notes?: string | null
          name?: string
          phone?: string | null
          project_details?: string | null
          quantity_and_budget?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string | null
          deadline: string | null
          email: string
          estimated_quantity: string | null
          extra_details: string | null
          id: string
          internal_notes: string | null
          logo_file_url: string | null
          name: string
          needs_corporate_apparel: boolean | null
          needs_other: boolean | null
          needs_promotional_products: boolean | null
          needs_spirit_wear: boolean | null
          needs_uniforms: boolean | null
          organization: string
          organization_type: string
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          email: string
          estimated_quantity?: string | null
          extra_details?: string | null
          id?: string
          internal_notes?: string | null
          logo_file_url?: string | null
          name: string
          needs_corporate_apparel?: boolean | null
          needs_other?: boolean | null
          needs_promotional_products?: boolean | null
          needs_spirit_wear?: boolean | null
          needs_uniforms?: boolean | null
          organization: string
          organization_type: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          email?: string
          estimated_quantity?: string | null
          extra_details?: string | null
          id?: string
          internal_notes?: string | null
          logo_file_url?: string | null
          name?: string
          needs_corporate_apparel?: boolean | null
          needs_other?: boolean | null
          needs_promotional_products?: boolean | null
          needs_spirit_wear?: boolean | null
          needs_uniforms?: boolean | null
          organization?: string
          organization_type?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reps: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          territory_type: string
          territory_value: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          territory_type: string
          territory_value: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          territory_type?: string
          territory_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          image_url: string | null
          long_description: string | null
          name: string
          order_index: number | null
          short_description: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          name: string
          order_index?: number | null
          short_description: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          name?: string
          order_index?: number | null
          short_description?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      team_store_leads: {
        Row: {
          additional_info: string | null
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          launch_date: string | null
          level: string
          name: string
          number_of_teams: string | null
          organization: string
          phone: string | null
          sport: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          launch_date?: string | null
          level: string
          name: string
          number_of_teams?: string | null
          organization: string
          phone?: string | null
          sport: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          launch_date?: string | null
          level?: string
          name?: string
          number_of_teams?: string | null
          organization?: string
          phone?: string | null
          sport?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          order_index: number | null
          quote: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          order_index?: number | null
          quote: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          order_index?: number | null
          quote?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      uniform_cards: {
        Row: {
          created_at: string
          cta_text: string | null
          description: string
          featured_label: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          slug: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          description: string
          featured_label?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          slug: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          description?: string
          featured_label?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          slug?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      who_we_serve: {
        Row: {
          created_at: string | null
          description: string
          icon: string | null
          id: string
          order_index: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      champro_order_type: "CUSTOM" | "STOCK"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      champro_order_type: ["CUSTOM", "STOCK"],
    },
  },
} as const
