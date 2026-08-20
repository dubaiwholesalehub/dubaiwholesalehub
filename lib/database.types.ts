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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_transactions: {
        Row: {
          account_id: string
          amount: number
          base_amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          direction: string
          exchange_rate: number
          id: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          status: string
          transaction_date: string
          transaction_number: string
          transaction_type: string
          transfer_group_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          base_amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          direction: string
          exchange_rate?: number
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          status?: string
          transaction_date?: string
          transaction_number: string
          transaction_type: string
          transfer_group_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          base_amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          direction?: string
          exchange_rate?: number
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          status?: string
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
          transfer_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          date_from: string
          date_to: string
          fiscal_year: number
          id: string
          notes: string | null
          period_code: string
          period_number: number
          reopened_at: string | null
          reopened_by: string | null
          soft_closed_at: string | null
          soft_closed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          date_from: string
          date_to: string
          fiscal_year: number
          id?: string
          notes?: string | null
          period_code: string
          period_number: number
          reopened_at?: string | null
          reopened_by?: string | null
          soft_closed_at?: string | null
          soft_closed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          date_from?: string
          date_to?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          period_code?: string
          period_number?: number
          reopened_at?: string | null
          reopened_by?: string | null
          soft_closed_at?: string | null
          soft_closed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_soft_closed_by_fkey"
            columns: ["soft_closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      customer_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          address_name: string | null
          address_type: string
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          customer_id: string
          delivery_instructions: string | null
          id: string
          is_active: boolean
          is_default: boolean
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          address_name?: string | null
          address_type?: string
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          customer_id: string
          delivery_instructions?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          address_name?: string | null
          address_type?: string
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          customer_id?: string
          delivery_instructions?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          contact_name: string
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          job_title: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          contact_name: string
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          contact_name?: string
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_receipt_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          receipt_id: string
          sales_order_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          receipt_id: string
          sales_order_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          receipt_id?: string
          sales_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "customer_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_by_sales_order"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "receivable_open_items"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_margin_analysis"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "customer_receipt_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_receipts: {
        Row: {
          account_transaction_id: string | null
          allocated_amount: number
          amount: number
          bank_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          exchange_rate: number
          financial_account_id: string | null
          id: string
          notes: string | null
          payment_method: string
          posted_at: string | null
          posted_by: string | null
          receipt_date: string
          receipt_number: string
          reference_number: string | null
          status: string
          unallocated_amount: number
          updated_at: string
        }
        Insert: {
          account_transaction_id?: string | null
          allocated_amount?: number
          amount: number
          bank_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id: string
          exchange_rate?: number
          financial_account_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          posted_at?: string | null
          posted_by?: string | null
          receipt_date?: string
          receipt_number: string
          reference_number?: string | null
          status?: string
          unallocated_amount?: number
          updated_at?: string
        }
        Update: {
          account_transaction_id?: string | null
          allocated_amount?: number
          amount?: number
          bank_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string
          exchange_rate?: number
          financial_account_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          posted_at?: string | null
          posted_by?: string | null
          receipt_date?: string
          receipt_number?: string
          reference_number?: string | null
          status?: string
          unallocated_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_receipts_account_transaction_id_fkey"
            columns: ["account_transaction_id"]
            isOneToOne: false
            referencedRelation: "account_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipts_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipts_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receipts_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_name: string | null
          created_at: string
          created_by: string | null
          credit_limit: number
          currency_code: string
          customer_number: string
          customer_type: string
          display_name: string
          email: string | null
          external_customer_id: string | null
          first_name: string | null
          id: string
          internal_notes: string | null
          last_name: string | null
          payment_terms_days: number
          phone: string | null
          source: string
          status: string
          tax_registration_number: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          currency_code?: string
          customer_number: string
          customer_type?: string
          display_name: string
          email?: string | null
          external_customer_id?: string | null
          first_name?: string | null
          id?: string
          internal_notes?: string | null
          last_name?: string | null
          payment_terms_days?: number
          phone?: string | null
          source?: string
          status?: string
          tax_registration_number?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          currency_code?: string
          customer_number?: string
          customer_type?: string
          display_name?: string
          email?: string | null
          external_customer_id?: string | null
          first_name?: string | null
          id?: string
          internal_notes?: string | null
          last_name?: string | null
          payment_terms_days?: number
          phone?: string | null
          source?: string
          status?: string
          tax_registration_number?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      delivery_order_items: {
        Row: {
          batch_number: string | null
          created_at: string
          delivered_quantity: number
          delivery_order_id: string
          delivery_quantity: number
          description: string | null
          dispatched_quantity: number
          expiry_date: string | null
          id: string
          item_name: string
          line_notes: string | null
          line_number: number
          lot_number: string | null
          manufacturing_date: string | null
          ordered_quantity: number
          packed_quantity: number
          picked_quantity: number
          previously_delivered_quantity: number
          product_id: string | null
          remaining_quantity: number | null
          sales_order_item_id: string
          serial_number: string | null
          sku: string | null
          unit_cost: number
          unit_id: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          delivered_quantity?: number
          delivery_order_id: string
          delivery_quantity?: number
          description?: string | null
          dispatched_quantity?: number
          expiry_date?: string | null
          id?: string
          item_name: string
          line_notes?: string | null
          line_number: number
          lot_number?: string | null
          manufacturing_date?: string | null
          ordered_quantity?: number
          packed_quantity?: number
          picked_quantity?: number
          previously_delivered_quantity?: number
          product_id?: string | null
          remaining_quantity?: number | null
          sales_order_item_id: string
          serial_number?: string | null
          sku?: string | null
          unit_cost?: number
          unit_id?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          delivered_quantity?: number
          delivery_order_id?: string
          delivery_quantity?: number
          description?: string | null
          dispatched_quantity?: number
          expiry_date?: string | null
          id?: string
          item_name?: string
          line_notes?: string | null
          line_number?: number
          lot_number?: string | null
          manufacturing_date?: string | null
          ordered_quantity?: number
          packed_quantity?: number
          picked_quantity?: number
          previously_delivered_quantity?: number
          product_id?: string | null
          remaining_quantity?: number | null
          sales_order_item_id?: string
          serial_number?: string | null
          sku?: string | null
          unit_cost?: number
          unit_id?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_order_items_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_order_items_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["delivery_order_id"]
          },
          {
            foreignKeyName: "delivery_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_order_items_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["sales_order_item_id"]
          },
          {
            foreignKeyName: "delivery_order_items_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_order_items_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_margin_analysis"
            referencedColumns: ["sales_order_item_id"]
          },
          {
            foreignKeyName: "delivery_order_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          carrier_name: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_reference: string | null
          delivered_at: string | null
          delivered_by: string | null
          delivered_date: string | null
          delivery_date: string
          delivery_method: string
          delivery_notes: string | null
          delivery_number: string
          dispatched_at: string | null
          dispatched_by: string | null
          dispatched_date: string | null
          driver_name: string | null
          driver_phone: string | null
          expected_delivery_date: string | null
          external_reference: string | null
          id: string
          internal_notes: string | null
          packed_at: string | null
          packed_by: string | null
          packing_notes: string | null
          picked_at: string | null
          picked_by: string | null
          priority: string
          requested_delivery_date: string | null
          sales_order_id: string
          shipping_address_id: string | null
          status: string
          tracking_number: string | null
          updated_at: string
          updated_by: string | null
          vehicle_number: string | null
          warehouse_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          carrier_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_reference?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivered_date?: string | null
          delivery_date?: string
          delivery_method?: string
          delivery_notes?: string | null
          delivery_number: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          dispatched_date?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          expected_delivery_date?: string | null
          external_reference?: string | null
          id?: string
          internal_notes?: string | null
          packed_at?: string | null
          packed_by?: string | null
          packing_notes?: string | null
          picked_at?: string | null
          picked_by?: string | null
          priority?: string
          requested_delivery_date?: string | null
          sales_order_id: string
          shipping_address_id?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_number?: string | null
          warehouse_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          carrier_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_reference?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivered_date?: string | null
          delivery_date?: string
          delivery_method?: string
          delivery_notes?: string | null
          delivery_number?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          dispatched_date?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          expected_delivery_date?: string | null
          external_reference?: string | null
          id?: string
          internal_notes?: string | null
          packed_at?: string | null
          packed_by?: string | null
          packing_notes?: string | null
          picked_at?: string | null
          picked_by?: string | null
          priority?: string
          requested_delivery_date?: string | null
          sales_order_id?: string
          shipping_address_id?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_number?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "delivery_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_by_sales_order"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "delivery_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "delivery_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "receivable_open_items"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "delivery_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_margin_analysis"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "delivery_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          expense_type: string
          gl_account_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          expense_type?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          expense_type?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_transaction_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string | null
          exchange_rate: number
          expense_date: string
          expense_number: string
          expense_type: string
          financial_account_id: string | null
          gross_amount: number
          id: string
          market_country_id: string | null
          net_amount: number
          notes: string | null
          payee_name: string | null
          payment_method: string | null
          payment_reference: string | null
          pending_tax_amount: number
          posted_at: string | null
          posted_by: string | null
          profitability_notes: string | null
          recoverable_tax_amount: number
          sales_channel: string | null
          sales_order_id: string | null
          status: string
          supplier_id: string | null
          supplier_invoice_date: string | null
          supplier_invoice_number: string | null
          supplier_trn: string | null
          tax_amount: number
          tax_invoice_verified: boolean
          tax_invoice_verified_at: string | null
          tax_treatment: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          account_transaction_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string | null
          exchange_rate?: number
          expense_date?: string
          expense_number: string
          expense_type: string
          financial_account_id?: string | null
          gross_amount?: number
          id?: string
          market_country_id?: string | null
          net_amount?: number
          notes?: string | null
          payee_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pending_tax_amount?: number
          posted_at?: string | null
          posted_by?: string | null
          profitability_notes?: string | null
          recoverable_tax_amount?: number
          sales_channel?: string | null
          sales_order_id?: string | null
          status?: string
          supplier_id?: string | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          supplier_trn?: string | null
          tax_amount?: number
          tax_invoice_verified?: boolean
          tax_invoice_verified_at?: string | null
          tax_treatment?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          account_transaction_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string | null
          exchange_rate?: number
          expense_date?: string
          expense_number?: string
          expense_type?: string
          financial_account_id?: string | null
          gross_amount?: number
          id?: string
          market_country_id?: string | null
          net_amount?: number
          notes?: string | null
          payee_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pending_tax_amount?: number
          posted_at?: string | null
          posted_by?: string | null
          profitability_notes?: string | null
          recoverable_tax_amount?: number
          sales_channel?: string | null
          sales_order_id?: string | null
          status?: string
          supplier_id?: string | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          supplier_trn?: string | null
          tax_amount?: number
          tax_invoice_verified?: boolean
          tax_invoice_verified_at?: string | null
          tax_treatment?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_transaction_id_fkey"
            columns: ["account_transaction_id"]
            isOneToOne: false
            referencedRelation: "account_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_market_country_id_fkey"
            columns: ["market_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_by_sales_order"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "receivable_open_items"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_margin_analysis"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_account_transfers: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          exchange_rate: number
          from_account_id: string
          from_amount: number
          from_currency_code: string
          id: string
          in_transaction_id: string | null
          notes: string | null
          out_transaction_id: string | null
          posted_at: string | null
          reference_number: string | null
          status: string
          to_account_id: string
          to_amount: number
          to_currency_code: string
          transfer_date: string
          transfer_group_id: string
          transfer_number: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          exchange_rate?: number
          from_account_id: string
          from_amount: number
          from_currency_code: string
          id?: string
          in_transaction_id?: string | null
          notes?: string | null
          out_transaction_id?: string | null
          posted_at?: string | null
          reference_number?: string | null
          status?: string
          to_account_id: string
          to_amount: number
          to_currency_code: string
          transfer_date?: string
          transfer_group_id: string
          transfer_number: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          exchange_rate?: number
          from_account_id?: string
          from_amount?: number
          from_currency_code?: string
          id?: string
          in_transaction_id?: string | null
          notes?: string | null
          out_transaction_id?: string | null
          posted_at?: string | null
          reference_number?: string | null
          status?: string
          to_account_id?: string
          to_amount?: number
          to_currency_code?: string
          transfer_date?: string
          transfer_group_id?: string
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_account_transfers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_account_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_account_transfers_in_transaction_id_fkey"
            columns: ["in_transaction_id"]
            isOneToOne: false
            referencedRelation: "account_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_account_transfers_out_transaction_id_fkey"
            columns: ["out_transaction_id"]
            isOneToOne: false
            referencedRelation: "account_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          allow_negative_balance: boolean
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          current_balance: number
          gl_account_id: string | null
          iban: string | null
          id: string
          is_active: boolean
          is_default: boolean
          notes: string | null
          opening_balance: number
          opening_balance_date: string | null
          swift_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          allow_negative_balance?: boolean
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          current_balance?: number
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string | null
          swift_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          allow_negative_balance?: boolean
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          current_balance?: number
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string | null
          swift_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_account_mappings: {
        Row: {
          created_at: string
          description: string | null
          gl_account_id: string
          id: string
          is_active: boolean
          mapping_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gl_account_id: string
          id?: string
          is_active?: boolean
          mapping_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gl_account_id?: string
          id?: string
          is_active?: boolean
          mapping_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_account_mappings_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_account_mappings_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_accounts: {
        Row: {
          account_class: string
          account_code: string
          account_name: string
          allow_manual_posting: boolean
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_control_account: boolean
          is_posting_account: boolean
          is_system_account: boolean
          normal_balance: string
          parent_id: string | null
          statement_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_class: string
          account_code: string
          account_name: string
          allow_manual_posting?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_control_account?: boolean
          is_posting_account?: boolean
          is_system_account?: boolean
          normal_balance: string
          parent_id?: string | null
          statement_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_class?: string
          account_code?: string
          account_name?: string
          allow_manual_posting?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_control_account?: boolean
          is_posting_account?: boolean
          is_system_account?: boolean
          normal_balance?: string
          parent_id?: string | null
          statement_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "gl_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_journal_entries: {
        Row: {
          accounting_period_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          description: string
          exchange_rate: number
          id: string
          journal_date: string
          journal_number: string
          original_entry_id: string | null
          posted_at: string | null
          posted_by: string | null
          posting_date: string
          reversal_entry_id: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          source_id: string | null
          source_number: string | null
          source_type: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accounting_period_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description: string
          exchange_rate?: number
          id?: string
          journal_date: string
          journal_number: string
          original_entry_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date: string
          reversal_entry_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_number?: string | null
          source_type: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accounting_period_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string
          exchange_rate?: number
          id?: string
          journal_date?: string
          journal_number?: string
          original_entry_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string
          reversal_entry_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_number?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_journal_entries_accounting_period_id_fkey"
            columns: ["accounting_period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_entries_original_entry_id_fkey"
            columns: ["original_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_balance"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "gl_journal_entries_original_entry_id_fkey"
            columns: ["original_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_balance"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "gl_journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_entries_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_journal_lines: {
        Row: {
          base_credit: number
          base_debit: number
          created_at: string
          credit: number
          customer_id: string | null
          debit: number
          description: string | null
          expense_category_id: string | null
          financial_account_id: string | null
          gl_account_id: string
          id: string
          journal_entry_id: string
          line_number: number
          product_id: string | null
          source_line_id: string | null
          source_line_number: number | null
          source_line_type: string | null
          supplier_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          base_credit?: number
          base_debit?: number
          created_at?: string
          credit?: number
          customer_id?: string | null
          debit?: number
          description?: string | null
          expense_category_id?: string | null
          financial_account_id?: string | null
          gl_account_id: string
          id?: string
          journal_entry_id: string
          line_number: number
          product_id?: string | null
          source_line_id?: string | null
          source_line_number?: number | null
          source_line_type?: string | null
          supplier_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          base_credit?: number
          base_debit?: number
          created_at?: string
          credit?: number
          customer_id?: string | null
          debit?: number
          description?: string | null
          expense_category_id?: string | null
          financial_account_id?: string | null
          gl_account_id?: string
          id?: string
          journal_entry_id?: string
          line_number?: number
          product_id?: string | null
          source_line_id?: string | null
          source_line_number?: number | null
          source_line_type?: string | null
          supplier_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_journal_lines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "gl_journal_lines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_balance"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "gl_journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "gl_journal_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_items: {
        Row: {
          accepted_quantity: number
          batch_number: string | null
          created_at: string
          damaged_quantity: number
          expiry_date: string | null
          goods_receipt_id: string
          id: string
          inspection_status: string
          line_number: number
          lot_number: string | null
          manufacturing_date: string | null
          notes: string | null
          ordered_quantity: number
          previously_received_quantity: number
          product_id: string
          purchase_order_item_id: string
          receiving_quantity: number
          rejected_quantity: number
          rejection_reason: string | null
          serial_number: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          accepted_quantity?: number
          batch_number?: string | null
          created_at?: string
          damaged_quantity?: number
          expiry_date?: string | null
          goods_receipt_id: string
          id?: string
          inspection_status?: string
          line_number: number
          lot_number?: string | null
          manufacturing_date?: string | null
          notes?: string | null
          ordered_quantity?: number
          previously_received_quantity?: number
          product_id: string
          purchase_order_item_id: string
          receiving_quantity?: number
          rejected_quantity?: number
          rejection_reason?: string | null
          serial_number?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          accepted_quantity?: number
          batch_number?: string | null
          created_at?: string
          damaged_quantity?: number
          expiry_date?: string | null
          goods_receipt_id?: string
          id?: string
          inspection_status?: string
          line_number?: number
          lot_number?: string | null
          manufacturing_date?: string | null
          notes?: string | null
          ordered_quantity?: number
          previously_received_quantity?: number
          product_id?: string
          purchase_order_item_id?: string
          receiving_quantity?: number
          rejected_quantity?: number
          rejection_reason?: string | null
          serial_number?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          carrier_name: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          internal_notes: string | null
          purchase_order_id: string
          receipt_number: string
          received_at: string | null
          received_by: string | null
          received_date: string | null
          status: string
          supplier_delivery_note_number: string | null
          supplier_id: string
          supplier_invoice_number: string | null
          supplier_notes: string | null
          tracking_number: string | null
          updated_at: string
          vehicle_number: string | null
          warehouse_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          carrier_name?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          internal_notes?: string | null
          purchase_order_id: string
          receipt_number: string
          received_at?: string | null
          received_by?: string | null
          received_date?: string | null
          status?: string
          supplier_delivery_note_number?: string | null
          supplier_id: string
          supplier_invoice_number?: string | null
          supplier_notes?: string | null
          tracking_number?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          carrier_name?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          internal_notes?: string | null
          purchase_order_id?: string
          receipt_number?: string
          received_at?: string | null
          received_by?: string | null
          received_date?: string | null
          status?: string
          supplier_delivery_note_number?: string | null
          supplier_id?: string
          supplier_invoice_number?: string | null
          supplier_notes?: string | null
          tracking_number?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transaction_items: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          inventory_transaction_id: string
          line_number: number
          lot_number: string | null
          manufacturing_date: string | null
          notes: string | null
          product_id: string
          quantity_change: number
          serial_number: string | null
          source_document_item_id: string | null
          total_cost: number | null
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_transaction_id: string
          line_number: number
          lot_number?: string | null
          manufacturing_date?: string | null
          notes?: string | null
          product_id: string
          quantity_change: number
          serial_number?: string | null
          source_document_item_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_transaction_id?: string
          line_number?: number
          lot_number?: string | null
          manufacturing_date?: string | null
          notes?: string | null
          product_id?: string
          quantity_change?: number
          serial_number?: string | null
          source_document_item_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transaction_items_inventory_transaction_id_fkey"
            columns: ["inventory_transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transaction_items_inventory_transaction_id_fkey"
            columns: ["inventory_transaction_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["inventory_transaction_id"]
          },
          {
            foreignKeyName: "inventory_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transaction_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          internal_notes: string | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          related_warehouse_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string
          transaction_date: string
          transaction_number: string
          transaction_type: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          related_warehouse_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          transaction_date?: string
          transaction_number: string
          transaction_type: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          related_warehouse_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_related_warehouse_id_fkey"
            columns: ["related_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_items: {
        Row: {
          created_at: string
          dispatched_quantity: number
          id: string
          inventory_transfer_id: string
          line_notes: string | null
          line_number: number
          product_id: string
          received_quantity: number
          requested_quantity: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatched_quantity?: number
          id?: string
          inventory_transfer_id: string
          line_notes?: string | null
          line_number: number
          product_id: string
          received_quantity?: number
          requested_quantity?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatched_quantity?: number
          id?: string
          inventory_transfer_id?: string
          line_notes?: string | null
          line_number?: number
          product_id?: string
          received_quantity?: number
          requested_quantity?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_items_inventory_transfer_id_fkey"
            columns: ["inventory_transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          destination_warehouse_id: string
          dispatched_at: string | null
          dispatched_by: string | null
          expected_arrival_date: string | null
          id: string
          internal_notes: string | null
          reason: string | null
          received_at: string | null
          received_by: string | null
          reference_number: string | null
          source_warehouse_id: string
          status: string
          transfer_date: string
          transfer_number: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          destination_warehouse_id: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          expected_arrival_date?: string | null
          id?: string
          internal_notes?: string | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          reference_number?: string | null
          source_warehouse_id: string
          status?: string
          transfer_date?: string
          transfer_number?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          destination_warehouse_id?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          expected_arrival_date?: string | null
          id?: string
          internal_notes?: string | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          reference_number?: string | null
          source_warehouse_id?: string
          status?: string
          transfer_date?: string
          transfer_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_destination_warehouse_id_fkey"
            columns: ["destination_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
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
          allow_backorder: boolean
          barcode: string | null
          brand_id: string | null
          carton_quantity: number | null
          category_id: string
          country_id: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          fulfilment_method: string
          height: number | null
          hs_code: string | null
          id: string
          is_new: boolean
          lead_time: string | null
          length: number | null
          meta_description: string | null
          meta_title: string | null
          minimum_stock_quantity: number
          model_number: string | null
          moq: number | null
          name: string
          packaging: string | null
          procurement_lead_time_days: number
          procurement_notes: string | null
          published_at: string | null
          reorder_quantity: number
          safety_stock_days: number
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
          allow_backorder?: boolean
          barcode?: string | null
          brand_id?: string | null
          carton_quantity?: number | null
          category_id: string
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          fulfilment_method?: string
          height?: number | null
          hs_code?: string | null
          id?: string
          is_new?: boolean
          lead_time?: string | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          minimum_stock_quantity?: number
          model_number?: string | null
          moq?: number | null
          name: string
          packaging?: string | null
          procurement_lead_time_days?: number
          procurement_notes?: string | null
          published_at?: string | null
          reorder_quantity?: number
          safety_stock_days?: number
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
          allow_backorder?: boolean
          barcode?: string | null
          brand_id?: string | null
          carton_quantity?: number | null
          category_id?: string
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          fulfilment_method?: string
          height?: number | null
          hs_code?: string | null
          id?: string
          is_new?: boolean
          lead_time?: string | null
          length?: number | null
          meta_description?: string | null
          meta_title?: string | null
          minimum_stock_quantity?: number
          model_number?: string | null
          moq?: number | null
          name?: string
          packaging?: string | null
          procurement_lead_time_days?: number
          procurement_notes?: string | null
          published_at?: string | null
          reorder_quantity?: number
          safety_stock_days?: number
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
      purchase_order_items: {
        Row: {
          country_of_origin_id: string | null
          created_at: string
          discount_amount: number
          discount_percent: number
          id: string
          item_description: string | null
          item_name: string
          item_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          line_number: number
          line_subtotal: number
          line_total: number
          ordered_quantity: number
          packaging: string | null
          product_id: string | null
          product_sku: string | null
          purchase_order_id: string
          received_quantity: number
          rfq_item_id: string | null
          supplier_quotation_item_id: string | null
          supplier_sku: string | null
          tax_amount: number
          tax_percent: number
          unit_id: string | null
          unit_price: number
          updated_at: string
          warranty: string | null
        }
        Insert: {
          country_of_origin_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          item_description?: string | null
          item_name: string
          item_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          line_number: number
          line_subtotal?: number
          line_total?: number
          ordered_quantity: number
          packaging?: string | null
          product_id?: string | null
          product_sku?: string | null
          purchase_order_id: string
          received_quantity?: number
          rfq_item_id?: string | null
          supplier_quotation_item_id?: string | null
          supplier_sku?: string | null
          tax_amount?: number
          tax_percent?: number
          unit_id?: string | null
          unit_price: number
          updated_at?: string
          warranty?: string | null
        }
        Update: {
          country_of_origin_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          item_description?: string | null
          item_name?: string
          item_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          line_number?: number
          line_subtotal?: number
          line_total?: number
          ordered_quantity?: number
          packaging?: string | null
          product_id?: string | null
          product_sku?: string | null
          purchase_order_id?: string
          received_quantity?: number
          rfq_item_id?: string | null
          supplier_quotation_item_id?: string | null
          supplier_sku?: string | null
          tax_amount?: number
          tax_percent?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_country_of_origin_id_fkey"
            columns: ["country_of_origin_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_supplier_quotation_item_id_fkey"
            columns: ["supplier_quotation_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_number_counters: {
        Row: {
          counter_year: number
          last_number: number
          updated_at: string
        }
        Insert: {
          counter_year: number
          last_number?: number
          updated_at?: string
        }
        Update: {
          counter_year?: number
          last_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          delivery_terms: string | null
          discount_amount: number
          expected_delivery_date: string | null
          id: string
          incoterm: string | null
          internal_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          order_date: string
          other_charges: number
          packaging: string | null
          partially_received_at: string | null
          payment_terms: string | null
          po_number: string
          received_at: string | null
          rfq_id: string | null
          sent_at: string | null
          shipping_amount: number
          source: Database["public"]["Enums"]["purchase_order_source"]
          status: Database["public"]["Enums"]["purchase_order_status"]
          subtotal: number
          supplier_id: string
          supplier_notes: string | null
          supplier_quotation_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          warranty: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_location?: string | null
          delivery_terms?: string | null
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          incoterm?: string | null
          internal_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          loading_port?: string | null
          order_date?: string
          other_charges?: number
          packaging?: string | null
          partially_received_at?: string | null
          payment_terms?: string | null
          po_number?: string
          received_at?: string | null
          rfq_id?: string | null
          sent_at?: string | null
          shipping_amount?: number
          source?: Database["public"]["Enums"]["purchase_order_source"]
          status?: Database["public"]["Enums"]["purchase_order_status"]
          subtotal?: number
          supplier_id: string
          supplier_notes?: string | null
          supplier_quotation_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          warranty?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          delivery_location?: string | null
          delivery_terms?: string | null
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          incoterm?: string | null
          internal_notes?: string | null
          lead_time?: string | null
          lead_time_days?: number | null
          loading_port?: string | null
          order_date?: string
          other_charges?: number
          packaging?: string | null
          partially_received_at?: string | null
          payment_terms?: string | null
          po_number?: string
          received_at?: string | null
          rfq_id?: string | null
          sent_at?: string | null
          shipping_amount?: number
          source?: Database["public"]["Enums"]["purchase_order_source"]
          status?: Database["public"]["Enums"]["purchase_order_status"]
          subtotal?: number
          supplier_id?: string
          supplier_notes?: string | null
          supplier_quotation_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_quotation_id_fkey"
            columns: ["supplier_quotation_id"]
            isOneToOne: true
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_purchase_items: {
        Row: {
          created_at: string
          id: string
          line_number: number
          line_subtotal: number
          line_total: number
          notes: string | null
          product_id: string
          quantity: number
          quick_purchase_id: string
          tax_amount: number
          tax_percentage: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_number: number
          line_subtotal: number
          line_total: number
          notes?: string | null
          product_id: string
          quantity: number
          quick_purchase_id: string
          tax_amount?: number
          tax_percentage?: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          line_number?: number
          line_subtotal?: number
          line_total?: number
          notes?: string | null
          product_id?: string
          quantity?: number
          quick_purchase_id?: string
          tax_amount?: number
          tax_percentage?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_purchase_items_quick_purchase_id_fkey"
            columns: ["quick_purchase_id"]
            isOneToOne: false
            referencedRelation: "payable_open_items"
            referencedColumns: ["quick_purchase_id"]
          },
          {
            foreignKeyName: "quick_purchase_items_quick_purchase_id_fkey"
            columns: ["quick_purchase_id"]
            isOneToOne: false
            referencedRelation: "quick_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_purchases: {
        Row: {
          balance_due: number
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          discount_amount: number
          exchange_rate: number
          grand_total: number
          id: string
          inventory_transaction_id: string | null
          notes: string | null
          paid_amount: number
          payment_method: string | null
          payment_opening_amount: number
          payment_reference: string | null
          payment_status: string
          payment_terms_days: number
          pending_tax_amount: number
          posted_at: string | null
          purchase_date: string
          purchase_number: string
          recoverable_tax_amount: number
          status: string
          store_name: string | null
          subtotal: number
          supplier_id: string | null
          supplier_invoice_date: string | null
          supplier_invoice_number: string | null
          supplier_trn: string | null
          tax_amount: number
          tax_invoice_verified: boolean
          tax_invoice_verified_at: string | null
          tax_treatment: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          balance_due?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_amount?: number
          exchange_rate?: number
          grand_total?: number
          id?: string
          inventory_transaction_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          payment_opening_amount?: number
          payment_reference?: string | null
          payment_status?: string
          payment_terms_days?: number
          pending_tax_amount?: number
          posted_at?: string | null
          purchase_date?: string
          purchase_number: string
          recoverable_tax_amount?: number
          status?: string
          store_name?: string | null
          subtotal?: number
          supplier_id?: string | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          supplier_trn?: string | null
          tax_amount?: number
          tax_invoice_verified?: boolean
          tax_invoice_verified_at?: string | null
          tax_treatment?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          balance_due?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_amount?: number
          exchange_rate?: number
          grand_total?: number
          id?: string
          inventory_transaction_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          payment_opening_amount?: number
          payment_reference?: string | null
          payment_status?: string
          payment_terms_days?: number
          pending_tax_amount?: number
          posted_at?: string | null
          purchase_date?: string
          purchase_number?: string
          recoverable_tax_amount?: number
          status?: string
          store_name?: string | null
          subtotal?: number
          supplier_id?: string | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          supplier_trn?: string | null
          tax_amount?: number
          tax_invoice_verified?: boolean
          tax_invoice_verified_at?: string | null
          tax_treatment?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_purchases_inventory_transaction_id_fkey"
            columns: ["inventory_transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_purchases_inventory_transaction_id_fkey"
            columns: ["inventory_transaction_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["inventory_transaction_id"]
          },
          {
            foreignKeyName: "quick_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "quick_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_purchases_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
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
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
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
      sales_margin_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          decision_notes: string | null
          id: string
          lowest_margin_percentage: number | null
          policy_minimum_percentage: number | null
          policy_warning_percentage: number | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string | null
          requested_reason: string
          sales_order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          decision_notes?: string | null
          id?: string
          lowest_margin_percentage?: number | null
          policy_minimum_percentage?: number | null
          policy_warning_percentage?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string | null
          requested_reason: string
          sales_order_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          decision_notes?: string | null
          id?: string
          lowest_margin_percentage?: number | null
          policy_minimum_percentage?: number | null
          policy_warning_percentage?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string | null
          requested_reason?: string
          sales_order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_margin_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_margin_approvals_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_margin_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_margin_approvals_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_by_sales_order"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_margin_approvals_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_margin_approvals_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "receivable_open_items"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_margin_approvals_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_margin_analysis"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_margin_approvals_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_margin_policy: {
        Row: {
          block_below_minimum: boolean
          block_when_cost_missing: boolean
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          minimum_margin_percentage: number
          policy_name: string
          updated_at: string
          updated_by: string | null
          warning_margin_percentage: number
        }
        Insert: {
          block_below_minimum?: boolean
          block_when_cost_missing?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          minimum_margin_percentage?: number
          policy_name?: string
          updated_at?: string
          updated_by?: string | null
          warning_margin_percentage?: number
        }
        Update: {
          block_below_minimum?: boolean
          block_when_cost_missing?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          minimum_margin_percentage?: number
          policy_name?: string
          updated_at?: string
          updated_by?: string | null
          warning_margin_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_margin_policy_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_margin_policy_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          allow_backorder: boolean
          created_at: string
          description: string | null
          discount_amount: number
          discount_percentage: number
          expected_delivery_date: string | null
          fulfilment_method: string
          fulfilment_status: string
          id: string
          item_name: string
          line_notes: string | null
          line_number: number
          line_subtotal: number
          line_total: number
          margin_cost_override: number | null
          margin_cost_override_reason: string | null
          procurement_lead_time_days: number
          procurement_notes: string | null
          procurement_required: boolean
          product_id: string | null
          quantity: number
          quantity_allocated: number
          quantity_cancelled: number
          quantity_fulfilled: number
          quantity_reserved: number
          quotation_item_id: string | null
          requested_delivery_date: string | null
          sales_order_id: string
          shortage_quantity: number
          sku: string | null
          tax_amount: number
          tax_percentage: number
          unit_id: string | null
          unit_price: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          allow_backorder?: boolean
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_percentage?: number
          expected_delivery_date?: string | null
          fulfilment_method?: string
          fulfilment_status?: string
          id?: string
          item_name: string
          line_notes?: string | null
          line_number: number
          line_subtotal?: number
          line_total?: number
          margin_cost_override?: number | null
          margin_cost_override_reason?: string | null
          procurement_lead_time_days?: number
          procurement_notes?: string | null
          procurement_required?: boolean
          product_id?: string | null
          quantity?: number
          quantity_allocated?: number
          quantity_cancelled?: number
          quantity_fulfilled?: number
          quantity_reserved?: number
          quotation_item_id?: string | null
          requested_delivery_date?: string | null
          sales_order_id: string
          shortage_quantity?: number
          sku?: string | null
          tax_amount?: number
          tax_percentage?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          allow_backorder?: boolean
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_percentage?: number
          expected_delivery_date?: string | null
          fulfilment_method?: string
          fulfilment_status?: string
          id?: string
          item_name?: string
          line_notes?: string | null
          line_number?: number
          line_subtotal?: number
          line_total?: number
          margin_cost_override?: number | null
          margin_cost_override_reason?: string | null
          procurement_lead_time_days?: number
          procurement_notes?: string | null
          procurement_required?: boolean
          product_id?: string | null
          quantity?: number
          quantity_allocated?: number
          quantity_cancelled?: number
          quantity_fulfilled?: number
          quantity_reserved?: number
          quotation_item_id?: string | null
          requested_delivery_date?: string | null
          sales_order_id?: string
          shortage_quantity?: number
          sku?: string | null
          tax_amount?: number
          tax_percentage?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_quotation_item_id_fkey"
            columns: ["quotation_item_id"]
            isOneToOne: false
            referencedRelation: "sales_quotation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_by_sales_order"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "receivable_open_items"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_margin_analysis"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          balance_due: number
          billing_address_id: string | null
          cancelled_at: string | null
          closed_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_contact_id: string | null
          customer_id: string
          customer_notes: string | null
          customer_reference: string | null
          delivery_terms: string | null
          discount_amount: number
          exchange_rate: number
          expected_delivery_date: string | null
          external_reference: string | null
          fulfilment_status: string
          grand_total: number
          id: string
          internal_notes: string | null
          order_date: string
          order_number: string
          paid_amount: number
          payment_status: string
          payment_terms: string | null
          payment_terms_days: number
          processing_at: string | null
          quotation_id: string | null
          requested_delivery_date: string | null
          shipping_address_id: string | null
          shipping_amount: number
          source: string
          status: string
          subtotal: number
          tax_amount: number
          updated_at: string
          updated_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          balance_due?: number
          billing_address_id?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_contact_id?: string | null
          customer_id: string
          customer_notes?: string | null
          customer_reference?: string | null
          delivery_terms?: string | null
          discount_amount?: number
          exchange_rate?: number
          expected_delivery_date?: string | null
          external_reference?: string | null
          fulfilment_status?: string
          grand_total?: number
          id?: string
          internal_notes?: string | null
          order_date?: string
          order_number: string
          paid_amount?: number
          payment_status?: string
          payment_terms?: string | null
          payment_terms_days?: number
          processing_at?: string | null
          quotation_id?: string | null
          requested_delivery_date?: string | null
          shipping_address_id?: string | null
          shipping_amount?: number
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          balance_due?: number
          billing_address_id?: string | null
          cancelled_at?: string | null
          closed_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_contact_id?: string | null
          customer_id?: string
          customer_notes?: string | null
          customer_reference?: string | null
          delivery_terms?: string | null
          discount_amount?: number
          exchange_rate?: number
          expected_delivery_date?: string | null
          external_reference?: string | null
          fulfilment_status?: string
          grand_total?: number
          id?: string
          internal_notes?: string | null
          order_date?: string
          order_number?: string
          paid_amount?: number
          payment_status?: string
          payment_terms?: string | null
          payment_terms_days?: number
          processing_at?: string | null
          quotation_id?: string | null
          requested_delivery_date?: string | null
          shipping_address_id?: string | null
          shipping_amount?: number
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_contact_id_fkey"
            columns: ["customer_contact_id"]
            isOneToOne: false
            referencedRelation: "customer_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "sales_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_quotation_items: {
        Row: {
          created_at: string
          description: string | null
          discount_amount: number
          discount_percentage: number
          id: string
          item_name: string
          line_notes: string | null
          line_number: number
          line_subtotal: number
          line_total: number
          product_id: string | null
          quantity: number
          requested_delivery_date: string | null
          sales_quotation_id: string
          sku: string | null
          tax_amount: number
          tax_percentage: number
          unit_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_percentage?: number
          id?: string
          item_name: string
          line_notes?: string | null
          line_number: number
          line_subtotal?: number
          line_total?: number
          product_id?: string | null
          quantity?: number
          requested_delivery_date?: string | null
          sales_quotation_id: string
          sku?: string | null
          tax_amount?: number
          tax_percentage?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_percentage?: number
          id?: string
          item_name?: string
          line_notes?: string | null
          line_number?: number
          line_subtotal?: number
          line_total?: number
          product_id?: string | null
          quantity?: number
          requested_delivery_date?: string | null
          sales_quotation_id?: string
          sku?: string | null
          tax_amount?: number
          tax_percentage?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_items_sales_quotation_id_fkey"
            columns: ["sales_quotation_id"]
            isOneToOne: false
            referencedRelation: "sales_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_quotations: {
        Row: {
          accepted_at: string | null
          billing_address_id: string | null
          cancelled_at: string | null
          converted_at: string | null
          converted_sales_order_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_contact_id: string | null
          customer_id: string
          customer_notes: string | null
          customer_reference: string | null
          delivery_terms: string | null
          discount_amount: number
          exchange_rate: number
          expired_at: string | null
          external_reference: string | null
          grand_total: number
          id: string
          internal_notes: string | null
          payment_terms: string | null
          payment_terms_days: number
          quotation_date: string
          quotation_number: string
          rejected_at: string | null
          sent_at: string | null
          shipping_address_id: string | null
          shipping_amount: number
          source: string
          status: string
          subtotal: number
          tax_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          warehouse_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          billing_address_id?: string | null
          cancelled_at?: string | null
          converted_at?: string | null
          converted_sales_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_contact_id?: string | null
          customer_id: string
          customer_notes?: string | null
          customer_reference?: string | null
          delivery_terms?: string | null
          discount_amount?: number
          exchange_rate?: number
          expired_at?: string | null
          external_reference?: string | null
          grand_total?: number
          id?: string
          internal_notes?: string | null
          payment_terms?: string | null
          payment_terms_days?: number
          quotation_date?: string
          quotation_number: string
          rejected_at?: string | null
          sent_at?: string | null
          shipping_address_id?: string | null
          shipping_amount?: number
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warehouse_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          billing_address_id?: string | null
          cancelled_at?: string | null
          converted_at?: string | null
          converted_sales_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_contact_id?: string | null
          customer_id?: string
          customer_notes?: string | null
          customer_reference?: string | null
          delivery_terms?: string | null
          discount_amount?: number
          exchange_rate?: number
          expired_at?: string | null
          external_reference?: string | null
          grand_total?: number
          id?: string
          internal_notes?: string | null
          payment_terms?: string | null
          payment_terms_days?: number
          quotation_date?: string
          quotation_number?: string
          rejected_at?: string | null
          sent_at?: string | null
          shipping_address_id?: string | null
          shipping_amount?: number
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_quotations_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotations_customer_contact_id_fkey"
            columns: ["customer_contact_id"]
            isOneToOne: false
            referencedRelation: "customer_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotations_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      supplier_payment_allocations: {
        Row: {
          allocation_source: string
          amount: number
          created_at: string
          id: string
          quick_purchase_id: string
          supplier_payment_id: string
        }
        Insert: {
          allocation_source?: string
          amount: number
          created_at?: string
          id?: string
          quick_purchase_id: string
          supplier_payment_id: string
        }
        Update: {
          allocation_source?: string
          amount?: number
          created_at?: string
          id?: string
          quick_purchase_id?: string
          supplier_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_allocations_quick_purchase_id_fkey"
            columns: ["quick_purchase_id"]
            isOneToOne: false
            referencedRelation: "payable_open_items"
            referencedColumns: ["quick_purchase_id"]
          },
          {
            foreignKeyName: "supplier_payment_allocations_quick_purchase_id_fkey"
            columns: ["quick_purchase_id"]
            isOneToOne: false
            referencedRelation: "quick_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_allocations_supplier_payment_id_fkey"
            columns: ["supplier_payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          account_transaction_id: string | null
          allocated_amount: number
          amount: number
          bank_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          exchange_rate: number
          financial_account_id: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          posted_at: string | null
          posted_by: string | null
          reference_number: string | null
          status: string
          supplier_id: string
          unallocated_amount: number
          updated_at: string
        }
        Insert: {
          account_transaction_id?: string | null
          allocated_amount?: number
          amount: number
          bank_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          exchange_rate?: number
          financial_account_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number: string
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          status?: string
          supplier_id: string
          unallocated_amount?: number
          updated_at?: string
        }
        Update: {
          account_transaction_id?: string | null
          allocated_amount?: number
          amount?: number
          bank_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          exchange_rate?: number
          financial_account_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          status?: string
          supplier_id?: string
          unallocated_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_account_transaction_id_fkey"
            columns: ["account_transaction_id"]
            isOneToOne: false
            referencedRelation: "account_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
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
          payment_terms_days: number
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
          payment_terms_days?: number
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
          payment_terms_days?: number
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
      warehouse_stock: {
        Row: {
          average_unit_cost: number
          created_at: string
          id: string
          last_counted_at: string | null
          last_transaction_at: string | null
          product_id: string
          quantity_available: number | null
          quantity_on_hand: number
          quantity_reserved: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          average_unit_cost?: number
          created_at?: string
          id?: string
          last_counted_at?: string | null
          last_transaction_at?: string | null
          product_id: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          average_unit_cost?: number
          created_at?: string
          id?: string
          last_counted_at?: string | null
          last_transaction_at?: string | null
          product_id?: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          code: string
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          code: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          code?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_receivable_summary: {
        Row: {
          available_credit: number | null
          company_name: string | null
          credit_limit: number | null
          credit_utilization_percentage: number | null
          currency_code: string | null
          current_amount: number | null
          customer_advance: number | null
          customer_id: string | null
          customer_name: string | null
          customer_number: string | null
          days_1_30_amount: number | null
          days_31_60_amount: number | null
          days_61_90_amount: number | null
          days_90_plus_amount: number | null
          maximum_days_overdue: number | null
          net_receivable_exposure: number | null
          oldest_due_date: string | null
          open_order_count: number | null
          over_credit_limit: boolean | null
          overdue_amount: number | null
          payment_terms_days: number | null
          total_receivable: number | null
        }
        Relationships: []
      }
      gl_chart_of_accounts: {
        Row: {
          account_class: string | null
          account_code: string | null
          account_name: string | null
          allow_manual_posting: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string | null
          is_active: boolean | null
          is_control_account: boolean | null
          is_posting_account: boolean | null
          is_system_account: boolean | null
          normal_balance: string | null
          parent_account_code: string | null
          parent_account_name: string | null
          parent_id: string | null
          statement_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "gl_chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_journal_balance: {
        Row: {
          base_difference: number | null
          is_balanced: boolean | null
          journal_date: string | null
          journal_entry_id: string | null
          journal_number: string | null
          line_count: number | null
          posting_date: string | null
          source_id: string | null
          source_number: string | null
          source_type: string | null
          status: string | null
          total_base_credit: number | null
          total_base_debit: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      payable_open_items: {
        Row: {
          aging_bucket: string | null
          base_outstanding_amount: number | null
          currency_code: string | null
          days_overdue: number | null
          due_date: string | null
          exchange_rate: number | null
          grand_total: number | null
          outstanding_amount: number | null
          paid_amount: number | null
          payment_status: string | null
          payment_terms_days: number | null
          purchase_date: string | null
          purchase_number: string | null
          quick_purchase_id: string | null
          status: string | null
          store_name: string | null
          supplier_id: string | null
          supplier_invoice_date: string | null
          supplier_invoice_number: string | null
          supplier_name: string | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "quick_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_purchases_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_by_category: {
        Row: {
          category_id: string | null
          category_name: string | null
          cogs: number | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          quantity_sold: number | null
          revenue: number | null
          sales_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_by_customer: {
        Row: {
          cogs: number | null
          customer_id: string | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          revenue: number | null
          sales_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_by_product: {
        Row: {
          cogs: number | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          item_name: string | null
          product_id: string | null
          quantity_sold: number | null
          revenue: number | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_by_sales_order: {
        Row: {
          cogs: number | null
          customer_id: string | null
          first_recognition_date: string | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          last_recognition_date: string | null
          order_number: string | null
          recognized_quantity: number | null
          revenue: number | null
          sales_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_by_sales_source: {
        Row: {
          cogs: number | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          quantity_sold: number | null
          revenue: number | null
          sales_order_count: number | null
          source: string | null
        }
        Relationships: []
      }
      profitability_by_warehouse: {
        Row: {
          cogs: number | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          quantity_sold: number | null
          revenue: number | null
          sales_order_count: number | null
          warehouse_code: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_daily_expenses: {
        Row: {
          direct_expenses: number | null
          financial_expenses: number | null
          operating_expenses: number | null
          other_expenses: number | null
          recognition_date: string | null
          total_expenses: number | null
        }
        Relationships: []
      }
      profitability_daily_sales: {
        Row: {
          cogs: number | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          quantity_sold: number | null
          recognition_date: string | null
          revenue: number | null
          sales_order_count: number | null
        }
        Relationships: []
      }
      profitability_expense_lines: {
        Row: {
          base_profitability_expense_amount: number | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          currency_code: string | null
          customer_id: string | null
          exchange_rate: number | null
          expense_id: string | null
          expense_number: string | null
          expense_type: string | null
          gross_amount: number | null
          net_amount: number | null
          notes: string | null
          payee_name: string | null
          pending_tax_amount: number | null
          profitability_expense_amount: number | null
          recognition_date: string | null
          recoverable_tax_amount: number | null
          sales_order_id: string | null
          supplier_id: string | null
          tax_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_by_sales_order"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "profitability_sales_lines"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "receivable_open_items"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_margin_analysis"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "expenses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payable_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_sales_lines: {
        Row: {
          base_cogs: number | null
          base_net_revenue: number | null
          cogs: number | null
          currency_code: string | null
          customer_id: string | null
          delivery_number: string | null
          delivery_order_id: string | null
          exchange_rate: number | null
          fulfilment_method: string | null
          gross_margin_percentage: number | null
          gross_profit: number | null
          gross_revenue: number | null
          inventory_transaction_id: string | null
          inventory_transaction_number: string | null
          item_name: string | null
          line_number: number | null
          net_revenue: number | null
          order_date: string | null
          order_number: string | null
          product_id: string | null
          recognition_date: string | null
          recognized_discount: number | null
          recognized_quantity: number | null
          sales_order_id: string | null
          sales_order_item_id: string | null
          sku: string | null
          unit_cost: number | null
          unit_selling_price: number | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_open_items: {
        Row: {
          aging_bucket: string | null
          base_outstanding_amount: number | null
          company_name: string | null
          credit_limit: number | null
          currency_code: string | null
          customer_currency_code: string | null
          customer_id: string | null
          customer_name: string | null
          customer_number: string | null
          customer_reference: string | null
          days_overdue: number | null
          due_date: string | null
          exchange_rate: number | null
          external_reference: string | null
          grand_total: number | null
          order_date: string | null
          order_number: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          payment_status: string | null
          payment_terms_days: number | null
          sales_order_id: string | null
          source: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_margin_analysis: {
        Row: {
          category_id: string | null
          currency_code: string | null
          current_unit_cost: number | null
          customer_id: string | null
          discount_amount: number | null
          effective_unit_selling_price: number | null
          estimated_cogs: number | null
          estimated_gross_profit: number | null
          estimated_margin_percentage: number | null
          exchange_rate: number | null
          fulfilment_method: string | null
          item_name: string | null
          line_number: number | null
          margin_cost_override: number | null
          margin_cost_override_reason: string | null
          margin_cost_source: string | null
          margin_status: string | null
          net_sales_value: number | null
          order_number: string | null
          product_id: string | null
          quantity: number | null
          sales_order_id: string | null
          sales_order_item_id: string | null
          sku: string | null
          source: string | null
          status: string | null
          unit_price: number | null
          warehouse_average_unit_cost: number | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_receivable_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payable_summary: {
        Row: {
          contact_name: string | null
          current_amount: number | null
          days_1_30_amount: number | null
          days_31_60_amount: number | null
          days_61_90_amount: number | null
          days_90_plus_amount: number | null
          email: string | null
          maximum_days_overdue: number | null
          net_payable_exposure: number | null
          oldest_due_date: string | null
          open_purchase_count: number | null
          overdue_amount: number | null
          payment_terms_days: number | null
          phone: string | null
          supplier_advance: number | null
          supplier_id: string | null
          supplier_name: string | null
          total_payable: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_gl_draft_journal_line: {
        Args: {
          p_base_credit: number
          p_base_debit: number
          p_credit: number
          p_customer_id?: string
          p_debit: number
          p_description?: string
          p_expense_category_id?: string
          p_financial_account_id?: string
          p_gl_account_id: string
          p_journal_entry_id: string
          p_manual_posting?: boolean
          p_product_id?: string
          p_source_line_id?: string
          p_source_line_number?: number
          p_source_line_type?: string
          p_supplier_id?: string
          p_warehouse_id?: string
        }
        Returns: string
      }
      apply_customer_advance_to_sales_order: {
        Args: { p_sales_order_id: string }
        Returns: number
      }
      apply_supplier_advance_to_quick_purchase: {
        Args: { p_quick_purchase_id: string }
        Returns: number
      }
      approve_sales_margin_exception: {
        Args: { p_decision_notes: string; p_sales_order_id: string }
        Returns: string
      }
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
      backfill_historical_receipt_payment_gl: { Args: never; Returns: Json }
      can_approve_rfqs: { Args: never; Returns: boolean }
      can_manage_rfqs: { Args: never; Returns: boolean }
      can_view_rfqs: { Args: never; Returns: boolean }
      cancel_account_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: undefined
      }
      cancel_customer_receipt: {
        Args: { p_reason: string; p_receipt_id: string }
        Returns: string
      }
      cancel_customer_receipt_with_account: {
        Args: { p_reason: string; p_receipt_id: string }
        Returns: string
      }
      cancel_customer_receipt_with_gl: {
        Args: { p_reason: string; p_receipt_id: string }
        Returns: string
      }
      cancel_delivery_order: {
        Args: { p_delivery_order_id: string }
        Returns: string
      }
      cancel_expense: {
        Args: { p_expense_id: string; p_reason: string }
        Returns: undefined
      }
      cancel_expense_with_gl: {
        Args: { p_expense_id: string; p_reason: string }
        Returns: string
      }
      cancel_financial_account_opening_balance: {
        Args: { p_financial_account_id: string; p_reason: string }
        Returns: undefined
      }
      cancel_financial_account_opening_balance_with_gl: {
        Args: { p_financial_account_id: string; p_reason: string }
        Returns: string
      }
      cancel_financial_account_transfer: {
        Args: { p_reason: string; p_transfer_id: string }
        Returns: string
      }
      cancel_financial_account_transfer_with_gl: {
        Args: { p_reason: string; p_transfer_id: string }
        Returns: string
      }
      cancel_sales_order_atomic: {
        Args: { p_sales_order_id: string }
        Returns: Json
      }
      cancel_supplier_payment: {
        Args: { p_reason: string; p_supplier_payment_id: string }
        Returns: string
      }
      cancel_supplier_payment_with_account: {
        Args: { p_reason: string; p_supplier_payment_id: string }
        Returns: string
      }
      cancel_supplier_payment_with_gl: {
        Args: { p_reason: string; p_supplier_payment_id: string }
        Returns: string
      }
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
      complete_goods_receipt: {
        Args: { p_goods_receipt_id: string }
        Returns: string
      }
      confirm_delivery_packed: {
        Args: { p_delivery_order_id: string }
        Returns: string
      }
      confirm_delivery_picked: {
        Args: { p_delivery_order_id: string }
        Returns: string
      }
      confirm_sales_order_atomic: {
        Args: { p_allow_negative_stock?: boolean; p_sales_order_id: string }
        Returns: Json
      }
      create_delivery_from_sales_order: {
        Args: { p_sales_order_id: string }
        Returns: string
      }
      create_draft_goods_receipt: {
        Args: { target_purchase_order_id: string; target_warehouse_id: string }
        Returns: string
      }
      create_gl_draft_journal: {
        Args: {
          p_currency_code?: string
          p_description: string
          p_exchange_rate?: number
          p_journal_date: string
          p_posting_date: string
          p_source_id: string
          p_source_number: string
          p_source_type: string
        }
        Returns: string
      }
      create_manual_gl_journal: {
        Args: {
          p_currency_code?: string
          p_description: string
          p_exchange_rate?: number
          p_journal_date: string
          p_lines: Json
          p_posting_date: string
          p_reference?: string
        }
        Returns: string
      }
      create_purchase_order: {
        Args: {
          p_currency_code?: string
          p_delivery_location?: string
          p_delivery_terms?: string
          p_expected_delivery_date?: string
          p_incoterm?: string
          p_internal_notes?: string
          p_items?: Json
          p_lead_time?: string
          p_lead_time_days?: number
          p_loading_port?: string
          p_packaging?: string
          p_payment_terms?: string
          p_source?: Database["public"]["Enums"]["purchase_order_source"]
          p_supplier_id: string
          p_supplier_notes?: string
          p_warranty?: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          delivery_terms: string | null
          discount_amount: number
          expected_delivery_date: string | null
          id: string
          incoterm: string | null
          internal_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          order_date: string
          other_charges: number
          packaging: string | null
          partially_received_at: string | null
          payment_terms: string | null
          po_number: string
          received_at: string | null
          rfq_id: string | null
          sent_at: string | null
          shipping_amount: number
          source: Database["public"]["Enums"]["purchase_order_source"]
          status: Database["public"]["Enums"]["purchase_order_status"]
          subtotal: number
          supplier_id: string
          supplier_notes: string | null
          supplier_quotation_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          warranty: string | null
        }
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_purchase_order_from_award: {
        Args: { target_rfq_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          delivery_location: string | null
          delivery_terms: string | null
          discount_amount: number
          expected_delivery_date: string | null
          id: string
          incoterm: string | null
          internal_notes: string | null
          lead_time: string | null
          lead_time_days: number | null
          loading_port: string | null
          order_date: string
          other_charges: number
          packaging: string | null
          partially_received_at: string | null
          payment_terms: string | null
          po_number: string
          received_at: string | null
          rfq_id: string | null
          sent_at: string | null
          shipping_amount: number
          source: Database["public"]["Enums"]["purchase_order_source"]
          status: Database["public"]["Enums"]["purchase_order_status"]
          subtotal: number
          supplier_id: string
          supplier_notes: string | null
          supplier_quotation_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          warranty: string | null
        }
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_rfq_transaction: {
        Args: { p_items: Json; p_rfq: Json; p_suppliers: Json }
        Returns: {
          rfq_id: string
          rfq_number: string
        }[]
      }
      create_supplier_quotation: {
        Args: {
          p_currency_code: string
          p_delivery_location: string
          p_discount_amount: number
          p_incoterm: string
          p_internal_notes: string
          p_items: Json
          p_lead_time_days: number
          p_loading_port: string
          p_other_charges: number
          p_packaging: string
          p_payment_terms: string
          p_quotation_date: string
          p_quotation_number: string
          p_rfq_id: string
          p_rfq_supplier_id: string
          p_shipping_amount: number
          p_supplier_notes: string
          p_tax_amount: number
          p_valid_until: string
          p_warranty: string
        }
        Returns: string
      }
      dispatch_delivery_order_atomic: {
        Args: { p_delivery_order_id: string }
        Returns: Json
      }
      generate_customer_number: { Args: never; Returns: string }
      generate_customer_receipt_number: { Args: never; Returns: string }
      generate_delivery_order_number: { Args: never; Returns: string }
      generate_inventory_transfer_number: { Args: never; Returns: string }
      generate_purchase_order_number: { Args: never; Returns: string }
      generate_rfq_number: { Args: never; Returns: string }
      generate_sales_order_number: { Args: never; Returns: string }
      generate_sales_quotation_number: { Args: never; Returns: string }
      generate_supplier_payment_number: { Args: never; Returns: string }
      get_expense_category_gl_account: {
        Args: { p_expense_category_id: string }
        Returns: string
      }
      get_financial_account_gl_account: {
        Args: { p_financial_account_id: string }
        Returns: string
      }
      get_gl_accounting_period: {
        Args: { p_posting_date: string; p_require_open?: boolean }
        Returns: string
      }
      get_inventory_dashboard_summary: { Args: never; Returns: Json }
      get_inventory_product_health: {
        Args: { p_limit?: number }
        Returns: Json
      }
      get_inventory_transaction_details: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      get_inventory_transaction_page: {
        Args: {
          p_from_date?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_sort_by?: string
          p_sort_direction?: string
          p_status?: string
          p_to_date?: string
          p_transaction_type?: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      get_mapped_gl_account: {
        Args: { p_mapping_key: string }
        Returns: string
      }
      get_profit_and_loss_summary: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: {
          cogs: number
          contribution_profit: number
          direct_expenses: number
          financial_expenses: number
          gross_margin_percentage: number
          gross_profit: number
          net_margin_percentage: number
          net_profit: number
          operating_expenses: number
          operating_profit: number
          other_expenses: number
          quantity_sold: number
          revenue: number
          sales_order_count: number
          total_expenses: number
        }[]
      }
      get_profitability_management_intelligence: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: Json
      }
      get_receivables_payables_intelligence: { Args: never; Returns: Json }
      get_warehouse_stock_page: {
        Args: {
          p_brand_id?: string
          p_category_id?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_sort_by?: string
          p_sort_direction?: string
          p_stock_status?: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      has_valid_sales_margin_approval: {
        Args: { p_sales_order_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      mark_delivery_delivered: {
        Args: { p_delivery_order_id: string }
        Returns: string
      }
      next_account_transaction_number: { Args: never; Returns: string }
      next_expense_number: { Args: never; Returns: string }
      next_financial_account_transfer_number: { Args: never; Returns: string }
      next_gl_journal_number: {
        Args: { p_journal_date?: string }
        Returns: string
      }
      post_account_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_currency_code: string
          p_description: string
          p_direction: string
          p_exchange_rate: number
          p_notes: string
          p_reference_id: string
          p_reference_number: string
          p_reference_type: string
          p_transaction_date: string
          p_transaction_type: string
        }
        Returns: string
      }
      post_customer_receipt: {
        Args: {
          p_allocations: Json
          p_amount: number
          p_bank_name: string
          p_cheque_date: string
          p_cheque_number: string
          p_currency_code: string
          p_customer_id: string
          p_exchange_rate: number
          p_notes: string
          p_payment_method: string
          p_receipt_date: string
          p_reference_number: string
        }
        Returns: string
      }
      post_customer_receipt_gl: {
        Args: { p_customer_receipt_id: string }
        Returns: string
      }
      post_customer_receipt_with_account: {
        Args: {
          p_allocations: Json
          p_amount: number
          p_bank_name: string
          p_cheque_date: string
          p_cheque_number: string
          p_currency_code: string
          p_customer_id: string
          p_exchange_rate: number
          p_financial_account_id: string
          p_notes: string
          p_payment_method: string
          p_receipt_date: string
          p_reference_number: string
        }
        Returns: string
      }
      post_erp_gl_journal: {
        Args: {
          p_currency_code: string
          p_description: string
          p_exchange_rate: number
          p_journal_date: string
          p_lines: Json
          p_posting_date: string
          p_source_id: string
          p_source_number: string
          p_source_type: string
        }
        Returns: string
      }
      post_expense: { Args: { p_expense_id: string }; Returns: string }
      post_expense_gl: { Args: { p_expense_id: string }; Returns: string }
      post_financial_account_opening_balance: {
        Args: {
          p_amount: number
          p_description?: string
          p_financial_account_id: string
          p_transaction_date: string
        }
        Returns: string
      }
      post_financial_account_opening_balance_gl: {
        Args: { p_financial_account_id: string }
        Returns: string
      }
      post_financial_account_transfer: {
        Args: {
          p_exchange_rate?: number
          p_from_account_id: string
          p_from_amount: number
          p_notes?: string
          p_reference_number?: string
          p_to_account_id: string
          p_to_amount: number
          p_transfer_date: string
        }
        Returns: string
      }
      post_financial_account_transfer_gl: {
        Args: { p_transfer_id: string }
        Returns: string
      }
      post_gl_journal: { Args: { p_journal_entry_id: string }; Returns: string }
      post_inventory_cogs_gl: {
        Args: { p_inventory_transaction_id: string }
        Returns: string
      }
      post_local_purchase_inventory: {
        Args: {
          p_internal_notes: string
          p_items: Json
          p_payment_method: string
          p_receipt_number: string
          p_store_name: string
          p_supplier_id: string
          p_transaction_date: string
          p_warehouse_id: string
        }
        Returns: string
      }
      post_manual_inventory_gl: {
        Args: { p_inventory_transaction_id: string }
        Returns: string
      }
      post_manual_inventory_transaction: {
        Args: {
          p_description: string
          p_internal_notes: string
          p_items: Json
          p_reference_number: string
          p_transaction_date: string
          p_transaction_type: string
          p_warehouse_id: string
        }
        Returns: string
      }
      post_manual_inventory_with_gl: {
        Args: {
          p_description: string
          p_internal_notes: string
          p_items: Json
          p_reference_number: string
          p_transaction_date: string
          p_transaction_type: string
          p_warehouse_id: string
        }
        Returns: string
      }
      post_quick_purchase_gl: {
        Args: { p_quick_purchase_id: string }
        Returns: string
      }
      post_sales_order_revenue_gl: {
        Args: { p_sales_order_id: string }
        Returns: string
      }
      post_supplier_advance_application_gl: {
        Args: { p_supplier_payment_allocation_id: string }
        Returns: string
      }
      post_supplier_payment: {
        Args: {
          p_allocations: Json
          p_amount: number
          p_bank_name: string
          p_cheque_date: string
          p_cheque_number: string
          p_currency_code: string
          p_exchange_rate: number
          p_notes: string
          p_payment_date: string
          p_payment_method: string
          p_reference_number: string
          p_supplier_id: string
        }
        Returns: string
      }
      post_supplier_payment_gl: {
        Args: { p_supplier_payment_id: string }
        Returns: string
      }
      post_supplier_payment_with_account: {
        Args: {
          p_allocations: Json
          p_amount: number
          p_bank_name: string
          p_cheque_date: string
          p_cheque_number: string
          p_currency_code: string
          p_exchange_rate: number
          p_financial_account_id: string
          p_notes: string
          p_payment_date: string
          p_payment_method: string
          p_reference_number: string
          p_supplier_id: string
        }
        Returns: string
      }
      recalculate_quotation_totals: {
        Args: { target_quotation_id: string }
        Returns: undefined
      }
      reject_sales_margin_exception: {
        Args: { p_decision_notes: string; p_sales_order_id: string }
        Returns: string
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
      request_sales_margin_approval: {
        Args: { p_reason: string; p_sales_order_id: string }
        Returns: string
      }
      restore_product_supplier: {
        Args: { p_mapping_id: string; p_product_id: string }
        Returns: undefined
      }
      reverse_erp_source_gl_journal: {
        Args: {
          p_reason: string
          p_reversal_date: string
          p_source_id: string
          p_source_type: string
        }
        Returns: string
      }
      reverse_gl_journal: {
        Args: {
          p_journal_entry_id: string
          p_reason: string
          p_reversal_date: string
        }
        Returns: string
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
      start_delivery_packing: {
        Args: { p_delivery_order_id: string }
        Returns: string
      }
      start_delivery_picking: {
        Args: { p_delivery_order_id: string }
        Returns: string
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
      sync_customer_receipt_totals: {
        Args: { p_receipt_id: string }
        Returns: undefined
      }
      sync_financial_account_balance: {
        Args: { p_account_id: string }
        Returns: number
      }
      sync_quick_purchase_paid_amount: {
        Args: { p_quick_purchase_id: string }
        Returns: undefined
      }
      sync_sales_order_paid_amount: {
        Args: { p_sales_order_id: string }
        Returns: undefined
      }
      sync_supplier_payment_totals: {
        Args: { p_supplier_payment_id: string }
        Returns: undefined
      }
      synchronize_sales_order_fulfilment: {
        Args: { p_sales_order_id: string }
        Returns: string
      }
      validate_gl_journal: {
        Args: { p_journal_entry_id: string }
        Returns: boolean
      }
      validate_gl_posting_account: {
        Args: { p_gl_account_id: string; p_manual_posting?: boolean }
        Returns: undefined
      }
      validate_payment_financial_account: {
        Args: {
          p_currency_code: string
          p_financial_account_id: string
          p_payment_method: string
        }
        Returns: undefined
      }
      validate_sales_order_margin: {
        Args: { p_sales_order_id: string }
        Returns: Json
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
      purchase_order_source: "manual" | "rfq_award" | "reorder"
      purchase_order_status:
        | "draft"
        | "approved"
        | "sent"
        | "partially_received"
        | "received"
        | "closed"
        | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "manager", "sales", "viewer"],
      document_type: ["catalog", "datasheet", "manual", "certificate", "other"],
      product_status: ["draft", "pending_review", "published", "archived"],
      purchase_order_source: ["manual", "rfq_award", "reorder"],
      purchase_order_status: [
        "draft",
        "approved",
        "sent",
        "partially_received",
        "received",
        "closed",
        "cancelled",
      ],
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
