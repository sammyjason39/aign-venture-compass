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
      allowed_users: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      judge_scores: {
        Row: {
          created_at: string
          id: string
          judge_id: string
          justification: string | null
          scores: Json
          startup_id: string
          submitted: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          judge_id: string
          justification?: string | null
          scores?: Json
          startup_id: string
          submitted?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          judge_id?: string
          justification?: string | null
          scores?: Json
          startup_id?: string
          submitted?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_scores_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          salutation: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          salutation?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          salutation?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      startups: {
        Row: {
          ai_error: string | null
          ai_recommendation: string | null
          ai_risks: Json | null
          ai_scores: Json | null
          ai_status: Database["public"]["Enums"]["ai_eval_status"]
          ai_strengths: Json | null
          ai_summary: string | null
          ai_weaknesses: Json | null
          archetype: string | null
          archetype_confidence: number | null
          archetype_custom: string | null
          created_at: string
          created_by: string | null
          deck_path: string | null
          description: string
          financial_data: Json | null
          financial_error: string | null
          financial_generated_at: string | null
          financial_pdf_path: string | null
          financial_report_path: string | null
          financial_status: string | null
          financial_summary: string | null
          id: string
          name: string
          one_liner: string | null
          sector: string | null
          sort_order: number | null
          status: Database["public"]["Enums"]["startup_status"]
          transcript_path: string | null
          updated_at: string
          valuation: string | null
        }
        Insert: {
          ai_error?: string | null
          ai_recommendation?: string | null
          ai_risks?: Json | null
          ai_scores?: Json | null
          ai_status?: Database["public"]["Enums"]["ai_eval_status"]
          ai_strengths?: Json | null
          ai_summary?: string | null
          ai_weaknesses?: Json | null
          archetype?: string | null
          archetype_confidence?: number | null
          archetype_custom?: string | null
          created_at?: string
          created_by?: string | null
          deck_path?: string | null
          description?: string
          financial_data?: Json | null
          financial_error?: string | null
          financial_generated_at?: string | null
          financial_pdf_path?: string | null
          financial_report_path?: string | null
          financial_status?: string | null
          financial_summary?: string | null
          id?: string
          name: string
          one_liner?: string | null
          sector?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["startup_status"]
          transcript_path?: string | null
          updated_at?: string
          valuation?: string | null
        }
        Update: {
          ai_error?: string | null
          ai_recommendation?: string | null
          ai_risks?: Json | null
          ai_scores?: Json | null
          ai_status?: Database["public"]["Enums"]["ai_eval_status"]
          ai_strengths?: Json | null
          ai_summary?: string | null
          ai_weaknesses?: Json | null
          archetype?: string | null
          archetype_confidence?: number | null
          archetype_custom?: string | null
          created_at?: string
          created_by?: string | null
          deck_path?: string | null
          description?: string
          financial_data?: Json | null
          financial_error?: string | null
          financial_generated_at?: string | null
          financial_pdf_path?: string | null
          financial_report_path?: string | null
          financial_status?: string | null
          financial_summary?: string | null
          id?: string
          name?: string
          one_liner?: string | null
          sector?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["startup_status"]
          transcript_path?: string | null
          updated_at?: string
          valuation?: string | null
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
      startup_impact_aggregates: {
        Args: never
        Returns: {
          impact_count: number
          impact_sum: number
          startup_id: string
        }[]
      }
      startup_judge_aggregates: {
        Args: never
        Returns: {
          judge_count: number
          judge_sum: number
          startup_id: string
        }[]
      }
    }
    Enums: {
      ai_eval_status: "pending" | "processing" | "done" | "error"
      app_role: "admin" | "judge"
      startup_status: "draft" | "open" | "closed"
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
      ai_eval_status: ["pending", "processing", "done", "error"],
      app_role: ["admin", "judge"],
      startup_status: ["draft", "open", "closed"],
    },
  },
} as const
