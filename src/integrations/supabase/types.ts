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
      categories: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      patient_schedules: {
        Row: {
          created_at: string
          created_by: string
          id: string
          owner_id: string
          patient_id: string
          schedule_date: string | null
          schedule_time: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          owner_id: string
          patient_id: string
          schedule_date?: string | null
          schedule_time: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          owner_id?: string
          patient_id?: string
          schedule_date?: string | null
          schedule_time?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_schedules_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          category_id: string
          cpf: string | null
          created_at: string
          created_by: string
          health_plan: string | null
          id: string
          name: string
          owner_id: string
          pathology: string | null
          phone: string | null
          registration: string | null
          responsible: string | null
          session_label: string | null
          session_time: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          cpf?: string | null
          created_at?: string
          created_by: string
          health_plan?: string | null
          id?: string
          name: string
          owner_id: string
          pathology?: string | null
          phone?: string | null
          registration?: string | null
          responsible?: string | null
          session_label?: string | null
          session_time?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          cpf?: string | null
          created_at?: string
          created_by?: string
          health_plan?: string | null
          id?: string
          name?: string
          owner_id?: string
          pathology?: string | null
          phone?: string | null
          registration?: string | null
          responsible?: string | null
          session_label?: string | null
          session_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          owner_id: string
          specialty: Database["public"]["Enums"]["specialty"] | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          owner_id: string
          specialty?: Database["public"]["Enums"]["specialty"] | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          owner_id?: string
          specialty?: Database["public"]["Enums"]["specialty"] | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string | null
          id: string
          notes: string | null
          owner_id: string
          patient_id: string
          session_date: string
          session_time: string | null
          status: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          patient_id: string
          session_date?: string
          session_time?: string | null
          status?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          patient_id?: string
          session_date?: string
          session_time?: string | null
          status?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      current_owner_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      specialty:
        | "fonoaudiologo"
        | "terapeuta_ocupacional"
        | "fisioterapeuta"
        | "psicologo"
        | "musicoterapeuta"
        | "nutricionista"
        | "psicopedagogo"
        | "outro"
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
      app_role: ["admin", "staff"],
      specialty: [
        "fonoaudiologo",
        "terapeuta_ocupacional",
        "fisioterapeuta",
        "psicologo",
        "musicoterapeuta",
        "nutricionista",
        "psicopedagogo",
        "outro",
      ],
    },
  },
} as const
