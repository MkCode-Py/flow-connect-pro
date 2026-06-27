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
      automation_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          event: string
          flow_id: string | null
          id: string
          node_id: string | null
          owner_id: string
          payload: Json
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          event: string
          flow_id?: string | null
          id?: string
          node_id?: string | null
          owner_id: string
          payload?: Json
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          event?: string
          flow_id?: string | null
          id?: string
          node_id?: string | null
          owner_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          automation_enabled: boolean
          company_name: string | null
          created_at: string
          default_message_delay_ms: number
          description: string | null
          max_auto_messages_per_conversation: number
          off_hours_message: string | null
          on_human_handoff: string
          on_paused_behavior: string
          owner_id: string
          phone: string | null
          public_name: string | null
          service_active: boolean
          service_hours: Json
          updated_at: string
          website: string | null
        }
        Insert: {
          automation_enabled?: boolean
          company_name?: string | null
          created_at?: string
          default_message_delay_ms?: number
          description?: string | null
          max_auto_messages_per_conversation?: number
          off_hours_message?: string | null
          on_human_handoff?: string
          on_paused_behavior?: string
          owner_id: string
          phone?: string | null
          public_name?: string | null
          service_active?: boolean
          service_hours?: Json
          updated_at?: string
          website?: string | null
        }
        Update: {
          automation_enabled?: boolean
          company_name?: string | null
          created_at?: string
          default_message_delay_ms?: number
          description?: string | null
          max_auto_messages_per_conversation?: number
          off_hours_message?: string | null
          on_human_handoff?: string
          on_paused_behavior?: string
          owner_id?: string
          phone?: string | null
          public_name?: string | null
          service_active?: boolean
          service_hours?: Json
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_tags: {
        Row: {
          contact_id: string
          owner_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          owner_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          owner_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          automation_paused: boolean
          company: string | null
          created_at: string
          custom_fields: Json
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          automation_paused?: boolean
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          automation_paused?: boolean
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          automation_paused: boolean
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          owner_id: string
          status: Database["public"]["Enums"]["conversation_status"]
          unread_count: number
          updated_at: string
        }
        Insert: {
          automation_paused?: boolean
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Update: {
          automation_paused?: boolean
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          key: string
          label: string
          owner_id: string
          type: Database["public"]["Enums"]["custom_field_type"]
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          key: string
          label: string
          owner_id: string
          type?: Database["public"]["Enums"]["custom_field_type"]
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          key?: string
          label?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["custom_field_type"]
        }
        Relationships: []
      }
      flow_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      flows: {
        Row: {
          connections: number
          created_at: string
          ctr: number
          executions: number
          folder_id: string | null
          graph: Json
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["flow_kind"]
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          connections?: number
          created_at?: string
          ctr?: number
          executions?: number
          folder_id?: string | null
          graph?: Json
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["flow_kind"]
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          connections?: number
          created_at?: string
          ctr?: number
          executions?: number
          folder_id?: string | null
          graph?: Json
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["flow_kind"]
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "flow_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          created_at: string
          executions: number
          flow_id: string | null
          id: string
          is_active: boolean
          last_match_at: string | null
          match_rule: Database["public"]["Enums"]["keyword_match_rule"]
          name: string
          notes: string | null
          owner_id: string
          priority: number
          terms: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          executions?: number
          flow_id?: string | null
          id?: string
          is_active?: boolean
          last_match_at?: string | null
          match_rule?: Database["public"]["Enums"]["keyword_match_rule"]
          name: string
          notes?: string | null
          owner_id: string
          priority?: number
          terms?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          executions?: number
          flow_id?: string | null
          id?: string
          is_active?: boolean
          last_match_at?: string | null
          match_rule?: Database["public"]["Enums"]["keyword_match_rule"]
          name?: string
          notes?: string | null
          owner_id?: string
          priority?: number
          terms?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keywords_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          media_url: string | null
          owner_id: string
          sent_by: Database["public"]["Enums"]["message_sent_by"]
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          media_url?: string | null
          owner_id: string
          sent_by: Database["public"]["Enums"]["message_sent_by"]
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          media_url?: string | null
          owner_id?: string
          sent_by?: Database["public"]["Enums"]["message_sent_by"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
      quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean
          owner_id: string
          shortcut: string
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id: string
          shortcut: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string
          shortcut?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sequences: {
        Row: {
          created_at: string
          executions: number
          flow_id: string | null
          id: string
          interval_minutes: number
          is_active: boolean
          name: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          executions?: number
          flow_id?: string | null
          id?: string
          interval_minutes?: number
          is_active?: boolean
          name: string
          notes?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          executions?: number
          flow_id?: string | null
          id?: string
          interval_minutes?: number
          is_active?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_instance_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          instance_id: string
          message: string | null
          metadata: Json
          owner_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          instance_id: string
          message?: string | null
          metadata?: Json
          owner_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          instance_id?: string
          message?: string | null
          metadata?: Json
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_instance_logs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          body: Json
          created_at: string
          event: string
          headers: Json
          id: string
          is_active: boolean
          last_test_result: Json | null
          last_tested_at: string | null
          method: string
          name: string
          owner_id: string
          updated_at: string
          url: string
        }
        Insert: {
          body?: Json
          created_at?: string
          event?: string
          headers?: Json
          id?: string
          is_active?: boolean
          last_test_result?: Json | null
          last_tested_at?: string | null
          method?: string
          name: string
          owner_id: string
          updated_at?: string
          url: string
        }
        Update: {
          body?: Json
          created_at?: string
          event?: string
          headers?: Json
          id?: string
          is_active?: boolean
          last_test_result?: Json | null
          last_tested_at?: string | null
          method?: string
          name?: string
          owner_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          connected_phone: string | null
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          last_activity_at: string | null
          last_qr: string | null
          last_qr_at: string | null
          last_seen_at: string | null
          name: string
          owner_id: string
          session_saved: boolean
          status: Database["public"]["Enums"]["wa_instance_status"]
          updated_at: string
        }
        Insert: {
          connected_phone?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          last_activity_at?: string | null
          last_qr?: string | null
          last_qr_at?: string | null
          last_seen_at?: string | null
          name: string
          owner_id: string
          session_saved?: boolean
          status?: Database["public"]["Enums"]["wa_instance_status"]
          updated_at?: string
        }
        Update: {
          connected_phone?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          last_activity_at?: string | null
          last_qr?: string | null
          last_qr_at?: string | null
          last_seen_at?: string | null
          name?: string
          owner_id?: string
          session_saved?: boolean
          status?: Database["public"]["Enums"]["wa_instance_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      conversation_status: "open" | "pending" | "resolved" | "human_required"
      custom_field_type:
        | "text"
        | "number"
        | "email"
        | "phone"
        | "date"
        | "boolean"
      flow_kind:
        | "custom"
        | "welcome"
        | "default_reply"
        | "media_default"
        | "post_service"
      keyword_match_rule:
        | "contains"
        | "starts_with"
        | "exact"
        | "contains_any"
        | "contains_all"
      message_direction: "in" | "out" | "system"
      message_sent_by: "bot" | "human" | "contact" | "system"
      wa_instance_status:
        | "disconnected"
        | "qr"
        | "connecting"
        | "connected"
        | "error"
        | "qr_pending"
        | "reconnecting"
        | "session_expired"
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
      conversation_status: ["open", "pending", "resolved", "human_required"],
      custom_field_type: [
        "text",
        "number",
        "email",
        "phone",
        "date",
        "boolean",
      ],
      flow_kind: [
        "custom",
        "welcome",
        "default_reply",
        "media_default",
        "post_service",
      ],
      keyword_match_rule: [
        "contains",
        "starts_with",
        "exact",
        "contains_any",
        "contains_all",
      ],
      message_direction: ["in", "out", "system"],
      message_sent_by: ["bot", "human", "contact", "system"],
      wa_instance_status: [
        "disconnected",
        "qr",
        "connecting",
        "connected",
        "error",
        "qr_pending",
        "reconnecting",
        "session_expired",
      ],
    },
  },
} as const
