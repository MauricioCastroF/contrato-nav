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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      contratos_seccionales: {
        Row: {
          adicion_si_no: string | null
          ano: number
          contratista: string | null
          created_at: string
          critico: string | null
          detalle_modif: string | null
          duracion_contrato: string | null
          estado_del_contrato: string | null
          fecha_adicion: string | null
          fecha_de_inicio: string | null
          fecha_de_suscripcion: string | null
          fecha_modif: string | null
          fecha_terminacion: string | null
          id: string
          justificacion_adicion: string | null
          mes: number
          modalidad_de_contratacion: string | null
          modif_si_no: string | null
          n_contrato: string
          nombre_supervisor: string | null
          objeto_del_contrato: string | null
          observaciones: string | null
          seccional: string
          situacion: string | null
          tipo_de_contrato: string | null
          tipo_riesgo: string | null
          tipo_tramite: string | null
          updated_at: string
          url_proceso: string | null
          valor_adicion: number | null
          valor_del_contrato: number | null
          valor_pagado: number | null
          valor_pendiente_ejecucion: number | null
        }
        Insert: {
          adicion_si_no?: string | null
          ano: number
          contratista?: string | null
          created_at?: string
          critico?: string | null
          detalle_modif?: string | null
          duracion_contrato?: string | null
          estado_del_contrato?: string | null
          fecha_adicion?: string | null
          fecha_de_inicio?: string | null
          fecha_de_suscripcion?: string | null
          fecha_modif?: string | null
          fecha_terminacion?: string | null
          id?: string
          justificacion_adicion?: string | null
          mes: number
          modalidad_de_contratacion?: string | null
          modif_si_no?: string | null
          n_contrato: string
          nombre_supervisor?: string | null
          objeto_del_contrato?: string | null
          observaciones?: string | null
          seccional: string
          situacion?: string | null
          tipo_de_contrato?: string | null
          tipo_riesgo?: string | null
          tipo_tramite?: string | null
          updated_at?: string
          url_proceso?: string | null
          valor_adicion?: number | null
          valor_del_contrato?: number | null
          valor_pagado?: number | null
          valor_pendiente_ejecucion?: number | null
        }
        Update: {
          adicion_si_no?: string | null
          ano?: number
          contratista?: string | null
          created_at?: string
          critico?: string | null
          detalle_modif?: string | null
          duracion_contrato?: string | null
          estado_del_contrato?: string | null
          fecha_adicion?: string | null
          fecha_de_inicio?: string | null
          fecha_de_suscripcion?: string | null
          fecha_modif?: string | null
          fecha_terminacion?: string | null
          id?: string
          justificacion_adicion?: string | null
          mes?: number
          modalidad_de_contratacion?: string | null
          modif_si_no?: string | null
          n_contrato?: string
          nombre_supervisor?: string | null
          objeto_del_contrato?: string | null
          observaciones?: string | null
          seccional?: string
          situacion?: string | null
          tipo_de_contrato?: string | null
          tipo_riesgo?: string | null
          tipo_tramite?: string | null
          updated_at?: string
          url_proceso?: string | null
          valor_adicion?: number | null
          valor_del_contrato?: number | null
          valor_pagado?: number | null
          valor_pendiente_ejecucion?: number | null
        }
        Relationships: []
      }
      contratos_seguimiento: {
        Row: {
          adicion_si_no: string | null
          created_at: string
          critico: string | null
          detalle_modif: string | null
          fecha_adicion: string | null
          fecha_modif: string | null
          id: string
          id_contrato: string
          justificacion_adicion: string | null
          modif_si_no: string | null
          observaciones: string | null
          situacion: string | null
          tipo_riesgo: string | null
          tipo_tramite: string | null
          updated_at: string
          valor_adicion: number | null
        }
        Insert: {
          adicion_si_no?: string | null
          created_at?: string
          critico?: string | null
          detalle_modif?: string | null
          fecha_adicion?: string | null
          fecha_modif?: string | null
          id?: string
          id_contrato: string
          justificacion_adicion?: string | null
          modif_si_no?: string | null
          observaciones?: string | null
          situacion?: string | null
          tipo_riesgo?: string | null
          tipo_tramite?: string | null
          updated_at?: string
          valor_adicion?: number | null
        }
        Update: {
          adicion_si_no?: string | null
          created_at?: string
          critico?: string | null
          detalle_modif?: string | null
          fecha_adicion?: string | null
          fecha_modif?: string | null
          id?: string
          id_contrato?: string
          justificacion_adicion?: string | null
          modif_si_no?: string | null
          observaciones?: string | null
          situacion?: string | null
          tipo_riesgo?: string | null
          tipo_tramite?: string | null
          updated_at?: string
          valor_adicion?: number | null
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
