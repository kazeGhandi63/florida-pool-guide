export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bungalows: {
        Row: {
          id: string
          user_id: string
          name: string
          location: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          location?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          location?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bungalows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_reads: {
        Row: {
          id: string
          pool_id: string | null
          user_id: string
          read_date: string | null
          chlorine: number | null
          ph: number | null
          bromine: number | null
          temperature: number | null
          flow: number | null
          influent: number | null
          effluent: number | null
          scrubbed: boolean | null
          vacuumed: boolean | null
          drain_fill: boolean | null
          tiles: boolean | null
          decoin: boolean | null
          backwash: boolean | null
          work_order_1: string | null
          work_order_2: string | null
          work_order_3: string | null
          work_order_4: string | null
          work_order_temp: string | null
          work_order_flow: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pool_id?: string | null
          user_id: string
          read_date?: string | null
          chlorine?: number | null
          ph?: number | null
          bromine?: number | null
          temperature?: number | null
          flow?: number | null
          influent?: number | null
          effluent?: number | null
          scrubbed?: boolean | null
          vacuumed?: boolean | null
          drain_fill?: boolean | null
          tiles?: boolean | null
          decoin?: boolean | null
          backwash?: boolean | null
          work_order_1?: string | null
          work_order_2?: string | null
          work_order_3?: string | null
          work_order_4?: string | null
          work_order_temp?: string | null
          work_order_flow?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pool_id?: string | null
          user_id?: string
          read_date?: string | null
          chlorine?: number | null
          ph?: number | null
          bromine?: number | null
          temperature?: number | null
          flow?: number | null
          influent?: number | null
          effluent?: number | null
          scrubbed?: boolean | null
          vacuumed?: boolean | null
          drain_fill?: boolean | null
          tiles?: boolean | null
          decoin?: boolean | null
          backwash?: boolean | null
          work_order_1?: string | null
          work_order_2?: string | null
          work_order_3?: string | null
          work_order_4?: string | null
          work_order_temp?: string | null
          work_order_flow?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reads_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pools: {
        Row: {
          id: string
          resort_id: string | null
          name: string
          pool_type: string
          created_at: string | null
        }
        Insert: {
          id?: string
          resort_id?: string | null
          name: string
          pool_type: string
          created_at?: string | null
        }
        Update: {
          id?: string
          resort_id?: string | null
          name?: string
          pool_type?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pools_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          pool_attendant: string
          attendant_id: string
          created_at: string | null
        }
        Insert: {
          id: string
          pool_attendant: string
          attendant_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          pool_attendant?: string
          attendant_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      resorts: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }
      rolling_daily_reads: {
        Row: {
          id: string
          pool_id: string
          user_id: string
          week_number: number
          day_of_week: number
          chlorine: number | null
          ph: number | null
          bromine: number | null
          temperature: number | null
          flow: number | null
          influent: number | null
          effluent: number | null
          scrubbed: boolean | null
          vacuumed: boolean | null
          drain_fill: boolean | null
          tiles: boolean | null
          decoin: boolean | null
          backwash: boolean | null
          work_order_1: string | null
          work_order_2: string | null
          work_order_3: string | null
          work_order_4: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          pool_id: string
          user_id: string
          week_number: number
          day_of_week: number
          chlorine?: number | null
          ph?: number | null
          bromine?: number | null
          temperature?: number | null
          flow?: number | null
          influent?: number | null
          effluent?: number | null
          scrubbed?: boolean | null
          vacuumed?: boolean | null
          drain_fill?: boolean | null
          tiles?: boolean | null
          decoin?: boolean | null
          backwash?: boolean | null
          work_order_1?: string | null
          work_order_2?: string | null
          work_order_3?: string | null
          work_order_4?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          pool_id?: string
          user_id?: string
          week_number?: number
          day_of_week?: number
          chlorine?: number | null
          ph?: number | null
          bromine?: number | null
          temperature?: number | null
          flow?: number | null
          influent?: number | null
          effluent?: number | null
          scrubbed?: boolean | null
          vacuumed?: boolean | null
          drain_fill?: boolean | null
          tiles?: boolean | null
          decoin?: boolean | null
          backwash?: boolean | null
          work_order_1?: string | null
          work_order_2?: string | null
          work_order_3?: string | null
          work_order_4?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rolling_daily_reads_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rolling_daily_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      rolling_weekly_reads: {
        Row: {
          id: string
          pool_id: string
          user_id: string
          week_number: number
          tds: number | null
          alkalinity: number | null
          calcium_hardness: number | null
          saturation_index: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          pool_id: string
          user_id: string
          week_number: number
          tds?: number | null
          alkalinity?: number | null
          calcium_hardness?: number | null
          saturation_index?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          pool_id?: string
          user_id?: string
          week_number?: number
          tds?: number | null
          alkalinity?: number | null
          calcium_hardness?: number | null
          saturation_index?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rolling_weekly_reads_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rolling_weekly_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      treatments: {
        Row: {
          id: string
          bungalow_id: string
          user_id: string
          treatment_date: string | null
          alkalinity_reading: number | null
          calcium_reading: number | null
          alkalinity_treatment_cups: number | null
          calcium_treatment_cups: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          bungalow_id: string
          user_id: string
          treatment_date?: string | null
          alkalinity_reading?: number | null
          calcium_reading?: number | null
          alkalinity_treatment_cups?: number | null
          calcium_treatment_cups?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          bungalow_id?: string
          user_id?: string
          treatment_date?: string | null
          alkalinity_reading?: number | null
          calcium_reading?: number | null
          alkalinity_treatment_cups?: number | null
          calcium_treatment_cups?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_bungalow_id_fkey"
            columns: ["bungalow_id"]
            isOneToOne: false
            referencedRelation: "bungalows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      weekly_reads: {
        Row: {
          id: string
          pool_id: string | null
          user_id: string
          read_date: string | null
          tds: number | null
          alkalinity: number | null
          calcium_hardness: number | null
          saturation_index: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pool_id?: string | null
          user_id: string
          read_date?: string | null
          tds?: number | null
          alkalinity?: number | null
          calcium_hardness?: number | null
          saturation_index?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pool_id?: string | null
          user_id?: string
          read_date?: string | null
          tds?: number | null
          alkalinity?: number | null
          calcium_hardness?: number | null
          saturation_index?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reads_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: Record<PropertyKey, never>
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]