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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bakes: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          image_position: string | null
          image_url: string
          is_archived: boolean
          is_visible: boolean
          scheduled_publish_date: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          image_position?: string | null
          image_url: string
          is_archived?: boolean
          is_visible?: boolean
          scheduled_publish_date?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          image_position?: string | null
          image_url?: string
          is_archived?: boolean
          is_visible?: boolean
          scheduled_publish_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name: string
          show_in_filter: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          show_in_filter?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          show_in_filter?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      event_day_summaries: {
        Row: {
          close_time: string | null
          created_at: string
          day_number: number
          event_id: string
          id: string
          items_sold: number
          open_time: string
          revenue: number
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          day_number: number
          event_id: string
          id?: string
          items_sold?: number
          open_time: string
          revenue?: number
        }
        Update: {
          close_time?: string | null
          created_at?: string
          day_number?: number
          event_id?: string
          id?: string
          items_sold?: number
          open_time?: string
          revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_day_summaries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_deals: {
        Row: {
          category: string | null
          created_at: string
          deal_price: number
          description: string | null
          event_id: string
          id: string
          name: string
          quantity_required: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deal_price: number
          description?: string | null
          event_id: string
          id?: string
          name: string
          quantity_required?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deal_price?: number
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          quantity_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_deals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          event_id: string
          expense_date: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          event_id: string
          expense_date?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          event_id?: string
          expense_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_items: {
        Row: {
          bake_id: string | null
          category: string | null
          cogs: number
          created_at: string
          event_id: string
          id: string
          name: string
          price: number
          quantity_sold: number
          starting_quantity: number
          updated_at: string
        }
        Insert: {
          bake_id?: string | null
          category?: string | null
          cogs?: number
          created_at?: string
          event_id: string
          id?: string
          name: string
          price: number
          quantity_sold?: number
          starting_quantity?: number
          updated_at?: string
        }
        Update: {
          bake_id?: string | null
          category?: string | null
          cogs?: number
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          price?: number
          quantity_sold?: number
          starting_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_items_bake_id_fkey"
            columns: ["bake_id"]
            isOneToOne: false
            referencedRelation: "bakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sales: {
        Row: {
          created_at: string
          event_item_id: string
          id: string
          order_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          event_item_id: string
          id?: string
          order_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          event_item_id?: string
          id?: string
          order_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_sales_event_item_id_fkey"
            columns: ["event_item_id"]
            isOneToOne: false
            referencedRelation: "event_items"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedules: {
        Row: {
          created_at: string
          date: string
          day_number: number
          end_time: string | null
          event_id: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          date: string
          day_number?: number
          end_time?: string | null
          event_id: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string
          date?: string
          day_number?: number
          end_time?: string | null
          event_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          current_day: number | null
          day_close_time: string | null
          day_open_time: string | null
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_day?: number | null
          day_close_time?: string | null
          day_open_time?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_day?: number | null
          day_close_time?: string | null
          day_open_time?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_subcategories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          expense_date: string | null
          id: string
          name: string
          notes: string | null
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_date?: string | null
          id?: string
          name: string
          notes?: string | null
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          subcategory_id?: string | null
          updated_at?: string
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
            foreignKeyName: "expenses_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "expense_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string
          description: string | null
          id: string
          minimum_stock: number | null
          name: string
          notes: string | null
          quantity: number
          supplier: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          minimum_stock?: number | null
          name: string
          notes?: string | null
          quantity?: number
          supplier?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          minimum_stock?: number | null
          name?: string
          notes?: string | null
          quantity?: number
          supplier?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_purchases: {
        Row: {
          cost_per_unit: number
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          purchase_date: string
          quantity: number
          supplier: string | null
          total_cost: number
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          purchase_date?: string
          quantity?: number
          supplier?: string | null
          total_cost?: number
          unit?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          purchase_date?: string
          quantity?: number
          supplier?: string | null
          total_cost?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchases_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_notes: string | null
          bake_id: string | null
          bake_title: string | null
          created_at: string
          custom_description: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          order_type: Database["public"]["Enums"]["order_type"]
          pickup_date: string | null
          quantity: number
          requested_date: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          bake_id?: string | null
          bake_title?: string | null
          created_at?: string
          custom_description?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          order_type: Database["public"]["Enums"]["order_type"]
          pickup_date?: string | null
          quantity?: number
          requested_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          bake_id?: string | null
          bake_title?: string | null
          created_at?: string
          custom_description?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          pickup_date?: string | null
          quantity?: number
          requested_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_bake_id_fkey"
            columns: ["bake_id"]
            isOneToOne: false
            referencedRelation: "bakes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
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
      yearly_archives: {
        Row: {
          archived_at: string
          created_at: string
          events_revenue: number
          id: string
          net_profit: number
          orders_revenue: number
          total_events_completed: number
          total_expenses: number
          total_items_sold: number
          total_orders_completed: number
          total_revenue: number
          year: number
        }
        Insert: {
          archived_at?: string
          created_at?: string
          events_revenue?: number
          id?: string
          net_profit?: number
          orders_revenue?: number
          total_events_completed?: number
          total_expenses?: number
          total_items_sold?: number
          total_orders_completed?: number
          total_revenue?: number
          year: number
        }
        Update: {
          archived_at?: string
          created_at?: string
          events_revenue?: number
          id?: string
          net_profit?: number
          orders_revenue?: number
          total_events_completed?: number
          total_expenses?: number
          total_items_sold?: number
          total_orders_completed?: number
          total_revenue?: number
          year?: number
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
      app_role: "admin" | "user"
      event_status: "draft" | "active" | "completed" | "archived"
      order_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      order_type: "existing_bake" | "custom"
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
      app_role: ["admin", "user"],
      event_status: ["draft", "active", "completed", "archived"],
      order_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      order_type: ["existing_bake", "custom"],
    },
  },
} as const
