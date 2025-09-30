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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          assessment_complete: boolean | null
          assistant_id: string | null
          baseline_scores: Json | null
          completed_at: string | null
          current_stage: string | null
          id: string
          persona_snapshot: Json | null
          principle_coverage: Json | null
          started_at: string
          status: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          assessment_complete?: boolean | null
          assistant_id?: string | null
          baseline_scores?: Json | null
          completed_at?: string | null
          current_stage?: string | null
          id?: string
          persona_snapshot?: Json | null
          principle_coverage?: Json | null
          started_at?: string
          status?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          assessment_complete?: boolean | null
          assistant_id?: string | null
          baseline_scores?: Json | null
          completed_at?: string | null
          current_stage?: string | null
          id?: string
          persona_snapshot?: Json | null
          principle_coverage?: Json | null
          started_at?: string
          status?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          conversation_id: string
          created_at: string
          data: Json | null
          id: string
          summary: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          data?: Json | null
          id?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          data?: Json | null
          id?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          assessment_stage: string | null
          content: string
          conversation_id: string
          created_at: string
          generated_by_ai: boolean | null
          id: string
          leadership_insights: Json | null
          message_type: string
          principle_focus: string | null
          question_options: Json | null
          question_scale_labels: Json | null
          question_scale_max: number | null
          question_scale_min: number | null
          question_type: string | null
          requires_followup: boolean | null
          response_quality_score: number | null
          user_id: string
        }
        Insert: {
          assessment_stage?: string | null
          content: string
          conversation_id: string
          created_at?: string
          generated_by_ai?: boolean | null
          id?: string
          leadership_insights?: Json | null
          message_type: string
          principle_focus?: string | null
          question_options?: Json | null
          question_scale_labels?: Json | null
          question_scale_max?: number | null
          question_scale_min?: number | null
          question_type?: string | null
          requires_followup?: boolean | null
          response_quality_score?: number | null
          user_id: string
        }
        Update: {
          assessment_stage?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          generated_by_ai?: boolean | null
          id?: string
          leadership_insights?: Json | null
          message_type?: string
          principle_focus?: string | null
          question_options?: Json | null
          question_scale_labels?: Json | null
          question_scale_max?: number | null
          question_scale_min?: number | null
          question_type?: string | null
          requires_followup?: boolean | null
          response_quality_score?: number | null
          user_id?: string
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
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      response_memories: {
        Row: {
          conversation_id: string
          created_at: string
          follow_up_needed: boolean
          id: string
          insights: Json
          message_id: string
          patterns: Json
          principle: string
          quality_metrics: Json
          response_text: string
          sentiment: Json
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          follow_up_needed?: boolean
          id?: string
          insights?: Json
          message_id: string
          patterns?: Json
          principle: string
          quality_metrics?: Json
          response_text: string
          sentiment?: Json
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          follow_up_needed?: boolean
          id?: string
          insights?: Json
          message_id?: string
          patterns?: Json
          principle?: string
          quality_metrics?: Json
          response_text?: string
          sentiment?: Json
          user_id?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
