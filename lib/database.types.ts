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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          country_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string | null
          currency_code: string | null
          flag: string | null
          id: string
          is_active: boolean | null
          iso2: string | null
          iso3: string | null
          name: string
          phone_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code?: string | null
          flag?: string | null
          id?: string
          is_active?: boolean | null
          iso2?: string | null
          iso3?: string | null
          name: string
          phone_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string | null
          flag?: string | null
          id?: string
          is_active?: boolean | null
          iso2?: string | null
          iso3?: string | null
          name?: string
          phone_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_documents: {
        Row: {
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          id: string
          product_id: string
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string
          product_id: string
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string
          product_id?: string
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          cost_price: number | null
          created_at: string | null
          currency_code: string | null
          id: string
          incoterm: string | null
          is_active: boolean | null
          is_preferred: boolean | null
          last_price_update: string | null
          last_purchase_price: number | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          moq: number | null
          notes: string | null
          packaging: string | null
          payment_terms: string | null
          priority: number
          product_id: string
          supplier_id: string
          supplier_sku: string | null
          updated_at: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          incoterm?: string | null
          is_active?: boolean | null
          is_preferred?: boolean | null
          last_price_update?: string | null
          last_purchase_price?: number | null
          lead_time?: string | null
          lead_time_days?: number | null
          loading_port?: string | null
          moq?: number | null
          notes?: string | null
          packaging?: string | null
          payment_terms?: string | null
          priority?: number
          product_id: string
          supplier_id: string
          supplier_sku?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          incoterm?: string | null
          is_active?: boolean | null
          is_preferred?: boolean | null
          last_price_update?: string | null
          last_purchase_price?: number | null
          lead_time?: string | null
          lead_time_days?: number | null
          loading_port?: string | null
          moq?: number | null
          notes?: string | null
          packaging?: string | null
          payment_terms?: string | null
          priority?: number
          product_id?: string
          supplier_id?: string
          supplier_sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          carton_quantity: number | null
          category_id: string
          country_id: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          height: number | null
          hs_code: string | null
          id: string
          is_new: boolean
          lead_time: string | null
          length: number | null
          meta_description: string | null
          meta_title: string | null
          model_number: string | null
          moq: number | null
          name: string
          packaging: string | null
          published_at: string | null
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"] | null
          subcategory_id: string | null
          unit_id: string | null
          updated_at: string | null
          warranty: string | null
          weight: number | null
          width: number | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          carton_quantity?: number | null
          category_id: string
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          height?: number | null
          hs_code?: string | null
          id?: string
          is_new?: boolean
          lead_time?: string | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          model_number?: string | null
          moq?: number | null
          name: string
          packaging?: string | null
          published_at?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"] | null
          subcategory_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
          warranty?: string | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          carton_quantity?: number | null
          category_id?: string
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          height?: number | null
          hs_code?: string | null
          id?: string
          is_new?: boolean
          lead_time?: string | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          model_number?: string | null
          moq?: number | null
          name?: string
          packaging?: string | null
          published_at?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"] | null
          subcategory_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
          warranty?: string | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rfq_items: {
        Row: {
          created_at: string
          id: string
          item_description: string | null
          item_name: string
          line_number: number
          notes: string | null
          packaging_requirements: string | null
          product_id: string | null
          product_sku: string | null
          requested_quantity: number
          rfq_id: string
          specifications: string | null
          target_currency_code: string | null
          target_delivery_date: string | null
          target_unit_price: number | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_name: string
          line_number: number
          notes?: string | null
          packaging_requirements?: string | null
          product_id?: string | null
          product_sku?: string | null
          requested_quantity: number
          rfq_id: string
          specifications?: string | null
          target_currency_code?: string | null
          target_delivery_date?: string | null
          target_unit_price?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_name?: string
          line_number?: number
          notes?: string | null
          packaging_requirements?: string | null
          product_id?: string | null
          product_sku?: string | null
          requested_quantity?: number
          rfq_id?: string
          specifications?: string | null
          target_currency_code?: string | null
          target_delivery_date?: string | null
          target_unit_price?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["rfq_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["rfq_status"] | null
          reason: string | null
          rfq_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["rfq_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["rfq_status"] | null
          reason?: string | null
          rfq_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["rfq_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["rfq_status"] | null
          reason?: string | null
          rfq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_status_history_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_suppliers: {
        Row: {
          awarded_at: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invitation_message: string | null
          notes: string | null
          responded_at: string | null
          rfq_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["rfq_supplier_status"]
          supplier_id: string
          supplier_reference: string | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          awarded_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          invitation_message?: string | null
          notes?: string | null
          responded_at?: string | null
          rfq_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["rfq_supplier_status"]
          supplier_id: string
          supplier_reference?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          awarded_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          invitation_message?: string | null
          notes?: string | null
          responded_at?: string | null
          rfq_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["rfq_supplier_status"]
          supplier_id?: string
          supplier_reference?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          awarded_at: string | null
          awarded_quotation_id: string | null
          awarded_supplier_id: string | null
          cancelled_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          description: string | null
          id: string
          incoterm: string | null
          internal_notes: string | null
          packaging_requirements: string | null
          payment_terms: string | null
          priority: Database["public"]["Enums"]["rfq_priority"]
          required_delivery_date: string | null
          response_deadline: string | null
          rfq_number: string
          sent_at: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          supplier_notes: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_quotation_id?: string | null
          awarded_supplier_id?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_location?: string | null
          description?: string | null
          id?: string
          incoterm?: string | null
          internal_notes?: string | null
          packaging_requirements?: string | null
          payment_terms?: string | null
          priority?: Database["public"]["Enums"]["rfq_priority"]
          required_delivery_date?: string | null
          response_deadline?: string | null
          rfq_number?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          supplier_notes?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_quotation_id?: string | null
          awarded_supplier_id?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_location?: string | null
          description?: string | null
          id?: string
          incoterm?: string | null
          internal_notes?: string | null
          packaging_requirements?: string | null
          payment_terms?: string | null
          priority?: Database["public"]["Enums"]["rfq_priority"]
          required_delivery_date?: string | null
          response_deadline?: string | null
          rfq_number?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          supplier_notes?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_awarded_quotation_fk"
            columns: ["awarded_quotation_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_awarded_supplier_id_fkey"
            columns: ["awarded_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotation_items: {
        Row: {
          available_quantity: number | null
          compliance_notes: string | null
          country_of_origin_id: string | null
          created_at: string
          discount_amount: number
          discount_percent: number
          id: string
          is_compliant: boolean
          item_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          line_subtotal: number
          line_total: number
          moq: number | null
          packaging: string | null
          quotation_id: string
          quoted_quantity: number
          rfq_item_id: string
          supplier_sku: string | null
          tax_amount: number
          tax_percent: number
          unit_price: number
          updated_at: string
          warranty: string | null
        }
        Insert: {
          available_quantity?: number | null
          compliance_notes?: string | null
          country_of_origin_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          is_compliant?: boolean
          item_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          line_subtotal?: number
          line_total?: number
          moq?: number | null
          packaging?: string | null
          quotation_id: string
          quoted_quantity: number
          rfq_item_id: string
          supplier_sku?: string | null
          tax_amount?: number
          tax_percent?: number
          unit_price: number
          updated_at?: string
          warranty?: string | null
        }
        Update: {
          available_quantity?: number | null
          compliance_notes?: string | null
          country_of_origin_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          is_compliant?: boolean
          item_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          line_subtotal?: number
          line_total?: number
          moq?: number | null
          packaging?: string | null
          quotation_id?: string
          quoted_quantity?: number
          rfq_item_id?: string
          supplier_sku?: string | null
          tax_amount?: number
          tax_percent?: number
          unit_price?: number
          updated_at?: string
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_items_country_of_origin_id_fkey"
            columns: ["country_of_origin_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          discount_amount: number
          id: string
          incoterm: string | null
          internal_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          other_charges: number
          packaging: string | null
          payment_terms: string | null
          quotation_date: string
          quotation_number: string | null
          rejected_at: string | null
          reviewed_at: string | null
          revision_number: number
          rfq_id: string
          rfq_supplier_id: string
          shipping_amount: number
          status: Database["public"]["Enums"]["supplier_quotation_status"]
          submitted_at: string | null
          subtotal: number
          supplier_id: string
          supplier_notes: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          warranty: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_location?: string | null
          discount_amount?: number
          id?: string
          incoterm?: string | null
          internal_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          loading_port?: string | null
          other_charges?: number
          packaging?: string | null
          payment_terms?: string | null
          quotation_date?: string
          quotation_number?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          revision_number?: number
          rfq_id: string
          rfq_supplier_id: string
          shipping_amount?: number
          status?: Database["public"]["Enums"]["supplier_quotation_status"]
          submitted_at?: string | null
          subtotal?: number
          supplier_id: string
          supplier_notes?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warranty?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_location?: string | null
          discount_amount?: number
          id?: string
          incoterm?: string | null
          internal_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          loading_port?: string | null
          other_charges?: number
          packaging?: string | null
          payment_terms?: string | null
          quotation_date?: string
          quotation_number?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          revision_number?: number
          rfq_id?: string
          rfq_supplier_id?: string
          shipping_amount?: number
          status?: Database["public"]["Enums"]["supplier_quotation_status"]
          submitted_at?: string | null
          subtotal?: number
          supplier_id?: string
          supplier_notes?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotations_rfq_supplier_id_fkey"
            columns: ["rfq_supplier_id"]
            isOneToOne: false
            referencedRelation: "rfq_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          country_id: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          phone: string | null
          updated_at: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          short_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          short_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          short_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_product_supplier: {
        Args: { p_mapping_id: string; p_product_id: string }
        Returns: undefined
      }
      award_supplier_quotation: {
        Args: { target_quotation_id: string; target_rfq_id: string }
        Returns: {
          awarded_at: string | null
          awarded_quotation_id: string | null
          awarded_supplier_id: string | null
          cancelled_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          description: string | null
          id: string
          incoterm: string | null
          internal_notes: string | null
          packaging_requirements: string | null
          payment_terms: string | null
          priority: Database["public"]["Enums"]["rfq_priority"]
          required_delivery_date: string | null
          response_deadline: string | null
          rfq_number: string
          sent_at: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          supplier_notes: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rfqs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_approve_rfqs: { Args: never; Returns: boolean }
      can_manage_rfqs: { Args: never; Returns: boolean }
      can_view_rfqs: { Args: never; Returns: boolean }
      close_rfq: {
        Args: { target_rfq_id: string }
        Returns: {
          awarded_at: string | null
          awarded_quotation_id: string | null
          awarded_supplier_id: string | null
          cancelled_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          description: string | null
          id: string
          incoterm: string | null
          internal_notes: string | null
          packaging_requirements: string | null
          payment_terms: string | null
          priority: Database["public"]["Enums"]["rfq_priority"]
          required_delivery_date: string | null
          response_deadline: string | null
          rfq_number: string
          sent_at: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          supplier_notes: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rfqs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_rfq_number: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      recalculate_quotation_totals: {
        Args: { target_quotation_id: string }
        Returns: undefined
      }
      reject_supplier_quotation: {
        Args: { rejection_reason?: string; target_quotation_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          discount_amount: number
          id: string
          incoterm: string | null
          internal_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          other_charges: number
          packaging: string | null
          payment_terms: string | null
          quotation_date: string
          quotation_number: string | null
          rejected_at: string | null
          reviewed_at: string | null
          revision_number: number
          rfq_id: string
          rfq_supplier_id: string
          shipping_amount: number
          status: Database["public"]["Enums"]["supplier_quotation_status"]
          submitted_at: string | null
          subtotal: number
          supplier_id: string
          supplier_notes: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          warranty: string | null
        }
        SetofOptions: {
          from: "*"
          to: "supplier_quotations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_product_supplier: {
        Args: { p_mapping_id: string; p_product_id: string }
        Returns: undefined
      }
      review_supplier_quotation: {
        Args: { target_quotation_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          discount_amount: number
          id: string
          incoterm: string | null
          internal_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          other_charges: number
          packaging: string | null
          payment_terms: string | null
          quotation_date: string
          quotation_number: string | null
          rejected_at: string | null
          reviewed_at: string | null
          revision_number: number
          rfq_id: string
          rfq_supplier_id: string
          shipping_amount: number
          status: Database["public"]["Enums"]["supplier_quotation_status"]
          submitted_at: string | null
          subtotal: number
          supplier_id: string
          supplier_notes: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          warranty: string | null
        }
        SetofOptions: {
          from: "*"
          to: "supplier_quotations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_rfq: {
        Args: { target_rfq_id: string }
        Returns: {
          awarded_at: string | null
          awarded_quotation_id: string | null
          awarded_supplier_id: string | null
          cancelled_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          description: string | null
          id: string
          incoterm: string | null
          internal_notes: string | null
          packaging_requirements: string | null
          payment_terms: string | null
          priority: Database["public"]["Enums"]["rfq_priority"]
          required_delivery_date: string | null
          response_deadline: string | null
          rfq_number: string
          sent_at: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          supplier_notes: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rfqs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_product_preferred_supplier: {
        Args: { p_mapping_id: string; p_product_id: string }
        Returns: undefined
      }
      submit_supplier_quotation: {
        Args: { target_quotation_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          discount_amount: number
          id: string
          incoterm: string | null
          internal_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          other_charges: number
          packaging: string | null
          payment_terms: string | null
          quotation_date: string
          quotation_number: string | null
          rejected_at: string | null
          reviewed_at: string | null
          revision_number: number
          rfq_id: string
          rfq_supplier_id: string
          shipping_amount: number
          status: Database["public"]["Enums"]["supplier_quotation_status"]
          submitted_at: string | null
          subtotal: number
          supplier_id: string
          supplier_notes: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          warranty: string | null
        }
        SetofOptions: {
          from: "*"
          to: "supplier_quotations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "sales" | "viewer"
      document_type:
        | "catalog"
        | "datasheet"
        | "manual"
        | "certificate"
        | "other"
      product_status: "draft" | "pending_review" | "published" | "archived"
      rfq_priority: "low" | "normal" | "high" | "urgent"
      rfq_status:
        | "draft"
        | "ready"
        | "sent"
        | "partially_quoted"
        | "quoted"
        | "under_review"
        | "awarded"
        | "closed"
        | "cancelled"
      rfq_supplier_status:
        | "invited"
        | "sent"
        | "viewed"
        | "declined"
        | "partially_quoted"
        | "quoted"
        | "awarded"
        | "rejected"
        | "cancelled"
      supplier_quotation_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "revised"
        | "accepted"
        | "rejected"
        | "withdrawn"
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
      app_role: ["super_admin", "admin", "manager", "sales", "viewer"],
      document_type: ["catalog", "datasheet", "manual", "certificate", "other"],
      product_status: ["draft", "pending_review", "published", "archived"],
      rfq_priority: ["low", "normal", "high", "urgent"],
      rfq_status: [
        "draft",
        "ready",
        "sent",
        "partially_quoted",
        "quoted",
        "under_review",
        "awarded",
        "closed",
        "cancelled",
      ],
      rfq_supplier_status: [
        "invited",
        "sent",
        "viewed",
        "declined",
        "partially_quoted",
        "quoted",
        "awarded",
        "rejected",
        "cancelled",
      ],
      supplier_quotation_status: [
        "draft",
        "submitted",
        "under_review",
        "revised",
        "accepted",
        "rejected",
        "withdrawn",
      ],
    },
  },
} as const
