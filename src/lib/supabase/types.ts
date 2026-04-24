// ZOL MVP1 types — hand-written to match 0005_mvp1_schema.sql
// DO NOT auto-generate with db:types until the migration is applied.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Transcript message structure ─────────────────────────────────────────────
export interface TranscriptMessage {
  role: 'assistant' | 'user' | 'system'
  content: string
  timestamp?: string
}

// ─── Vehicle info structure ────────────────────────────────────────────────────
export interface VehicleInfo {
  make?: string
  model?: string
  year?: number
  plate?: string
  vin?: string
}

// ─── Business hours ────────────────────────────────────────────────────────────
export interface BusinessHours {
  mon?: { open: string; close: string }
  tue?: { open: string; close: string }
  wed?: { open: string; close: string }
  thu?: { open: string; close: string }
  fri?: { open: string; close: string }
  sat?: { open: string; close: string }
  sun?: { open: string; close: string }
}

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string
          phone_number: string | null
          vapi_phone_number: string | null
          vapi_phone_number_id: string | null
          vapi_assistant_id: string | null
          timezone: string
          ai_greeting: string | null
          ai_tone: string
          business_hours: Json | null
          human_redirect_number: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          phone_number?: string | null
          vapi_phone_number?: string | null
          vapi_phone_number_id?: string | null
          vapi_assistant_id?: string | null
          timezone?: string
          ai_greeting?: string | null
          ai_tone?: string
          business_hours?: Json | null
          human_redirect_number?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          phone_number?: string | null
          vapi_phone_number?: string | null
          vapi_phone_number_id?: string | null
          vapi_assistant_id?: string | null
          timezone?: string
          ai_greeting?: string | null
          ai_tone?: string
          business_hours?: Json | null
          human_redirect_number?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      integrations: {
        Row: {
          id: string
          workspace_id: string
          provider: string
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          metadata: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          provider: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          provider?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          metadata?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      calls: {
        Row: {
          id: string
          workspace_id: string
          vapi_call_id: string | null
          caller_phone: string | null
          caller_name: string | null
          caller_email: string | null
          vehicle_info: Json | null
          duration_seconds: number | null
          transcript: Json | null
          summary: string | null
          sentiment: string | null
          action_items: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          vapi_call_id?: string | null
          caller_phone?: string | null
          caller_name?: string | null
          caller_email?: string | null
          vehicle_info?: Json | null
          duration_seconds?: number | null
          transcript?: Json | null
          summary?: string | null
          sentiment?: string | null
          action_items?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          vapi_call_id?: string | null
          caller_phone?: string | null
          caller_name?: string | null
          caller_email?: string | null
          vehicle_info?: Json | null
          duration_seconds?: number | null
          transcript?: Json | null
          summary?: string | null
          sentiment?: string | null
          action_items?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      call_insights: {
        Row: {
          id: string
          call_id: string
          insight_type: string
          content: string
          urgency: string
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          insight_type: string
          content: string
          urgency?: string
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          insight_type?: string
          content?: string
          urgency?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_insights_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          }
        ]
      }
      appointments: {
        Row: {
          id: string
          workspace_id: string
          call_id: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          vehicle_info: Json | null
          service_type: string | null
          scheduled_at: string
          duration_minutes: number
          google_event_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          call_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          vehicle_info?: Json | null
          service_type?: string | null
          scheduled_at: string
          duration_minutes?: number
          google_event_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          call_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          vehicle_info?: Json | null
          service_type?: string | null
          scheduled_at?: string
          duration_minutes?: number
          google_event_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          }
        ]
      }
      emails: {
        Row: {
          id: string
          workspace_id: string
          call_id: string | null
          to_email: string
          subject: string
          body_html: string
          gmail_message_id: string | null
          status: string
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          call_id?: string | null
          to_email: string
          subject: string
          body_html: string
          gmail_message_id?: string | null
          status?: string
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          call_id?: string | null
          to_email?: string
          subject?: string
          body_html?: string
          gmail_message_id?: string | null
          status?: string
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      follow_ups: {
        Row: {
          id: string
          workspace_id: string
          call_id: string
          customer_phone: string | null
          customer_email: string | null
          follow_up_number: number
          scheduled_for: string
          sent_at: string | null
          email_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          call_id: string
          customer_phone?: string | null
          customer_email?: string | null
          follow_up_number?: number
          scheduled_for: string
          sent_at?: string | null
          email_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          call_id?: string
          customer_phone?: string | null
          customer_email?: string | null
          follow_up_number?: number
          scheduled_for?: string
          sent_at?: string | null
          email_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_runs: {
        Row: {
          id: string
          workspace_id: string
          user_prompt: string | null
          trigger_type: string
          trigger_ref: string | null
          status: string
          started_at: string | null
          finished_at: string | null
          total_tool_calls: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_prompt?: string | null
          trigger_type: string
          trigger_ref?: string | null
          status?: string
          started_at?: string | null
          finished_at?: string | null
          total_tool_calls?: number
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_prompt?: string | null
          trigger_type?: string
          trigger_ref?: string | null
          status?: string
          started_at?: string | null
          finished_at?: string | null
          total_tool_calls?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_steps: {
        Row: {
          id: string
          run_id: string
          step_number: number
          step_type: string
          tool_name: string | null
          tool_input: Json | null
          tool_output: Json | null
          duration_ms: number | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          step_number: number
          step_type: string
          tool_name?: string | null
          tool_input?: Json | null
          tool_output?: Json | null
          duration_ms?: number | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          step_number?: number
          step_type?: string
          tool_name?: string | null
          tool_input?: Json | null
          tool_output?: Json | null
          duration_ms?: number | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_owner: { Args: { p_workspace_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Convenience row types ────────────────────────────────────────────────────
export type Workspace    = Database['public']['Tables']['workspaces']['Row']
export type Integration  = Database['public']['Tables']['integrations']['Row']
export type Call         = Database['public']['Tables']['calls']['Row']
export type CallInsight  = Database['public']['Tables']['call_insights']['Row']
export type Appointment  = Database['public']['Tables']['appointments']['Row']
export type Email        = Database['public']['Tables']['emails']['Row']
export type FollowUp     = Database['public']['Tables']['follow_ups']['Row']
export type AgentRun     = Database['public']['Tables']['agent_runs']['Row']
export type AgentStep    = Database['public']['Tables']['agent_steps']['Row']
