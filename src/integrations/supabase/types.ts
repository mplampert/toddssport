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
      admin_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          customer_id: string | null
          error: string | null
          id: string
          order_id: string | null
          recipient_address: string
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          recipient_address: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          recipient_address?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
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
          team_store_id: string | null
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
          team_store_id?: string | null
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
          team_store_id?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
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
      customer_channels: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          email_enabled_transactional: boolean
          id: string
          phone: string | null
          sms_enabled_transactional: boolean
          sms_opt_out_keyword: string | null
          sms_opted_in_at: string | null
          sms_opted_out: boolean
          sms_opted_out_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          email_enabled_transactional?: boolean
          id?: string
          phone?: string | null
          sms_enabled_transactional?: boolean
          sms_opt_out_keyword?: string | null
          sms_opted_in_at?: string | null
          sms_opted_out?: boolean
          sms_opted_out_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          email_enabled_transactional?: boolean
          id?: string
          phone?: string | null
          sms_enabled_transactional?: boolean
          sms_opt_out_keyword?: string | null
          sms_opted_in_at?: string | null
          sms_opted_out?: boolean
          sms_opted_out_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_channels_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      decoration_placements: {
        Row: {
          code: string
          created_at: string
          default_scale: number
          default_x: number
          default_y: number
          garment_type: string
          id: string
          is_active: boolean
          label: string
          max_height_in: number
          max_width_in: number
          sort_order: number
          updated_at: string
          view: string
        }
        Insert: {
          code: string
          created_at?: string
          default_scale?: number
          default_x?: number
          default_y?: number
          garment_type?: string
          id?: string
          is_active?: boolean
          label: string
          max_height_in: number
          max_width_in: number
          sort_order?: number
          updated_at?: string
          view?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_scale?: number
          default_x?: number
          default_y?: number
          garment_type?: string
          id?: string
          is_active?: boolean
          label?: string
          max_height_in?: number
          max_width_in?: number
          sort_order?: number
          updated_at?: string
          view?: string
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
      fulfillment_batches: {
        Row: {
          batch_type: string
          created_at: string
          cutoff_datetime: string
          id: string
          notes: string | null
          order_ids: string[]
          status: string
          team_store_id: string
          updated_at: string
        }
        Insert: {
          batch_type?: string
          created_at?: string
          cutoff_datetime?: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          status?: string
          team_store_id: string
          updated_at?: string
        }
        Update: {
          batch_type?: string
          created_at?: string
          cutoff_datetime?: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          status?: string
          team_store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_batches_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_batches_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraising_payouts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string
          team_store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          team_store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          team_store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraising_payouts_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraising_payouts_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      global_notification_settings: {
        Row: {
          created_at: string
          default_email_enabled: boolean
          default_sms_enabled: boolean
          email_from_address: string
          email_reply_to: string | null
          email_sending_domain: string | null
          id: string
          sms_compliance_message: string | null
          sms_messaging_service_sid: string | null
          sms_sender_phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_email_enabled?: boolean
          default_sms_enabled?: boolean
          email_from_address?: string
          email_reply_to?: string | null
          email_sending_domain?: string | null
          id?: string
          sms_compliance_message?: string | null
          sms_messaging_service_sid?: string | null
          sms_sender_phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_email_enabled?: boolean
          default_sms_enabled?: boolean
          email_from_address?: string
          email_reply_to?: string | null
          email_sending_domain?: string | null
          id?: string
          sms_compliance_message?: string | null
          sms_messaging_service_sid?: string | null
          sms_sender_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inbound_messages: {
        Row: {
          body: string
          created_at: string
          customer_id: string | null
          from_phone: string
          id: string
          is_opt_in: boolean
          is_opt_out: boolean
          order_id: string | null
          processed: boolean
          twilio_message_sid: string | null
        }
        Insert: {
          body: string
          created_at?: string
          customer_id?: string | null
          from_phone: string
          id?: string
          is_opt_in?: boolean
          is_opt_out?: boolean
          order_id?: string | null
          processed?: boolean
          twilio_message_sid?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string | null
          from_phone?: string
          id?: string
          is_opt_in?: boolean
          is_opt_out?: boolean
          order_id?: string | null
          processed?: boolean
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      notification_events: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          error: string | null
          id: string
          max_retries: number
          order_id: string | null
          payload_snapshot: Json | null
          phone_selection_reason: string | null
          recipient_address: string
          retry_count: number
          sent_at: string | null
          status: string
          template_key: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          max_retries?: number
          order_id?: string | null
          payload_snapshot?: Json | null
          phone_selection_reason?: string | null
          recipient_address: string
          retry_count?: number
          sent_at?: string | null
          status?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          max_retries?: number
          order_id?: string | null
          payload_snapshot?: Json | null
          phone_selection_reason?: string | null
          recipient_address?: string
          retry_count?: number
          sent_at?: string | null
          status?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reminders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          scheduled_at: string
          sent_notification_id: string | null
          status: string
          template_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          scheduled_at: string
          sent_notification_id?: string | null
          status?: string
          template_key: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          scheduled_at?: string
          sent_notification_id?: string | null
          status?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reminders_sent_notification_id_fkey"
            columns: ["sent_notification_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          email_enabled: boolean
          id: string
          is_active: boolean
          name: string
          sms_enabled: boolean
          subject: string | null
          template_key: string
          updated_at: string
          variables: Json | null
          version: number
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          is_active?: boolean
          name: string
          sms_enabled?: boolean
          subject?: string | null
          template_key: string
          updated_at?: string
          variables?: Json | null
          version?: number
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          is_active?: boolean
          name?: string
          sms_enabled?: boolean
          subject?: string | null
          template_key?: string
          updated_at?: string
          variables?: Json | null
          version?: number
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
      promo_media: {
        Row: {
          color: string | null
          created_at: string
          decoration_method: string | null
          height: number | null
          id: string
          is_primary: boolean
          location: string | null
          media_type: string
          promo_product_id: string
          url: string
          width: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          decoration_method?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean
          location?: string | null
          media_type?: string
          promo_product_id: string
          url: string
          width?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          decoration_method?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean
          location?: string | null
          media_type?: string
          promo_product_id?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_media_promo_product_id_fkey"
            columns: ["promo_product_id"]
            isOneToOne: false
            referencedRelation: "promo_products"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_pricing: {
        Row: {
          created_at: string
          currency: string
          discount_code: string | null
          fob_id: string | null
          fob_postal_code: string | null
          id: string
          last_synced_at: string | null
          price: number | null
          price_effective_date: string | null
          price_expiry_date: string | null
          price_type: string | null
          promo_product_id: string
          quantity_max: number | null
          quantity_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          discount_code?: string | null
          fob_id?: string | null
          fob_postal_code?: string | null
          id?: string
          last_synced_at?: string | null
          price?: number | null
          price_effective_date?: string | null
          price_expiry_date?: string | null
          price_type?: string | null
          promo_product_id: string
          quantity_max?: number | null
          quantity_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          discount_code?: string | null
          fob_id?: string | null
          fob_postal_code?: string | null
          id?: string
          last_synced_at?: string | null
          price?: number | null
          price_effective_date?: string | null
          price_expiry_date?: string | null
          price_type?: string | null
          promo_product_id?: string
          quantity_max?: number | null
          quantity_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_pricing_promo_product_id_fkey"
            columns: ["promo_product_id"]
            isOneToOne: false
            referencedRelation: "promo_products"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_products: {
        Row: {
          created_at: string
          description: string | null
          export_date: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          last_synced_at: string | null
          price_type: string | null
          product_brand: string | null
          product_category: string | null
          product_id: string
          product_keywords: string[] | null
          product_name: string
          product_sub_category: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          export_date?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          last_synced_at?: string | null
          price_type?: string | null
          product_brand?: string | null
          product_category?: string | null
          product_id: string
          product_keywords?: string[] | null
          product_name: string
          product_sub_category?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          export_date?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          last_synced_at?: string | null
          price_type?: string | null
          product_brand?: string | null
          product_category?: string | null
          product_id?: string
          product_keywords?: string[] | null
          product_name?: string
          product_sub_category?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "promo_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_suppliers: {
        Row: {
          api_base_url: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
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
      size_charts: {
        Row: {
          brand: string | null
          category: string | null
          content_html: string | null
          content_type: string
          created_at: string
          file_url: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          content_html?: string | null
          content_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          content_html?: string | null
          content_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_logo_variants: {
        Row: {
          background_rule: string
          colorway: string
          created_at: string
          dtf_enabled: boolean
          embroidery_enabled: boolean
          file_type: string
          file_url: string
          id: string
          is_default: boolean
          name: string
          original_file_url: string | null
          screen_print_enabled: boolean
          store_logo_id: string
          updated_at: string
        }
        Insert: {
          background_rule?: string
          colorway?: string
          created_at?: string
          dtf_enabled?: boolean
          embroidery_enabled?: boolean
          file_type?: string
          file_url: string
          id?: string
          is_default?: boolean
          name: string
          original_file_url?: string | null
          screen_print_enabled?: boolean
          store_logo_id: string
          updated_at?: string
        }
        Update: {
          background_rule?: string
          colorway?: string
          created_at?: string
          dtf_enabled?: boolean
          embroidery_enabled?: boolean
          file_type?: string
          file_url?: string
          id?: string
          is_default?: boolean
          name?: string
          original_file_url?: string | null
          screen_print_enabled?: boolean
          store_logo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_logo_variants_store_logo_id_fkey"
            columns: ["store_logo_id"]
            isOneToOne: false
            referencedRelation: "store_logos"
            referencedColumns: ["id"]
          },
        ]
      }
      store_logos: {
        Row: {
          created_at: string
          decoration_type: string
          file_type: string
          file_url: string
          id: string
          is_primary: boolean
          method: string
          name: string
          original_file_url: string | null
          placement: string | null
          team_store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decoration_type?: string
          file_type?: string
          file_url: string
          id?: string
          is_primary?: boolean
          method: string
          name: string
          original_file_url?: string | null
          placement?: string | null
          team_store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decoration_type?: string
          file_type?: string
          file_url?: string
          id?: string
          is_primary?: boolean
          method?: string
          name?: string
          original_file_url?: string | null
          placement?: string | null
          team_store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_logos_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_logos_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roster_players: {
        Row: {
          birth_year: number | null
          claimed_at: string | null
          claimed_by_email: string | null
          claimed_order_item_id: string | null
          created_at: string
          grad_year: number | null
          guardian_email: string | null
          guardian_name: string | null
          id: string
          jersey_number: string
          notes: string | null
          player_email: string | null
          player_first_name: string
          player_last_name: string
          player_phone: string | null
          position: string | null
          status: Database["public"]["Enums"]["roster_player_status"]
          team_roster_id: string
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          claimed_at?: string | null
          claimed_by_email?: string | null
          claimed_order_item_id?: string | null
          created_at?: string
          grad_year?: number | null
          guardian_email?: string | null
          guardian_name?: string | null
          id?: string
          jersey_number: string
          notes?: string | null
          player_email?: string | null
          player_first_name: string
          player_last_name: string
          player_phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["roster_player_status"]
          team_roster_id: string
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          claimed_at?: string | null
          claimed_by_email?: string | null
          claimed_order_item_id?: string | null
          created_at?: string
          grad_year?: number | null
          guardian_email?: string | null
          guardian_name?: string | null
          id?: string
          jersey_number?: string
          notes?: string | null
          player_email?: string | null
          player_first_name?: string
          player_last_name?: string
          player_phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["roster_player_status"]
          team_roster_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roster_players_team_roster_id_fkey"
            columns: ["team_roster_id"]
            isOneToOne: false
            referencedRelation: "team_rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      team_rosters: {
        Row: {
          created_at: string
          id: string
          name: string
          season: string | null
          sport: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          season?: string | null
          sport?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          season?: string | null
          sport?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_store_category_overrides: {
        Row: {
          category_id: string | null
          created_at: string
          display_name: string | null
          id: string
          is_custom: boolean
          is_hidden: boolean
          sort_order: number
          team_store_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_custom?: boolean
          is_hidden?: boolean
          sort_order?: number
          team_store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_custom?: boolean
          is_hidden?: boolean
          sort_order?: number
          team_store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_category_overrides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "team_store_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_category_overrides_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_category_overrides_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_decoration_price_defaults: {
        Row: {
          created_at: string
          prices: Json
          pricing_mode: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          prices?: Json
          pricing_mode?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          prices?: Json
          pricing_mode?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_decoration_price_defaults_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_decoration_price_defaults_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_item_logos: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_primary: boolean
          position: string | null
          role: string
          rotation: number
          scale: number
          sort_order: number
          store_logo_id: string
          store_logo_variant_id: string | null
          team_store_item_id: string
          variant_color: string | null
          variant_size: string | null
          view: string
          x: number
          y: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: string | null
          role?: string
          rotation?: number
          scale?: number
          sort_order?: number
          store_logo_id: string
          store_logo_variant_id?: string | null
          team_store_item_id: string
          variant_color?: string | null
          variant_size?: string | null
          view?: string
          x?: number
          y?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: string | null
          role?: string
          rotation?: number
          scale?: number
          sort_order?: number
          store_logo_id?: string
          store_logo_variant_id?: string | null
          team_store_item_id?: string
          variant_color?: string | null
          variant_size?: string | null
          view?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_store_item_logos_store_logo_id_fkey"
            columns: ["store_logo_id"]
            isOneToOne: false
            referencedRelation: "store_logos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_item_logos_store_logo_variant_id_fkey"
            columns: ["store_logo_variant_id"]
            isOneToOne: false
            referencedRelation: "store_logo_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_item_logos_team_store_item_id_fkey"
            columns: ["team_store_item_id"]
            isOneToOne: false
            referencedRelation: "team_store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_item_text_layers: {
        Row: {
          active: boolean
          alignment: string
          created_at: string
          custom_field_id: string | null
          fill_color: string
          font_family: string
          font_size_px: number
          font_weight: string
          id: string
          letter_spacing: number
          line_height: number
          outline_color: string | null
          outline_thickness: number
          rotation: number
          scale: number
          sort_order: number
          source: string
          static_text: string | null
          team_store_item_id: string
          text_pattern: string | null
          text_transform: string
          updated_at: string
          variant_color: string | null
          view: string
          x: number
          y: number
          z_index: number
        }
        Insert: {
          active?: boolean
          alignment?: string
          created_at?: string
          custom_field_id?: string | null
          fill_color?: string
          font_family?: string
          font_size_px?: number
          font_weight?: string
          id?: string
          letter_spacing?: number
          line_height?: number
          outline_color?: string | null
          outline_thickness?: number
          rotation?: number
          scale?: number
          sort_order?: number
          source?: string
          static_text?: string | null
          team_store_item_id: string
          text_pattern?: string | null
          text_transform?: string
          updated_at?: string
          variant_color?: string | null
          view?: string
          x?: number
          y?: number
          z_index?: number
        }
        Update: {
          active?: boolean
          alignment?: string
          created_at?: string
          custom_field_id?: string | null
          fill_color?: string
          font_family?: string
          font_size_px?: number
          font_weight?: string
          id?: string
          letter_spacing?: number
          line_height?: number
          outline_color?: string | null
          outline_thickness?: number
          rotation?: number
          scale?: number
          sort_order?: number
          source?: string
          static_text?: string | null
          team_store_item_id?: string
          text_pattern?: string | null
          text_transform?: string
          updated_at?: string
          variant_color?: string | null
          view?: string
          x?: number
          y?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_store_item_text_layers_team_store_item_id_fkey"
            columns: ["team_store_item_id"]
            isOneToOne: false
            referencedRelation: "team_store_products"
            referencedColumns: ["id"]
          },
        ]
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
      team_store_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          is_popup: boolean
          location: string
          popup_dismiss_days: number | null
          product_id: string | null
          sort_order: number
          style_variant: string
          team_store_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_popup?: boolean
          location?: string
          popup_dismiss_days?: number | null
          product_id?: string | null
          sort_order?: number
          style_variant?: string
          team_store_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_popup?: boolean
          location?: string
          popup_dismiss_days?: number | null
          product_id?: string | null
          sort_order?: number
          style_variant?: string
          team_store_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "team_store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_messages_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_messages_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_order_items: {
        Row: {
          catalog_product_name: string | null
          catalog_sku: string | null
          created_at: string
          decoration_snapshot: Json | null
          id: string
          line_total: number
          order_id: string
          personalization_name: string | null
          personalization_number: string | null
          pricing_snapshot: Json | null
          product_name_snapshot: string
          quantity: number
          store_display_name: string | null
          team_roster_player_id: string | null
          team_store_product_id: string | null
          unit_price: number
          updated_at: string
          variant_snapshot: Json | null
        }
        Insert: {
          catalog_product_name?: string | null
          catalog_sku?: string | null
          created_at?: string
          decoration_snapshot?: Json | null
          id?: string
          line_total?: number
          order_id: string
          personalization_name?: string | null
          personalization_number?: string | null
          pricing_snapshot?: Json | null
          product_name_snapshot: string
          quantity?: number
          store_display_name?: string | null
          team_roster_player_id?: string | null
          team_store_product_id?: string | null
          unit_price?: number
          updated_at?: string
          variant_snapshot?: Json | null
        }
        Update: {
          catalog_product_name?: string | null
          catalog_sku?: string | null
          created_at?: string
          decoration_snapshot?: Json | null
          id?: string
          line_total?: number
          order_id?: string
          personalization_name?: string | null
          personalization_number?: string | null
          pricing_snapshot?: Json | null
          product_name_snapshot?: string
          quantity?: number
          store_display_name?: string | null
          team_roster_player_id?: string | null
          team_store_product_id?: string | null
          unit_price?: number
          updated_at?: string
          variant_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "team_store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "team_store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_order_items_team_roster_player_id_fkey"
            columns: ["team_roster_player_id"]
            isOneToOne: false
            referencedRelation: "team_roster_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_order_items_team_store_product_id_fkey"
            columns: ["team_store_product_id"]
            isOneToOne: false
            referencedRelation: "team_store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_orders: {
        Row: {
          billing_address: Json | null
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          billing_snapshot: Json | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_instructions: string | null
          discount_total: number
          fulfillment_method: string
          fulfillment_snapshot: Json | null
          fulfillment_status: string
          id: string
          internal_notes: string | null
          is_sample: boolean
          order_number: string
          payment_intent_id: string | null
          payment_status: string
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_location_id: string | null
          preferred_sms_phone: string | null
          promo_code_id: string | null
          promo_snapshot: Json | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_sms_opt_in: boolean
          recipient_snapshot: Json | null
          shipping_address1: string | null
          shipping_address2: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_state: string | null
          shipping_total: number
          shipping_zip: string | null
          source: string
          status: string
          store_id: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          billing_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          discount_total?: number
          fulfillment_method?: string
          fulfillment_snapshot?: Json | null
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          is_sample?: boolean
          order_number: string
          payment_intent_id?: string | null
          payment_status?: string
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_location_id?: string | null
          preferred_sms_phone?: string | null
          promo_code_id?: string | null
          promo_snapshot?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_sms_opt_in?: boolean
          recipient_snapshot?: Json | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_total?: number
          shipping_zip?: string | null
          source?: string
          status?: string
          store_id: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          billing_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          discount_total?: number
          fulfillment_method?: string
          fulfillment_snapshot?: Json | null
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          is_sample?: boolean
          order_number?: string
          payment_intent_id?: string | null
          payment_status?: string
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_location_id?: string | null
          preferred_sms_phone?: string | null
          promo_code_id?: string | null
          promo_snapshot?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_sms_opt_in?: boolean
          recipient_snapshot?: Json | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_total?: number
          shipping_zip?: string | null
          source?: string
          status?: string
          store_id?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "team_store_promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          method: string
          note: string | null
          order_id: string
          provider: string | null
          provider_ref: string | null
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id: string
          provider?: string | null
          provider_ref?: string | null
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id?: string
          provider?: string | null
          provider_ref?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "team_store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_personalization_defaults: {
        Row: {
          created_at: string
          custom_fields: Json
          enable_name: boolean
          enable_number: boolean
          instructions: string | null
          name_label: string
          name_max_length: number
          name_price: number
          name_required: boolean
          number_label: string
          number_max_length: number
          number_price: number
          number_required: boolean
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json
          enable_name?: boolean
          enable_number?: boolean
          instructions?: string | null
          name_label?: string
          name_max_length?: number
          name_price?: number
          name_required?: boolean
          number_label?: string
          number_max_length?: number
          number_price?: number
          number_required?: boolean
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json
          enable_name?: boolean
          enable_number?: boolean
          instructions?: string | null
          name_label?: string
          name_max_length?: number
          name_price?: number
          name_required?: boolean
          number_label?: string
          number_max_length?: number
          number_price?: number
          number_required?: boolean
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_personalization_defaults_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_personalization_defaults_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_product_variant_images: {
        Row: {
          color: string
          created_at: string
          id: string
          image_type: string
          image_url: string
          is_primary: boolean
          sort_order: number
          team_store_product_id: string
          updated_at: string
          view: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          image_type?: string
          image_url: string
          is_primary?: boolean
          sort_order?: number
          team_store_product_id: string
          updated_at?: string
          view?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          image_type?: string
          image_url?: string
          is_primary?: boolean
          sort_order?: number
          team_store_product_id?: string
          updated_at?: string
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_product_variant_images_team_store_product_id_fkey"
            columns: ["team_store_product_id"]
            isOneToOne: false
            referencedRelation: "team_store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_products: {
        Row: {
          active: boolean
          allowed_colors: Json | null
          category_id: string | null
          created_at: string
          decoration_prices_override: Json | null
          decoration_pricing_override_enabled: boolean
          description_override: string | null
          display_color: string | null
          display_name: string | null
          dtf_enabled: boolean
          embroidery_enabled: boolean
          extra_image_types: string[]
          extra_image_urls: Json | null
          fundraising_amount_per_unit: number | null
          fundraising_enabled: boolean
          fundraising_percentage: number | null
          id: string
          internal_notes: string | null
          notes: string | null
          number_lock_rule: Database["public"]["Enums"]["number_lock_rule"]
          personalization_config: Json | null
          personalization_enabled: boolean
          personalization_override_enabled: boolean
          personalization_price: number | null
          personalization_settings: Json | null
          price_override: number | null
          primary_image_type: string
          primary_image_url: string | null
          screen_print_enabled: boolean
          short_description_override: string | null
          size_chart_display_mode: string
          size_chart_override_id: string | null
          size_upcharges: Json | null
          sort_order: number
          store_category_override_id: string | null
          style_id: number
          team_roster_id: string | null
          team_store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_colors?: Json | null
          category_id?: string | null
          created_at?: string
          decoration_prices_override?: Json | null
          decoration_pricing_override_enabled?: boolean
          description_override?: string | null
          display_color?: string | null
          display_name?: string | null
          dtf_enabled?: boolean
          embroidery_enabled?: boolean
          extra_image_types?: string[]
          extra_image_urls?: Json | null
          fundraising_amount_per_unit?: number | null
          fundraising_enabled?: boolean
          fundraising_percentage?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          number_lock_rule?: Database["public"]["Enums"]["number_lock_rule"]
          personalization_config?: Json | null
          personalization_enabled?: boolean
          personalization_override_enabled?: boolean
          personalization_price?: number | null
          personalization_settings?: Json | null
          price_override?: number | null
          primary_image_type?: string
          primary_image_url?: string | null
          screen_print_enabled?: boolean
          short_description_override?: string | null
          size_chart_display_mode?: string
          size_chart_override_id?: string | null
          size_upcharges?: Json | null
          sort_order?: number
          store_category_override_id?: string | null
          style_id: number
          team_roster_id?: string | null
          team_store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_colors?: Json | null
          category_id?: string | null
          created_at?: string
          decoration_prices_override?: Json | null
          decoration_pricing_override_enabled?: boolean
          description_override?: string | null
          display_color?: string | null
          display_name?: string | null
          dtf_enabled?: boolean
          embroidery_enabled?: boolean
          extra_image_types?: string[]
          extra_image_urls?: Json | null
          fundraising_amount_per_unit?: number | null
          fundraising_enabled?: boolean
          fundraising_percentage?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          number_lock_rule?: Database["public"]["Enums"]["number_lock_rule"]
          personalization_config?: Json | null
          personalization_enabled?: boolean
          personalization_override_enabled?: boolean
          personalization_price?: number | null
          personalization_settings?: Json | null
          price_override?: number | null
          primary_image_type?: string
          primary_image_url?: string | null
          screen_print_enabled?: boolean
          short_description_override?: string | null
          size_chart_display_mode?: string
          size_chart_override_id?: string | null
          size_upcharges?: Json | null
          sort_order?: number
          store_category_override_id?: string | null
          style_id?: number
          team_roster_id?: string | null
          team_store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "team_store_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_products_size_chart_override_id_fkey"
            columns: ["size_chart_override_id"]
            isOneToOne: false
            referencedRelation: "size_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_products_store_category_override_id_fkey"
            columns: ["store_category_override_id"]
            isOneToOne: false
            referencedRelation: "team_store_category_overrides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_products_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "catalog_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_products_team_roster_id_fkey"
            columns: ["team_roster_id"]
            isOneToOne: false
            referencedRelation: "team_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_products_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_products_team_store_id_fkey"
            columns: ["team_store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_promo_codes: {
        Row: {
          active: boolean
          allowed_email_domains: Json | null
          allowed_emails: Json | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_redemptions_per_email: number
          max_redemptions_total: number | null
          starts_at: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_email_domains?: Json | null
          allowed_emails?: Json | null
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_redemptions_per_email?: number
          max_redemptions_total?: number | null
          starts_at?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_email_domains?: Json | null
          allowed_emails?: Json | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_redemptions_per_email?: number
          max_redemptions_total?: number | null
          starts_at?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_promo_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "team_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_promo_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "team_stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_promo_redemptions: {
        Row: {
          discount_snapshot: number
          id: string
          order_id: string
          promo_code_id: string
          purchaser_email: string
          redeemed_at: string
        }
        Insert: {
          discount_snapshot?: number
          id?: string
          order_id: string
          promo_code_id: string
          purchaser_email: string
          redeemed_at?: string
        }
        Update: {
          discount_snapshot?: number
          id?: string
          order_id?: string
          promo_code_id?: string
          purchaser_email?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_store_promo_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "team_store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_store_promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "team_store_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      team_store_settings: {
        Row: {
          created_at: string
          default_country: string
          default_flat_rate_shipping: number
          default_fulfillment_method: string
          default_org_tax_exempt: boolean
          default_pickup_location: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_country?: string
          default_flat_rate_shipping?: number
          default_fulfillment_method?: string
          default_org_tax_exempt?: boolean
          default_pickup_location?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_country?: string
          default_flat_rate_shipping?: number
          default_fulfillment_method?: string
          default_org_tax_exempt?: boolean
          default_pickup_location?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_stores: {
        Row: {
          active: boolean
          brand_colors: string[] | null
          close_at: string | null
          country: string | null
          created_at: string
          description: string | null
          end_date: string | null
          flat_rate_shipping: number | null
          fulfillment_method: string | null
          fundraising_goal: number | null
          fundraising_goal_amount: number | null
          fundraising_percent: number | null
          hero_image_url: string | null
          hero_style: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          logo_url: string | null
          mascot_name: string | null
          name: string
          open_at: string | null
          org_tax_exempt: boolean | null
          organization: string | null
          pickup_location: string | null
          preview_token: string
          primary_color: string | null
          recurring_batch_day_of_month: number | null
          recurring_batch_day_of_week: number | null
          recurring_batch_enabled: boolean
          recurring_batch_frequency: string | null
          recurring_batch_time: string | null
          season: string | null
          secondary_color: string | null
          slug: string
          sport: string | null
          start_date: string | null
          status: string
          store_pin: string | null
          store_type: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          active?: boolean
          brand_colors?: string[] | null
          close_at?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flat_rate_shipping?: number | null
          fulfillment_method?: string | null
          fundraising_goal?: number | null
          fundraising_goal_amount?: number | null
          fundraising_percent?: number | null
          hero_image_url?: string | null
          hero_style?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          mascot_name?: string | null
          name: string
          open_at?: string | null
          org_tax_exempt?: boolean | null
          organization?: string | null
          pickup_location?: string | null
          preview_token?: string
          primary_color?: string | null
          recurring_batch_day_of_month?: number | null
          recurring_batch_day_of_week?: number | null
          recurring_batch_enabled?: boolean
          recurring_batch_frequency?: string | null
          recurring_batch_time?: string | null
          season?: string | null
          secondary_color?: string | null
          slug: string
          sport?: string | null
          start_date?: string | null
          status?: string
          store_pin?: string | null
          store_type?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          active?: boolean
          brand_colors?: string[] | null
          close_at?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flat_rate_shipping?: number | null
          fulfillment_method?: string | null
          fundraising_goal?: number | null
          fundraising_goal_amount?: number | null
          fundraising_percent?: number | null
          hero_image_url?: string | null
          hero_style?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          mascot_name?: string | null
          name?: string
          open_at?: string | null
          org_tax_exempt?: boolean | null
          organization?: string | null
          pickup_location?: string | null
          preview_token?: string
          primary_color?: string | null
          recurring_batch_day_of_month?: number | null
          recurring_batch_day_of_week?: number | null
          recurring_batch_enabled?: boolean
          recurring_batch_frequency?: string | null
          recurring_batch_time?: string | null
          season?: string | null
          secondary_color?: string | null
          slug?: string
          sport?: string | null
          start_date?: string | null
          status?: string
          store_pin?: string | null
          store_type?: string | null
          updated_at?: string
          welcome_message?: string | null
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
      team_stores_public: {
        Row: {
          active: boolean | null
          created_at: string | null
          end_date: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_store_for_preview: {
        Args: { _slug: string; _token: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_store_pin: { Args: { _pin: string; _slug: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      champro_order_type: "CUSTOM" | "STOCK"
      number_lock_rule: "none" | "lock_on_first_order"
      roster_player_status: "active" | "inactive"
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
      number_lock_rule: ["none", "lock_on_first_order"],
      roster_player_status: ["active", "inactive"],
    },
  },
} as const
