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
      applicant_profiles: {
        Row: {
          created_at: string
          current_salary: string | null
          education: Json | null
          email: string | null
          expected_salary: string | null
          experience: Json | null
          experience_years: number | null
          full_name: string | null
          github_url: string | null
          linkedin_url: string | null
          notice_period: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_job_types: string[] | null
          skills: string[] | null
          updated_at: string
          user_id: string
          work_authorization: string | null
        }
        Insert: {
          created_at?: string
          current_salary?: string | null
          education?: Json | null
          email?: string | null
          expected_salary?: string | null
          experience?: Json | null
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_job_types?: string[] | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
          work_authorization?: string | null
        }
        Update: {
          created_at?: string
          current_salary?: string | null
          education?: Json | null
          email?: string | null
          expected_salary?: string | null
          experience?: Json | null
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_job_types?: string[] | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
          work_authorization?: string | null
        }
        Relationships: []
      }
      application_logs: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          level: string
          message: string | null
          queue_id: string | null
          screenshot_url: string | null
          step: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          level?: string
          message?: string | null
          queue_id?: string | null
          screenshot_url?: string | null
          step?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          level?: string
          message?: string | null
          queue_id?: string | null
          screenshot_url?: string | null
          step?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "auto_apply_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      applied_jobs: {
        Row: {
          applied_at: string
          id: string
          job_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auto_apply_queue: {
        Row: {
          apply_url: string | null
          ats_platform: string | null
          attempts: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string
          lease_expires_at: string | null
          max_attempts: number
          result: Json | null
          status: Database["public"]["Enums"]["aa_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          apply_url?: string | null
          ats_platform?: string | null
          attempts?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id: string
          lease_expires_at?: string | null
          max_attempts?: number
          result?: Json | null
          status?: Database["public"]["Enums"]["aa_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          apply_url?: string | null
          ats_platform?: string | null
          attempts?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string
          lease_expires_at?: string | null
          max_attempts?: number
          result?: Json | null
          status?: Database["public"]["Enums"]["aa_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auto_apply_settings: {
        Row: {
          ai_autoanswer: boolean
          blacklisted_companies: string[] | null
          daily_limit: number
          default_resume_id: string | null
          demo_mode: boolean
          enabled: boolean
          experience_buckets: string[] | null
          gmail_connected: boolean
          linkedin_connected: boolean
          min_ats_score: number
          min_salary: number | null
          otp_autofill: boolean
          preferred_locations: string[] | null
          preferred_roles: string[] | null
          updated_at: string
          user_id: string
          work_modes: string[] | null
        }
        Insert: {
          ai_autoanswer?: boolean
          blacklisted_companies?: string[] | null
          daily_limit?: number
          default_resume_id?: string | null
          demo_mode?: boolean
          enabled?: boolean
          experience_buckets?: string[] | null
          gmail_connected?: boolean
          linkedin_connected?: boolean
          min_ats_score?: number
          min_salary?: number | null
          otp_autofill?: boolean
          preferred_locations?: string[] | null
          preferred_roles?: string[] | null
          updated_at?: string
          user_id: string
          work_modes?: string[] | null
        }
        Update: {
          ai_autoanswer?: boolean
          blacklisted_companies?: string[] | null
          daily_limit?: number
          default_resume_id?: string | null
          demo_mode?: boolean
          enabled?: boolean
          experience_buckets?: string[] | null
          gmail_connected?: boolean
          linkedin_connected?: boolean
          min_ats_score?: number
          min_salary?: number | null
          otp_autofill?: boolean
          preferred_locations?: string[] | null
          preferred_roles?: string[] | null
          updated_at?: string
          user_id?: string
          work_modes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_apply_settings_default_resume_id_fkey"
            columns: ["default_resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      job_skills: {
        Row: {
          id: string
          job_id: string
          skill_id: string
        }
        Insert: {
          id?: string
          job_id: string
          skill_id: string
        }
        Update: {
          id?: string
          job_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_link: string | null
          company_id: string | null
          company_name: string
          created_at: string
          description: string | null
          experience_bucket: string | null
          experience_required: string | null
          id: string
          location: string
          posted_date: string | null
          salary: string | null
          skills_extracted: string[] | null
          source: string
          source_url: string | null
          title: string
          work_mode: string | null
        }
        Insert: {
          apply_link?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          experience_bucket?: string | null
          experience_required?: string | null
          id?: string
          location?: string
          posted_date?: string | null
          salary?: string | null
          skills_extracted?: string[] | null
          source?: string
          source_url?: string | null
          title: string
          work_mode?: string | null
        }
        Update: {
          apply_link?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          experience_bucket?: string | null
          experience_required?: string | null
          id?: string
          location?: string
          posted_date?: string | null
          salary?: string | null
          skills_extracted?: string[] | null
          source?: string
          source_url?: string | null
          title?: string
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          experience_years: number | null
          full_name: string | null
          id: string
          location: string | null
          target_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          id?: string
          location?: string | null
          target_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          id?: string
          location?: string | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          id: string
          job_id: string
          match_score: number | null
          missing_skills: string[] | null
          reasoning: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          match_score?: number | null
          missing_skills?: string[] | null
          reasoning?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          match_score?: number | null
          missing_skills?: string[] | null
          reasoning?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          file_name: string | null
          file_url: string | null
          id: string
          is_default: boolean
          label: string | null
          parsed_data: Json | null
          raw_text: string | null
          storage_path: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          parsed_data?: Json | null
          raw_text?: string | null
          storage_path?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          parsed_data?: Json | null
          raw_text?: string | null
          storage_path?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      worker_tokens: {
        Row: {
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          prefix: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          last_used_at?: string | null
          prefix: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          prefix?: string
          revoked_at?: string | null
          token_hash?: string
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
      aa_status:
        | "pending"
        | "claimed"
        | "running"
        | "succeeded"
        | "failed"
        | "skipped"
        | "needs_human"
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
      aa_status: [
        "pending",
        "claimed",
        "running",
        "succeeded",
        "failed",
        "skipped",
        "needs_human",
      ],
    },
  },
} as const
